const express = require('express');
const { query, withTransaction } = require('../db');
const asyncRoute = require('../utils/asyncRoute');
const { scaleFood, sumNutrients, emptyTotals, addTotals, NUTRIENT_KEYS } = require('../utils/nutrition');

const router = express.Router();

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

async function loadMealWithFoods(meal_id, client = null) {
  const exec = client ? client.query.bind(client) : query;
  const { rows } = await exec(
    `SELECT mf.id AS meal_food_id, mf.quantity, f.*
     FROM meal_foods mf
     JOIN foods f ON f.id = mf.food_id
     WHERE mf.meal_id = $1
     ORDER BY mf.id`,
    [meal_id]
  );
  const foods = rows.map((r) => {
    const scaled = scaleFood(r, r.quantity);
    return {
      meal_food_id: r.meal_food_id,
      food_id: r.id,
      name: r.name,
      quantity: r.quantity,
      nutrition: scaled,
    };
  });
  const totals = sumNutrients(foods.map((f) => f.nutrition), NUTRIENT_KEYS);
  return { foods, totals };
}

async function upsertMealFoods(client, meal_id, foods_data) {
  await client.query('DELETE FROM meal_foods WHERE meal_id = $1', [meal_id]);
  for (const item of foods_data || []) {
    if (!item.food_id) continue;
    await client.query(
      'INSERT INTO meal_foods (meal_id, food_id, quantity) VALUES ($1, $2, $3)',
      [meal_id, item.food_id, item.quantity || 100]
    );
  }
}

router.post('/', asyncRoute(async (req, res) => {
  const { unit_id, meal_date, meal_type, foods_data } = req.body || {};
  if (!unit_id || !meal_date || !meal_type) {
    return res.status(400).json({ error: 'unit_id, meal_date, meal_type 필수' });
  }
  if (!MEAL_TYPES.includes(meal_type)) {
    return res.status(400).json({ error: `meal_type은 ${MEAL_TYPES.join(', ')} 중 하나` });
  }

  const meal = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO meals (unit_id, meal_date, meal_type) VALUES ($1, $2, $3)
       ON CONFLICT (unit_id, meal_date, meal_type)
       DO UPDATE SET meal_date = EXCLUDED.meal_date
       RETURNING *`,
      [unit_id, meal_date, meal_type]
    );
    await upsertMealFoods(client, rows[0].id, foods_data);
    return rows[0];
  });

  const detail = await loadMealWithFoods(meal.id);
  res.status(201).json({ ...meal, ...detail });
}));

router.get('/:unit_id/:date', asyncRoute(async (req, res) => {
  const { unit_id, date } = req.params;
  const { rows } = await query(
    'SELECT * FROM meals WHERE unit_id = $1 AND meal_date = $2',
    [unit_id, date]
  );
  const out = { breakfast: null, lunch: null, dinner: null, daily_total: emptyTotals(NUTRIENT_KEYS) };
  for (const m of rows) {
    const detail = await loadMealWithFoods(m.id);
    out[m.meal_type] = { meal_id: m.id, ...detail };
    addTotals(out.daily_total, detail.totals);
  }
  res.json(out);
}));

router.put('/:meal_id', asyncRoute(async (req, res) => {
  const { meal_id } = req.params;
  const { foods_data } = req.body || {};
  await withTransaction(async (client) => {
    const { rowCount } = await client.query('SELECT 1 FROM meals WHERE id = $1', [meal_id]);
    if (!rowCount) {
      const err = new Error('식단을 찾을 수 없습니다');
      err.status = 404;
      throw err;
    }
    await upsertMealFoods(client, meal_id, foods_data);
  });
  const detail = await loadMealWithFoods(meal_id);
  res.json({ id: Number(meal_id), ...detail });
}));

router.delete('/:meal_id', asyncRoute(async (req, res) => {
  const { rowCount } = await query('DELETE FROM meals WHERE id = $1', [req.params.meal_id]);
  if (!rowCount) return res.status(404).json({ error: '식단을 찾을 수 없습니다' });
  res.json({ deleted: true });
}));

// 전날(혹은 지정 날짜) 식단을 다른 날짜로 복사 - 영양사 UX
router.post('/copy', asyncRoute(async (req, res) => {
  const { unit_id, from_date, to_date, meal_types } = req.body || {};
  if (!unit_id || !from_date || !to_date) {
    return res.status(400).json({ error: 'unit_id, from_date, to_date 필수' });
  }
  const types = Array.isArray(meal_types) && meal_types.length ? meal_types : MEAL_TYPES;

  const copied = [];
  await withTransaction(async (client) => {
    const { rows: srcMeals } = await client.query(
      `SELECT * FROM meals WHERE unit_id = $1 AND meal_date = $2 AND meal_type = ANY($3)`,
      [unit_id, from_date, types]
    );
    for (const src of srcMeals) {
      const { rows: dstRows } = await client.query(
        `INSERT INTO meals (unit_id, meal_date, meal_type) VALUES ($1, $2, $3)
         ON CONFLICT (unit_id, meal_date, meal_type) DO UPDATE SET meal_date = EXCLUDED.meal_date
         RETURNING id`,
        [unit_id, to_date, src.meal_type]
      );
      const dstId = dstRows[0].id;
      await client.query('DELETE FROM meal_foods WHERE meal_id = $1', [dstId]);
      await client.query(
        `INSERT INTO meal_foods (meal_id, food_id, quantity)
         SELECT $1, food_id, quantity FROM meal_foods WHERE meal_id = $2`,
        [dstId, src.id]
      );
      copied.push({ meal_type: src.meal_type, meal_id: dstId });
    }
  });
  res.json({ copied: copied.length, meals: copied });
}));

module.exports = router;
