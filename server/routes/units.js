const express = require('express');
const { query } = require('../db');
const asyncRoute = require('../utils/asyncRoute');

const router = express.Router();

router.post('/', asyncRoute(async (req, res) => {
  const { name, code } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name 필수' });
  const { rows } = await query(
    'INSERT INTO units (name, code) VALUES ($1, $2) RETURNING *',
    [name, code || null]
  );
  res.status(201).json(rows[0]);
}));

router.get('/', asyncRoute(async (_req, res) => {
  const { rows } = await query('SELECT * FROM units ORDER BY id');
  res.json(rows);
}));

router.get('/:id', asyncRoute(async (req, res) => {
  const { rows } = await query('SELECT * FROM units WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: '부대를 찾을 수 없습니다' });
  res.json(rows[0]);
}));

module.exports = router;
