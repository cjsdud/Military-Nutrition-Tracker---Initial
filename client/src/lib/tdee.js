// 목표 칼로리/매크로 자동계산 (Mifflin-St Jeor + 활동계수 + 목표보정)

export const GOAL_TYPES = [
  { value: 'bulk', label: '벌크업', hint: '근육 증량 (+15%)' },
  { value: 'maintain', label: '유지', hint: '현 체중 유지' },
  { value: 'cut', label: '다이어트', hint: '체지방 감량 (-20%)' },
];

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: '거의 안 함', factor: 1.2 },
  { value: 'light', label: '가벼움 (주1-3)', factor: 1.375 },
  { value: 'moderate', label: '보통 (주3-5)', factor: 1.55 },
  { value: 'active', label: '많음 (주6-7)', factor: 1.725 },
  { value: 'very_active', label: '매우 많음', factor: 1.9 },
];

const GOAL_ADJUST = { bulk: 1.15, maintain: 1.0, cut: 0.8 };
const PROTEIN_PER_KG = { bulk: 2.0, maintain: 1.8, cut: 2.2 };

function activityFactor(level) {
  return ACTIVITY_LEVELS.find((a) => a.value === level)?.factor ?? 1.2;
}

// Mifflin-St Jeor 기초대사량(BMR)
export function bmr({ sex, age, height_cm, weight_kg }) {
  const w = Number(weight_kg), h = Number(height_cm), a = Number(age);
  const base = 10 * w + 6.25 * h - 5 * a;
  return sex === 'female' ? base - 161 : base + 5;
}

// 입력값으로 목표 칼로리/매크로 계산. 필수값(체중/키/나이) 없으면 null 반환.
export function calcGoals({ sex, age, height_cm, weight_kg, activity_level, goal_type }) {
  const w = Number(weight_kg), h = Number(height_cm), a = Number(age);
  if (!w || !h || !a) return null;

  const tdee = bmr({ sex, age, height_cm, weight_kg }) * activityFactor(activity_level);
  const calorie = Math.round((tdee * (GOAL_ADJUST[goal_type] ?? 1.0)) / 10) * 10;

  const protein = Math.round(w * (PROTEIN_PER_KG[goal_type] ?? 1.8));
  const fat = Math.round((calorie * 0.25) / 9);
  const carbKcal = calorie - protein * 4 - fat * 9;
  const carbohydrate = Math.max(0, Math.round(carbKcal / 4));

  return { calorie, protein, carbohydrate, fat };
}
