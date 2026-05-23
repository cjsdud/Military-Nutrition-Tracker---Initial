const NUTRIENT_KEYS = [
  'calorie',
  'protein',
  'carbohydrate',
  'fat',
  'fiber',
  'sugar',
  'sodium',
  'cholesterol',
  'saturated_fat',
];

const MACRO_KEYS = ['calorie', 'protein', 'carbohydrate', 'fat'];

function emptyTotals(keys = MACRO_KEYS) {
  return Object.fromEntries(keys.map((k) => [k, 0]));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

// food row is per `serving_size` grams (default 100)
function scaleFood(food, quantity) {
  const base = Number(food.serving_size || 100);
  const factor = Number(quantity || 0) / base;
  const out = {};
  for (const k of NUTRIENT_KEYS) {
    if (food[k] != null) out[k] = round1(Number(food[k]) * factor);
  }
  return out;
}

function scaleCustom(log, quantity) {
  const factor = Number(quantity || 0) / 100;
  return {
    calorie: round1(Number(log.custom_calorie || 0) * factor),
    protein: round1(Number(log.custom_protein || 0) * factor),
    carbohydrate: round1(Number(log.custom_carbohydrate || 0) * factor),
    fat: round1(Number(log.custom_fat || 0) * factor),
  };
}

function addTotals(target, source) {
  for (const k of Object.keys(source)) {
    target[k] = round1((target[k] || 0) + (source[k] || 0));
  }
  return target;
}

function sumNutrients(items, keys = MACRO_KEYS) {
  const totals = emptyTotals(keys);
  for (const it of items) addTotals(totals, it);
  return totals;
}

// 영양소 객체 전체에 배율을 곱함 (끼니별 섭취량 조절용: 0/0.5/1/1.5 등)
function scaleBy(nutrition, factor) {
  const out = {};
  for (const k of Object.keys(nutrition)) out[k] = round1(Number(nutrition[k] || 0) * factor);
  return out;
}

module.exports = {
  NUTRIENT_KEYS,
  MACRO_KEYS,
  emptyTotals,
  scaleFood,
  scaleCustom,
  addTotals,
  sumNutrients,
  scaleBy,
  round1,
};
