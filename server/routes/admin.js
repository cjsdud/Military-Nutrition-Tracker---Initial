const express = require('express');
const { query } = require('../db');
const asyncRoute = require('../utils/asyncRoute');
const { ensureFoods, ensureUnits, generateMealsForUnit, monthDates } = require('../seedData');

const router = express.Router();

// 식품 + 실제 부대 일괄 시드 (idempotent, 비파괴적)
router.post('/seed', asyncRoute(async (_req, res) => {
  const foods = await ensureFoods(query);
  const units = await ensureUnits(query);
  res.json({ foods_added: foods, units_added: units });
}));

// 식단 자동 생성: 지정 부대(또는 전 부대)의 해당 월 식단을 채움.
// 이미 음식이 있는 끼니는 보존. 부대마다 다른 메뉴.
router.post('/generate-meals', asyncRoute(async (req, res) => {
  const { unit_id, year, month, all } = req.body || {};
  const now = new Date();
  const y = Number(year) || now.getFullYear();
  const m = Number(month) || now.getMonth() + 1;
  const dates = monthDates(y, m);

  await ensureFoods(query);

  let unitIds;
  if (all || !unit_id) {
    const { rows } = await query('SELECT id FROM units ORDER BY id');
    unitIds = rows.map((r) => r.id);
  } else {
    unitIds = [Number(unit_id)];
  }

  let total = 0;
  for (const uid of unitIds) {
    total += await generateMealsForUnit(query, uid, dates);
  }
  res.json({ period: `${y}-${String(m).padStart(2, '0')}`, units: unitIds.length, meal_foods_inserted: total });
}));

function nextMonth(y, m) {
  return m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
}

// Vercel Cron 전용: 매월 자동 식단 적재 (이번 달 + 다음 달, 전 부대).
// 식단표는 월 단위로 갱신되므로 매월 1일에 실행되도록 vercel.json crons에 등록.
router.get('/cron', asyncRoute(async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  await ensureFoods(query);
  await ensureUnits(query);
  const { rows } = await query('SELECT id FROM units ORDER BY id');
  const unitIds = rows.map((r) => r.id);

  const now = new Date();
  const cur = { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1 };
  const targets = [cur, nextMonth(cur.y, cur.m)];

  let total = 0;
  for (const t of targets) {
    const dates = monthDates(t.y, t.m);
    for (const uid of unitIds) total += await generateMealsForUnit(query, uid, dates);
  }
  res.json({
    ok: true,
    units: unitIds.length,
    months: targets.map((t) => `${t.y}-${String(t.m).padStart(2, '0')}`),
    meal_foods_inserted: total,
  });
}));

module.exports = router;
