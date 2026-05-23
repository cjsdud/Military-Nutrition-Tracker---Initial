export const MEAL_LABELS = {
  breakfast: '🌅 조식',
  lunch: '☀️ 중식',
  dinner: '🌙 석식',
  snack: '🍪 간식',
  late_night: '🌃 야식',
};

export function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function shiftDate(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatDateKo(iso) {
  const d = new Date(iso + 'T00:00:00');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

export function kcal(n) {
  return `${Math.round(Number(n) || 0).toLocaleString()} kcal`;
}

export function g(n) {
  return `${Math.round((Number(n) || 0) * 10) / 10}g`;
}
