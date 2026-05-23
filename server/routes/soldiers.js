const express = require('express');
const { query } = require('../db');
const asyncRoute = require('../utils/asyncRoute');

const router = express.Router();

const SOLDIER_FIELDS = [
  'unit_id', 'name', 'rank',
  'daily_calorie_goal', 'daily_protein_goal', 'daily_carb_goal', 'daily_fat_goal',
  'goal_type', 'sex', 'age', 'height_cm', 'weight_kg', 'activity_level',
];

function pickSoldier(body) {
  const out = {};
  for (const k of SOLDIER_FIELDS) if (body[k] !== undefined) out[k] = body[k];
  return out;
}

router.post('/', asyncRoute(async (req, res) => {
  const data = pickSoldier(req.body || {});
  if (!data.unit_id || !data.name) {
    return res.status(400).json({ error: 'unit_id, name 필수' });
  }
  const cols = Object.keys(data);
  const params = cols.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO soldiers (${cols.join(', ')}) VALUES (${params}) RETURNING *`,
    cols.map((c) => data[c])
  );
  res.status(201).json(rows[0]);
}));

router.get('/', asyncRoute(async (req, res) => {
  const { unit_id } = req.query;
  const params = [];
  let where = '';
  if (unit_id) { params.push(unit_id); where = 'WHERE unit_id = $1'; }
  const { rows } = await query(`SELECT * FROM soldiers ${where} ORDER BY name`, params);
  res.json(rows);
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM soldiers WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: '병사를 찾을 수 없습니다' });
  res.json(rows[0]);
}));

router.put('/:id', asyncRoute(async (req, res) => {
  const data = pickSoldier(req.body || {});
  const cols = Object.keys(data);
  if (!cols.length) return res.status(400).json({ error: '수정할 필드가 없습니다' });
  const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const { rows } = await query(
    `UPDATE soldiers SET ${sets} WHERE id = $${cols.length + 1} RETURNING *`,
    [...cols.map((c) => data[c]), req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: '병사를 찾을 수 없습니다' });
  res.json(rows[0]);
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const { rowCount } = await query('DELETE FROM soldiers WHERE id = $1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: '병사를 찾을 수 없습니다' });
  res.json({ deleted: true });
}));

// 즐겨찾기
router.get('/:id/favorites', asyncRoute(async (req, res) => {
  const { rows } = await query(
    `SELECT sf.id, sf.default_quantity, f.*
     FROM soldier_favorites sf
     JOIN foods f ON f.id = sf.food_id
     WHERE sf.soldier_id = $1
     ORDER BY sf.created_at DESC`,
    [req.params.id]
  );
  res.json(rows);
}));

router.post('/:id/favorites', asyncRoute(async (req, res) => {
  const { food_id, default_quantity } = req.body || {};
  if (!food_id) return res.status(400).json({ error: 'food_id 필수' });
  const { rows } = await query(
    `INSERT INTO soldier_favorites (soldier_id, food_id, default_quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (soldier_id, food_id)
     DO UPDATE SET default_quantity = EXCLUDED.default_quantity
     RETURNING *`,
    [req.params.id, food_id, default_quantity || 100]
  );
  res.status(201).json(rows[0]);
}));

router.delete('/:id/favorites/:food_id', asyncRoute(async (req, res) => {
  const { rowCount } = await query(
    'DELETE FROM soldier_favorites WHERE soldier_id = $1 AND food_id = $2',
    [req.params.id, req.params.food_id]
  );
  if (!rowCount) return res.status(404).json({ error: '즐겨찾기를 찾을 수 없습니다' });
  res.json({ deleted: true });
}));

// 자주 먹은 음식 Top N (최근 30일 기준)
router.get('/:id/frequent-foods', asyncRoute(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const { rows } = await query(
    `SELECT f.id, f.name, COUNT(*) AS log_count, ROUND(AVG(sl.quantity)) AS avg_quantity
     FROM soldier_logs sl
     JOIN foods f ON f.id = sl.food_id
     WHERE sl.soldier_id = $1
       AND sl.log_date >= CURRENT_DATE - INTERVAL '30 days'
     GROUP BY f.id, f.name
     ORDER BY log_count DESC, MAX(sl.logged_at) DESC
     LIMIT $2`,
    [req.params.id, limit]
  );
  res.json(rows);
}));

module.exports = router;
