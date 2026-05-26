const express = require('express');
const { query } = require('../db');
const asyncRoute = require('../utils/asyncRoute');
const {
  scaleFood, scaleCustom, sumNutrients, emptyTotals, addTotals, scaleBy,
  NUTRIENT_KEYS, MACRO_KEYS, round1,
} = require('../utils/nutrition');

const UNIT_MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

const router = express.Router();

function monthRange(year, month) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { start: fmt(start), end: fmt(end) };
}

async function unitDailyTotals(unit_id, startDate, endDate) {
  const { rows } = await query(
    `SELECT m.meal_date, m.meal_type, mf.quantity,
            f.calorie, f.protein, f.carbohydrate, f.fat, f.fiber, f.sugar,
            f.sodium, f.cholesterol, f.saturated_fat, f.serving_size
     FROM meals m
     LEFT JOIN meal_foods mf ON mf.meal_id = m.id
     LEFT JOIN foods f ON f.id = mf.food_id
     WHERE m.unit_id = $1 AND m.meal_date >= $2 AND m.meal_date < $3`,
    [unit_id, startDate, endDate]
  );

  const byDate = new Map();
  for (const r of rows) {
    const key = r.meal_date.toISOString().slice(0, 10);
    if (!byDate.has(key)) {
      byDate.set(key, {
        date: key,
        totals: emptyTotals(NUTRIENT_KEYS),
        by_meal: { breakfast: emptyTotals(MACRO_KEYS), lunch: emptyTotals(MACRO_KEYS), dinner: emptyTotals(MACRO_KEYS) },
        meal_types: new Set(),
      });
    }
    const entry = byDate.get(key);
    entry.meal_types.add(r.meal_type);
    if (r.calorie != null) {
      const scaled = scaleFood(r, r.quantity);
      addTotals(entry.totals, scaled);
      addTotals(entry.by_meal[r.meal_type], scaled);
    }
  }
  return Array.from(byDate.values())
    .map((e) => ({ ...e, meal_count: e.meal_types.size, meal_types: undefined }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

router.get('/unit-stats/:unit_id/:year/:month', asyncRoute(async (req, res) => {
  const { unit_id, year, month } = req.params;
  const { start, end } = monthRange(year, month);
  const daily = await unitDailyTotals(unit_id, start, end);
  res.json(daily);
}));

router.get('/units/:unit_id/report/:year/:month', asyncRoute(async (req, res) => {
  const { unit_id, year, month } = req.params;
  const { start, end } = monthRange(year, month);
  const { rows: unitRows } = await query('SELECT * FROM units WHERE id = $1', [unit_id]);
  if (!unitRows[0]) return res.status(404).json({ error: '부대를 찾을 수 없습니다' });

  const daily = await unitDailyTotals(unit_id, start, end);
  const period = `${year}-${String(month).padStart(2, '0')}`;
  const monthly_average = emptyTotals(MACRO_KEYS);
  if (daily.length) {
    for (const d of daily) for (const k of MACRO_KEYS) monthly_average[k] += d.totals[k] || 0;
    for (const k of MACRO_KEYS) monthly_average[k] = round1(monthly_average[k] / daily.length);
  }
  const meals_count = daily.reduce((a, d) => a + d.meal_count, 0);

  res.json({
    unit_name: unitRows[0].name,
    period,
    days_with_meals: daily.length,
    monthly_average,
    meals_count,
    stats: daily.map((d) => ({ date: d.date, ...d.totals, by_meal: d.by_meal, meal_count: d.meal_count })),
  });
}));

// 병사 하루 통합 통계: 부대식단(빠진 끼니 제외) + 개인 로그
router.get('/soldier-stats/:soldier_id/:date', asyncRoute(async (req, res) => {
  const { soldier_id, date } = req.params;
  const { rows: soldierRows } = await query('SELECT * FROM soldiers WHERE id = $1', [soldier_id]);
  if (!soldierRows[0]) return res.status(404).json({ error: '병사를 찾을 수 없습니다' });
  const soldier = soldierRows[0];

  const { rows: portionRows } = await query(
    'SELECT meal_type, portion FROM soldier_meal_skips WHERE soldier_id = $1 AND skip_date = $2',
    [soldier_id, date]
  );
  const portionMap = new Map(portionRows.map((r) => [r.meal_type, Number(r.portion)]));
  const meal_portions = Object.fromEntries(
    UNIT_MEAL_TYPES.map((t) => [t, portionMap.has(t) ? portionMap.get(t) : 1])
  );

  const { rows: mealRows } = await query(
    `SELECT m.meal_type, mf.quantity,
            f.calorie, f.protein, f.carbohydrate, f.fat, f.fiber, f.sugar,
            f.sodium, f.cholesterol, f.saturated_fat, f.serving_size
     FROM meals m
     LEFT JOIN meal_foods mf ON mf.meal_id = m.id
     LEFT JOIN foods f ON f.id = mf.food_id
     WHERE m.unit_id = $1 AND m.meal_date = $2`,
    [soldier.unit_id, date]
  );
  const unit_meals = emptyTotals(MACRO_KEYS);
  const unit_by_meal = { breakfast: emptyTotals(MACRO_KEYS), lunch: emptyTotals(MACRO_KEYS), dinner: emptyTotals(MACRO_KEYS) };
  for (const r of mealRows) {
    const factor = portionMap.has(r.meal_type) ? portionMap.get(r.meal_type) : 1;
    if (factor === 0 || r.calorie == null) continue;
    const scaled = scaleBy(scaleFood(r, r.quantity), factor);
    addTotals(unit_meals, scaled);
    if (unit_by_meal[r.meal_type]) addTotals(unit_by_meal[r.meal_type], scaled);
  }

  const { rows: logRows } = await query(
    `SELECT sl.*, f.calorie AS food_calorie, f.protein AS food_protein,
            f.carbohydrate AS food_carbohydrate, f.fat AS food_fat, f.serving_size AS food_serving_size
     FROM soldier_logs sl
     LEFT JOIN foods f ON f.id = sl.food_id
     WHERE sl.soldier_id = $1 AND sl.log_date = $2`,
    [soldier_id, date]
  );
  const additional_logs = emptyTotals(MACRO_KEYS);
  for (const r of logRows) {
    const n = r.food_id
      ? scaleFood({
          calorie: r.food_calorie, protein: r.food_protein,
          carbohydrate: r.food_carbohydrate, fat: r.food_fat,
          serving_size: r.food_serving_size,
        }, r.quantity)
      : scaleCustom(r, r.quantity);
    addTotals(additional_logs, n);
  }

  const totals = emptyTotals(MACRO_KEYS);
  for (const k of MACRO_KEYS) totals[k] = round1((unit_meals[k] || 0) + (additional_logs[k] || 0));

  const goals = {
    calorie: soldier.daily_calorie_goal,
    protein: soldier.daily_protein_goal,
    carbohydrate: soldier.daily_carb_goal,
    fat: soldier.daily_fat_goal,
  };
  const progress = {};
  for (const k of MACRO_KEYS) {
    if (goals[k]) progress[k] = round1((totals[k] / Number(goals[k])) * 100);
  }

  res.json({
    date,
    soldier: { id: soldier.id, name: soldier.name, rank: soldier.rank },
    meal_portions,
    unit_meals,
    unit_by_meal,
    additional_logs,
    totals,
    goals,
    progress_percent: progress,
  });
}));

// 병사 기간 일별 집계 (부대식단 배율 적용 + 개인 로그). [start, end)
async function soldierDaysInRange(soldier, start, end) {
  const { rows: portionRows } = await query(
    'SELECT skip_date, meal_type, portion FROM soldier_meal_skips WHERE soldier_id = $1 AND skip_date >= $2 AND skip_date < $3',
    [soldier.id, start, end]
  );
  const portionMap = new Map();
  for (const r of portionRows) {
    const k = r.skip_date.toISOString().slice(0, 10);
    if (!portionMap.has(k)) portionMap.set(k, new Map());
    portionMap.get(k).set(r.meal_type, Number(r.portion));
  }

  const { rows: mealRows } = await query(
    `SELECT m.meal_date, m.meal_type, mf.quantity,
            f.calorie, f.protein, f.carbohydrate, f.fat, f.serving_size
     FROM meals m
     LEFT JOIN meal_foods mf ON mf.meal_id = m.id
     LEFT JOIN foods f ON f.id = mf.food_id
     WHERE m.unit_id = $1 AND m.meal_date >= $2 AND m.meal_date < $3`,
    [soldier.unit_id, start, end]
  );
  const dayMap = new Map();
  const ensure = (d) => {
    if (!dayMap.has(d)) dayMap.set(d, { date: d, unit_total: emptyTotals(MACRO_KEYS), additional_total: emptyTotals(MACRO_KEYS) });
    return dayMap.get(d);
  };
  for (const r of mealRows) {
    const d = r.meal_date.toISOString().slice(0, 10);
    const factor = portionMap.get(d)?.has(r.meal_type) ? portionMap.get(d).get(r.meal_type) : 1;
    if (factor === 0 || r.calorie == null) continue;
    addTotals(ensure(d).unit_total, scaleBy(scaleFood(r, r.quantity), factor));
  }

  const { rows: logRows } = await query(
    `SELECT sl.log_date, sl.quantity, sl.food_id, sl.custom_calorie, sl.custom_protein,
            sl.custom_carbohydrate, sl.custom_fat,
            f.calorie AS food_calorie, f.protein AS food_protein,
            f.carbohydrate AS food_carbohydrate, f.fat AS food_fat, f.serving_size AS food_serving_size
     FROM soldier_logs sl
     LEFT JOIN foods f ON f.id = sl.food_id
     WHERE sl.soldier_id = $1 AND sl.log_date >= $2 AND sl.log_date < $3`,
    [soldier.id, start, end]
  );
  for (const r of logRows) {
    const d = r.log_date.toISOString().slice(0, 10);
    const n = r.food_id
      ? scaleFood({ calorie: r.food_calorie, protein: r.food_protein, carbohydrate: r.food_carbohydrate, fat: r.food_fat, serving_size: r.food_serving_size }, r.quantity)
      : scaleCustom(r, r.quantity);
    addTotals(ensure(d).additional_total, n);
  }

  return Array.from(dayMap.values())
    .map((d) => {
      const total = emptyTotals(MACRO_KEYS);
      for (const k of MACRO_KEYS) total[k] = round1((d.unit_total[k] || 0) + (d.additional_total[k] || 0));
      return { ...d, ...total };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

function averageDays(days) {
  const avg = emptyTotals(MACRO_KEYS);
  if (days.length) {
    for (const d of days) for (const k of MACRO_KEYS) avg[k] += d[k] || 0;
    for (const k of MACRO_KEYS) avg[k] = round1(avg[k] / days.length);
  }
  return avg;
}

function soldierGoals(s) {
  return { calorie: s.daily_calorie_goal, protein: s.daily_protein_goal, carbohydrate: s.daily_carb_goal, fat: s.daily_fat_goal };
}

function nextDayISO(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// 병사 월간: 일별 추이
router.get('/soldier-stats/:soldier_id/:year/:month', asyncRoute(async (req, res) => {
  const { soldier_id, year, month } = req.params;
  const { start, end } = monthRange(year, month);
  const { rows: soldierRows } = await query('SELECT * FROM soldiers WHERE id = $1', [soldier_id]);
  if (!soldierRows[0]) return res.status(404).json({ error: '병사를 찾을 수 없습니다' });
  const soldier = soldierRows[0];
  const days = await soldierDaysInRange(soldier, start, end);
  res.json({
    soldier: { id: soldier.id, name: soldier.name, rank: soldier.rank },
    period: `${year}-${String(month).padStart(2, '0')}`,
    days,
    monthly_average: averageDays(days),
    goals: soldierGoals(soldier),
  });
}));

// 병사 기간 통계: 임의 날짜 범위 (일/주/월별 집계는 클라이언트에서 수행)
router.get('/soldier-range-stats/:soldier_id/:from/:to', asyncRoute(async (req, res) => {
  const { soldier_id, from, to } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'from, to는 YYYY-MM-DD 형식' });
  }
  const { rows: soldierRows } = await query('SELECT * FROM soldiers WHERE id = $1', [soldier_id]);
  if (!soldierRows[0]) return res.status(404).json({ error: '병사를 찾을 수 없습니다' });
  const soldier = soldierRows[0];
  const days = await soldierDaysInRange(soldier, from, nextDayISO(to));
  res.json({
    soldier: { id: soldier.id, name: soldier.name, rank: soldier.rank },
    from, to,
    days,
    average: averageDays(days),
    goals: soldierGoals(soldier),
  });
}));

// 부대 식단 작성 현황 (어느 날짜에 끼니가 비어있는지) - 영양사 UX
router.get('/unit-coverage/:unit_id/:year/:month', asyncRoute(async (req, res) => {
  const { unit_id, year, month } = req.params;
  const { start, end } = monthRange(year, month);
  const { rows } = await query(
    `SELECT meal_date, ARRAY_AGG(meal_type ORDER BY meal_type) AS filled
     FROM meals
     WHERE unit_id = $1 AND meal_date >= $2 AND meal_date < $3
     GROUP BY meal_date
     ORDER BY meal_date`,
    [unit_id, start, end]
  );
  const filled = new Map(rows.map((r) => [r.meal_date.toISOString().slice(0, 10), r.filled]));
  const days = [];
  const last = new Date(end);
  for (let d = new Date(start); d < last; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const fills = filled.get(key) || [];
    days.push({
      date: key,
      filled: fills,
      missing: ['breakfast', 'lunch', 'dinner'].filter((t) => !fills.includes(t)),
      complete: fills.length === 3,
    });
  }
  res.json({ period: `${year}-${String(month).padStart(2, '0')}`, days });
}));

module.exports = router;
