const express = require('express');
const { query, withTransaction } = require('../db');
const asyncRoute = require('../utils/asyncRoute');
const { scaleFood, scaleCustom } = require('../utils/nutrition');

const router = express.Router();

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'late_night'];

function logRowToView(r) {
  const isCustom = r.food_id == null;
  const nutrition = isCustom
    ? scaleCustom(r, r.quantity)
    : scaleFood(
        {
          calorie: r.food_calorie,
          protein: r.food_protein,
          carbohydrate: r.food_carbohydrate,
          fat: r.food_fat,
          fiber: r.food_fiber,
          sugar: r.food_sugar,
          sodium: r.food_sodium,
          cholesterol: r.food_cholesterol,
          saturated_fat: r.food_saturated_fat,
          serving_size: r.food_serving_size,
        },
        r.quantity
      );
  return {
    id: r.id,
    soldier_id: r.soldier_id,
    food_id: r.food_id,
    food_name: isCustom ? r.custom_name : r.food_name,
    is_custom: isCustom,
    quantity: r.quantity,
    meal_type: r.meal_type,
    memo: r.memo,
    log_date: r.log_date,
    logged_at: r.logged_at,
    nutrition,
  };
}

const SELECT_LOG_SQL = `
  SELECT sl.*,
         f.name AS food_name,
         f.calorie AS food_calorie,
         f.protein AS food_protein,
         f.carbohydrate AS food_carbohydrate,
         f.fat AS food_fat,
         f.fiber AS food_fiber,
         f.sugar AS food_sugar,
         f.sodium AS food_sodium,
         f.cholesterol AS food_cholesterol,
         f.saturated_fat AS food_saturated_fat,
         f.serving_size AS food_serving_size
  FROM soldier_logs sl
  LEFT JOIN foods f ON f.id = sl.food_id
`;

router.post('/', asyncRoute(async (req, res) => {
  const {
    soldier_id, food_id, quantity, log_date,
    custom_name, custom_calorie, custom_protein, custom_carbohydrate, custom_fat,
    meal_type, memo,
  } = req.body || {};

  if (!soldier_id || !log_date) {
    return res.status(400).json({ error: 'soldier_id, log_date 필수' });
  }
  if (!food_id && !custom_name) {
    return res.status(400).json({ error: 'food_id 또는 custom_name 중 하나 필수' });
  }
  if (meal_type && !MEAL_TYPES.includes(meal_type)) {
    return res.status(400).json({ error: `meal_type은 ${MEAL_TYPES.join(', ')} 중 하나` });
  }

  const { rows } = await query(
    `INSERT INTO soldier_logs
       (soldier_id, food_id, quantity, log_date, custom_name, custom_calorie,
        custom_protein, custom_carbohydrate, custom_fat, meal_type, memo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      soldier_id, food_id || null, quantity || 100, log_date,
      custom_name || null, custom_calorie || null,
      custom_protein || null, custom_carbohydrate || null, custom_fat || null,
      meal_type || 'snack', memo || null,
    ]
  );
  const { rows: full } = await query(`${SELECT_LOG_SQL} WHERE sl.id = $1`, [rows[0].id]);
  res.status(201).json(logRowToView(full[0]));
}));

router.get('/:soldier_id/:date', asyncRoute(async (req, res) => {
  const { rows } = await query(
    `${SELECT_LOG_SQL} WHERE sl.soldier_id = $1 AND sl.log_date = $2 ORDER BY sl.logged_at`,
    [req.params.soldier_id, req.params.date]
  );
  res.json(rows.map(logRowToView));
}));

router.delete('/:log_id', asyncRoute(async (req, res) => {
  const { rowCount } = await query('DELETE FROM soldier_logs WHERE id = $1', [req.params.log_id]);
  if (!rowCount) return res.status(404).json({ error: '로그를 찾을 수 없습니다' });
  res.json({ deleted: true });
}));

// 어제 먹은 음식 그대로 오늘로 복사 - "다시 먹기" UX
router.post('/duplicate', asyncRoute(async (req, res) => {
  const { soldier_id, from_date, to_date } = req.body || {};
  if (!soldier_id || !from_date || !to_date) {
    return res.status(400).json({ error: 'soldier_id, from_date, to_date 필수' });
  }
  const copied = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM soldier_logs WHERE soldier_id = $1 AND log_date = $2`,
      [soldier_id, from_date]
    );
    for (const r of rows) {
      await client.query(
        `INSERT INTO soldier_logs
          (soldier_id, food_id, quantity, log_date, custom_name, custom_calorie,
           custom_protein, custom_carbohydrate, custom_fat, meal_type, memo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          r.soldier_id, r.food_id, r.quantity, to_date, r.custom_name, r.custom_calorie,
          r.custom_protein, r.custom_carbohydrate, r.custom_fat, r.meal_type, r.memo,
        ]
      );
    }
    return rows.length;
  });
  res.json({ copied });
}));

// 부대 식단 끼니별 섭취량 조절 (안 먹음=0, 적게=0.5, 보통=1, 많이=1.5)
// portion === 1(보통)이면 override를 삭제(기본값으로 복귀)
router.post('/portion', asyncRoute(async (req, res) => {
  const { soldier_id, log_date, meal_type, portion, reason } = req.body || {};
  if (!soldier_id || !log_date || !meal_type || portion == null) {
    return res.status(400).json({ error: 'soldier_id, log_date, meal_type, portion 필수' });
  }
  const p = Number(portion);
  if (!Number.isFinite(p) || p < 0 || p > 3) {
    return res.status(400).json({ error: 'portion은 0~3 사이 숫자' });
  }
  if (p === 1) {
    await query(
      'DELETE FROM soldier_meal_skips WHERE soldier_id = $1 AND skip_date = $2 AND meal_type = $3',
      [soldier_id, log_date, meal_type]
    );
    return res.json({ meal_type, portion: 1 });
  }
  const { rows } = await query(
    `INSERT INTO soldier_meal_skips (soldier_id, skip_date, meal_type, portion, reason)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (soldier_id, skip_date, meal_type)
     DO UPDATE SET portion = EXCLUDED.portion, reason = EXCLUDED.reason
     RETURNING meal_type, portion`,
    [soldier_id, log_date, meal_type, p, reason || null]
  );
  res.status(201).json(rows[0]);
}));

router.get('/portion/:soldier_id/:date', asyncRoute(async (req, res) => {
  const { rows } = await query(
    'SELECT meal_type, portion FROM soldier_meal_skips WHERE soldier_id = $1 AND skip_date = $2',
    [req.params.soldier_id, req.params.date]
  );
  res.json(rows.map((r) => ({ meal_type: r.meal_type, portion: Number(r.portion) })));
}));

module.exports = router;
