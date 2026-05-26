// 실데이터 시드 SQL 생성기.
// 한국 음식 영양값(100g 기준, 한국표준식품성분표 근사) + 최근 2주 부대 식단표 + 병사 목표.
// 실행: node database/gen_seed_full.js > database/seed_full.sql

// name: [calorie, protein, carbohydrate, fat, fiber, sugar, sodium, cholesterol, saturated_fat]
const FOODS = {
  '잡곡밥': [143, 3.0, 30.0, 0.8, 1.5, 0.2, 2, 0, 0.2],
  '북엇국': [30, 4.0, 1.5, 0.8, 0.3, 0.4, 600, 15, 0.2],
  '된장찌개': [60, 4.5, 5.0, 2.5, 1.5, 1.5, 750, 8, 0.7],
  '김치찌개': [45, 3.5, 3.0, 2.2, 1.0, 1.2, 520, 8, 0.7],
  '순두부찌개': [55, 4.5, 3.2, 2.8, 0.8, 1.0, 560, 12, 0.9],
  '콩나물국': [18, 1.8, 1.5, 0.6, 0.8, 0.3, 480, 0, 0.1],
  '육개장': [70, 7.0, 4.0, 3.0, 1.0, 1.0, 800, 25, 1.2],
  '설렁탕': [45, 5.0, 1.5, 2.0, 0, 0.2, 420, 18, 0.9],
  '갈비탕': [60, 6.5, 2.0, 3.0, 0.2, 0.5, 500, 22, 1.3],
  '만두국': [110, 5.0, 14.0, 4.0, 1.0, 0.8, 620, 18, 1.3],
  '부대찌개': [90, 6.0, 6.0, 5.0, 1.0, 2.0, 780, 25, 1.8],
  '떡국': [130, 3.5, 27.0, 1.5, 0.8, 0.3, 650, 5, 0.4],
  '스크램블에그': [150, 10.0, 1.5, 11.0, 0, 1.0, 250, 300, 3.5],
  '계란후라이': [196, 13.6, 0.8, 15.3, 0, 0.4, 210, 370, 4.0],
  '삶은계란': [155, 13.0, 1.1, 11.0, 0, 1.1, 124, 373, 3.3],
  '김자반': [400, 30.0, 40.0, 10.0, 25.0, 2.0, 1800, 0, 2.0],
  '깍두기': [32, 1.2, 6.0, 0.3, 2.0, 3.0, 700, 0, 0.1],
  '토스트(식빵)': [270, 9.0, 49.0, 3.5, 2.3, 5.0, 490, 0, 0.8],
  '시리얼': [380, 8.0, 84.0, 3.0, 5.0, 30.0, 400, 0, 0.8],
  '두부조림': [130, 10.0, 4.0, 8.0, 1.0, 2.0, 520, 0, 1.2],
  '멸치볶음': [250, 30.0, 15.0, 8.0, 1.0, 6.0, 1500, 120, 2.0],
  '제육볶음': [210, 15.0, 8.0, 13.0, 1.0, 5.0, 650, 55, 4.5],
  '돈까스': [250, 14.0, 18.0, 13.0, 1.0, 1.5, 470, 50, 2.8],
  '함박스테이크': [230, 13.0, 12.0, 14.0, 1.0, 3.0, 560, 55, 5.0],
  '떡갈비': [240, 14.0, 12.0, 15.0, 0.8, 4.0, 620, 58, 5.5],
  '탕수육': [230, 9.0, 28.0, 9.0, 0.8, 8.0, 430, 30, 2.0],
  '잡채': [150, 3.5, 24.0, 4.5, 1.5, 5.0, 480, 10, 0.8],
  '고등어구이': [230, 20.0, 0.0, 16.0, 0, 0, 300, 65, 3.8],
  '삼치구이': [180, 20.0, 0.0, 11.0, 0, 0, 250, 60, 2.5],
  '닭갈비': [180, 16.0, 9.0, 8.5, 1.2, 4.5, 600, 65, 2.5],
  '닭볶음탕': [150, 13.0, 7.0, 8.0, 1.0, 3.0, 580, 70, 2.2],
  '오징어볶음': [120, 15.0, 8.0, 3.0, 0.8, 4.0, 620, 180, 0.8],
  '어묵볶음': [140, 8.0, 14.0, 6.0, 0.8, 3.5, 720, 20, 1.5],
  '도라지무침': [70, 2.0, 13.0, 1.5, 3.0, 4.0, 400, 0, 0.2],
  '고사리나물': [50, 3.0, 5.0, 2.0, 3.0, 0.5, 300, 0, 0.3],
  '애호박볶음': [45, 1.5, 5.0, 2.5, 1.5, 2.5, 320, 0, 0.4],
  '가지볶음': [50, 1.2, 5.5, 3.0, 2.0, 3.0, 350, 0, 0.4],
  '오이무침': [25, 1.0, 4.5, 0.4, 1.2, 2.5, 350, 0, 0.1],
  '감자조림': [110, 2.0, 20.0, 2.5, 1.5, 4.0, 450, 0, 0.4],
  '우엉조림': [110, 2.0, 22.0, 1.5, 3.5, 9.0, 480, 0, 0.2],
  '단호박': [66, 1.4, 16.0, 0.1, 3.5, 3.3, 2, 0, 0.0],
  '브로콜리': [34, 2.8, 6.6, 0.4, 2.6, 1.7, 33, 0, 0.0],
  '비빔밥': [140, 5.0, 22.0, 3.5, 2.0, 3.0, 450, 30, 0.9],
  '볶음밥': [170, 4.5, 26.0, 5.5, 1.2, 1.5, 520, 40, 1.4],
  '김치볶음밥': [160, 4.0, 25.0, 5.0, 1.5, 2.0, 600, 35, 1.3],
  '카레라이스': [130, 3.5, 22.0, 3.0, 1.8, 3.0, 430, 8, 1.0],
  '짜장밥': [150, 4.0, 24.0, 4.0, 1.5, 4.0, 560, 10, 1.0],
  '김밥': [160, 5.0, 26.0, 4.0, 2.0, 2.0, 450, 30, 0.8],
  '닭가슴살(삶음)': [165, 31.0, 0.0, 3.6, 0, 0, 70, 85, 1.0],
  '닭가슴살소시지': [100, 15.0, 5.0, 2.0, 0, 1.0, 450, 40, 0.7],
  '프로틴쉐이크': [110, 22.0, 4.0, 1.5, 1.0, 2.0, 120, 30, 0.8],
  '훈제오리': [320, 18.0, 2.0, 27.0, 0, 1.0, 700, 80, 9.0],
  '삼겹살(구이)': [330, 17.0, 0.0, 29.0, 0, 0, 60, 72, 10.5],
  '스팸': [310, 13.0, 2.0, 27.0, 0, 1.0, 1100, 65, 10.0],
  '고구마': [130, 1.5, 30.0, 0.2, 3.0, 9.0, 15, 0, 0.0],
  '사과': [53, 0.3, 14.0, 0.2, 2.4, 10.4, 1, 0, 0.0],
  '오렌지': [47, 0.9, 12.0, 0.1, 2.4, 9.0, 0, 0, 0.0],
  '방울토마토': [18, 0.9, 3.9, 0.2, 1.2, 2.6, 5, 0, 0.0],
  '요거트': [60, 3.5, 7.0, 2.5, 0, 6.0, 40, 10, 1.5],
  '두유': [47, 3.6, 3.0, 2.0, 0.5, 2.5, 30, 0, 0.3],
  '초코우유': [80, 3.0, 12.0, 2.5, 0, 11.0, 60, 8, 1.5],
  '오렌지주스': [45, 0.7, 10.5, 0.2, 0.2, 8.5, 3, 0, 0.0],
  '이온음료': [25, 0.0, 6.0, 0.0, 0, 6.0, 40, 0, 0.0],
  '콜라': [40, 0.0, 10.6, 0.0, 0, 10.6, 5, 0, 0.0],
  '카페라떼': [50, 2.6, 4.0, 2.5, 0, 4.0, 40, 10, 1.5],
  '견과류믹스': [600, 20.0, 20.0, 50.0, 8.0, 4.0, 5, 0, 6.0],
};

// 끼니별 메뉴 풀: [식품명, 그램수]
const BREAKFAST = [
  [['밥(흰쌀)', 180], ['북엇국', 250], ['계란말이', 80], ['김', 5], ['배추김치', 40]],
  [['잡곡밥', 180], ['된장찌개', 250], ['스크램블에그', 100], ['시금치나물', 70], ['깍두기', 40]],
  [['밥(흰쌀)', 180], ['미역국', 250], ['계란후라이', 50], ['김자반', 5], ['배추김치', 40]],
  [['토스트(식빵)', 100], ['시리얼', 60], ['우유', 200], ['바나나', 100]],
  [['밥(흰쌀)', 180], ['콩나물국', 250], ['두부조림', 100], ['멸치볶음', 20], ['배추김치', 40]],
  [['잡곡밥', 180], ['북엇국', 250], ['삶은계란', 50], ['우엉조림', 60], ['깍두기', 40]],
  [['밥(흰쌀)', 180], ['된장찌개', 250], ['김', 5], ['감자조림', 80], ['배추김치', 40]],
];
const LUNCH = [
  [['밥(흰쌀)', 220], ['김치찌개', 250], ['제육볶음', 150], ['콩나물무침', 70], ['배추김치', 50]],
  [['밥(흰쌀)', 220], ['미역국', 200], ['돈까스', 200], ['잡채', 100], ['깍두기', 50]],
  [['비빔밥', 380], ['만두국', 200], ['배추김치', 50]],
  [['밥(흰쌀)', 220], ['육개장', 300], ['고등어구이', 120], ['도라지무침', 60], ['배추김치', 50]],
  [['카레라이스', 380], ['오이무침', 80], ['닭가슴살(삶음)', 100], ['배추김치', 50]],
  [['밥(흰쌀)', 220], ['갈비탕', 300], ['잡채', 120], ['깍두기', 50]],
  [['짜장밥', 380], ['탕수육', 150], ['깍두기', 50]],
];
const DINNER = [
  [['밥(흰쌀)', 200], ['순두부찌개', 250], ['닭갈비', 180], ['애호박볶음', 80], ['배추김치', 50]],
  [['밥(흰쌀)', 200], ['된장찌개', 250], ['삼치구이', 120], ['고사리나물', 70], ['깍두기', 50]],
  [['밥(흰쌀)', 200], ['부대찌개', 300], ['어묵볶음', 80], ['시금치나물', 70], ['배추김치', 50]],
  [['볶음밥', 220], ['만두국', 200], ['단호박', 100], ['배추김치', 50]],
  [['밥(흰쌀)', 200], ['설렁탕', 300], ['떡갈비', 150], ['도라지무침', 60], ['깍두기', 50]],
  [['밥(흰쌀)', 200], ['닭볶음탕', 300], ['두부조림', 100], ['오이무침', 80], ['배추김치', 50]],
  [['김치볶음밥', 250], ['만두국', 200], ['계란후라이', 50], ['방울토마토', 100]],
];

function dateRange(startISO, days) {
  const out = [];
  const d = new Date(startISO + 'T00:00:00Z');
  for (let i = 0; i < days; i++) {
    out.push(new Date(d.getTime() + i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

function sqlStr(s) { return `'${String(s).replace(/'/g, "''")}'`; }

const UNIT_ID = 1;
const DAYS = 14;
const START = '2026-05-13'; // 2026-05-13 ~ 2026-05-26 (오늘 포함)
const dates = dateRange(START, DAYS);

const lines = [];
lines.push('-- 실데이터 시드: 식품 영양 + 최근 2주 부대 식단 + 병사 목표');
lines.push('-- (필요 컬럼 ALTER 포함 — 마이그레이션 002/003 미적용 DB에서도 단독 실행 가능)');
lines.push('BEGIN;');
lines.push('');

// 0) 필요한 컬럼 보장 (idempotent)
lines.push("ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS goal_type VARCHAR(20);");
lines.push("ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS sex VARCHAR(10);");
lines.push("ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS age INT;");
lines.push("ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS height_cm INT;");
lines.push("ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5, 1);");
lines.push("ALTER TABLE soldiers ADD COLUMN IF NOT EXISTS activity_level VARCHAR(20);");
lines.push("ALTER TABLE soldier_meal_skips ADD COLUMN IF NOT EXISTS portion DECIMAL(3, 2) DEFAULT 0;");
lines.push('');

// 1) 식품
lines.push('INSERT INTO foods (name, calorie, protein, carbohydrate, fat, fiber, sugar, sodium, cholesterol, saturated_fat) VALUES');
const foodRows = Object.entries(FOODS).map(([name, v]) =>
  `  (${sqlStr(name)}, ${v.join(', ')})`);
lines.push(foodRows.join(',\n') + '\nON CONFLICT (name) DO NOTHING;');
lines.push('');

// 2) 식단(meals)
const mealRows = [];
const mealFoodRows = [];
const pools = { breakfast: BREAKFAST, lunch: LUNCH, dinner: DINNER };
dates.forEach((date, di) => {
  for (const mt of ['breakfast', 'lunch', 'dinner']) {
    mealRows.push(`  (${UNIT_ID}, ${sqlStr(date)}, ${sqlStr(mt)})`);
    const menu = pools[mt][di % pools[mt].length];
    for (const [fname, qty] of menu) {
      mealFoodRows.push(`  (${sqlStr(date)}, ${sqlStr(mt)}, ${sqlStr(fname)}, ${qty})`);
    }
  }
});
lines.push('INSERT INTO meals (unit_id, meal_date, meal_type) VALUES');
lines.push(mealRows.join(',\n') + '\nON CONFLICT (unit_id, meal_date, meal_type) DO NOTHING;');
lines.push('');

// 3) meal_foods (재실행 가능하도록 해당 기간 먼저 삭제)
lines.push(`DELETE FROM meal_foods WHERE meal_id IN (
  SELECT id FROM meals WHERE unit_id = ${UNIT_ID}
    AND meal_date >= ${sqlStr(dates[0])} AND meal_date <= ${sqlStr(dates[dates.length - 1])}
);`);
lines.push('INSERT INTO meal_foods (meal_id, food_id, quantity)');
lines.push('SELECT m.id, f.id, v.qty FROM (VALUES');
lines.push(mealFoodRows.join(',\n'));
lines.push(`) AS v(d, mt, fname, qty)
JOIN meals m ON m.unit_id = ${UNIT_ID} AND m.meal_date = v.d::date AND m.meal_type = v.mt
JOIN foods f ON f.name = v.fname;`);
lines.push('');

// 4) 병사 목표/신체정보
lines.push(`UPDATE soldiers SET goal_type='bulk', sex='male', age=21, height_cm=178, weight_kg=70.0,
  activity_level='active', daily_calorie_goal=3200, daily_protein_goal=150, daily_carb_goal=400, daily_fat_goal=89
  WHERE name='김철영';`);
lines.push(`UPDATE soldiers SET goal_type='cut', sex='male', age=23, height_cm=175, weight_kg=80.0,
  activity_level='moderate', daily_calorie_goal=2100, daily_protein_goal=176, daily_carb_goal=180, daily_fat_goal=58
  WHERE name='박민수';`);
lines.push(`UPDATE soldiers SET goal_type='maintain', sex='male', age=22, height_cm=172, weight_kg=68.0,
  activity_level='moderate', daily_calorie_goal=2500, daily_protein_goal=122, daily_carb_goal=310, daily_fat_goal=69
  WHERE name='이지훈';`);
lines.push('');
lines.push('COMMIT;');

process.stdout.write(lines.join('\n') + '\n');
