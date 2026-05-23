const express = require('express');
const { query, withTransaction } = require('../db');
const asyncRoute = require('../utils/asyncRoute');
const { NUTRIENT_KEYS } = require('../utils/nutrition');

const router = express.Router();

const FOOD_COLUMNS = ['name', ...NUTRIENT_KEYS, 'serving_size', 'source', 'created_by_soldier_id'];

function pickFoodFields(body) {
  const out = {};
  for (const k of FOOD_COLUMNS) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

router.post('/', asyncRoute(async (req, res) => {
  const data = pickFoodFields(req.body || {});
  if (!data.name) return res.status(400).json({ error: 'name 필수' });
  const cols = Object.keys(data);
  const vals = cols.map((c) => data[c]);
  const params = cols.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO foods (${cols.join(', ')}) VALUES (${params})
     ON CONFLICT (name) DO UPDATE SET ${cols.filter((c) => c !== 'name').map((c, i) => `${c} = EXCLUDED.${c}`).join(', ')}
     RETURNING *`,
    vals
  );
  res.status(201).json(rows[0]);
}));

router.get('/', asyncRoute(async (_req, res) => {
  const { rows } = await query('SELECT * FROM foods ORDER BY name');
  res.json(rows);
}));

router.get('/search', asyncRoute(async (req, res) => {
  const q = (req.query.q || '').toString().trim();
  if (!q) return res.json([]);
  const { rows } = await query(
    `SELECT * FROM foods WHERE name ILIKE $1 ORDER BY
       CASE WHEN name = $2 THEN 0
            WHEN name ILIKE $3 THEN 1
            ELSE 2 END,
       name
     LIMIT 20`,
    [`%${q}%`, q, `${q}%`]
  );
  res.json(rows);
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM foods WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: '식재료를 찾을 수 없습니다' });
  res.json(rows[0]);
}));

router.post('/bulk', asyncRoute(async (req, res) => {
  const foods = Array.isArray(req.body?.foods) ? req.body.foods : [];
  if (!foods.length) return res.status(400).json({ error: 'foods 배열이 비어있습니다' });
  let imported = 0;
  let skipped = 0;
  await withTransaction(async (client) => {
    for (const f of foods) {
      const data = pickFoodFields(f);
      if (!data.name) { skipped++; continue; }
      const cols = Object.keys(data);
      const params = cols.map((_, i) => `$${i + 1}`).join(', ');
      const result = await client.query(
        `INSERT INTO foods (${cols.join(', ')}) VALUES (${params})
         ON CONFLICT (name) DO NOTHING RETURNING id`,
        cols.map((c) => data[c])
      );
      if (result.rowCount) imported++; else skipped++;
    }
  });
  res.json({ imported, skipped });
}));

module.exports = router;
