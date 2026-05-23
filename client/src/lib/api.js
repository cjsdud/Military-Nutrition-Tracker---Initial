const BASE = import.meta.env.VITE_API_BASE || '';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(data?.error || `요청 실패 (${res.status})`);
  }
  return data;
}

export const api = {
  // units
  listUnits: () => request('/units'),
  createUnit: (body) => request('/units', { method: 'POST', body }),

  // foods
  searchFoods: (q) => request(`/foods/search?q=${encodeURIComponent(q)}`),
  listFoods: () => request('/foods'),
  createFood: (body) => request('/foods', { method: 'POST', body }),

  // meals
  getDayMeals: (unitId, date) => request(`/meals/${unitId}/${date}`),
  saveMeal: (body) => request('/meals', { method: 'POST', body }),
  updateMeal: (mealId, body) => request(`/meals/${mealId}`, { method: 'PUT', body }),
  deleteMeal: (mealId) => request(`/meals/${mealId}`, { method: 'DELETE' }),
  copyMeals: (body) => request('/meals/copy', { method: 'POST', body }),

  // soldiers
  listSoldiers: (unitId) => request(`/soldiers${unitId ? `?unit_id=${unitId}` : ''}`),
  getSoldier: (id) => request(`/soldiers/${id}`),
  createSoldier: (body) => request('/soldiers', { method: 'POST', body }),
  updateSoldier: (id, body) => request(`/soldiers/${id}`, { method: 'PUT', body }),
  getFavorites: (soldierId) => request(`/soldiers/${soldierId}/favorites`),
  addFavorite: (soldierId, body) => request(`/soldiers/${soldierId}/favorites`, { method: 'POST', body }),
  removeFavorite: (soldierId, foodId) => request(`/soldiers/${soldierId}/favorites/${foodId}`, { method: 'DELETE' }),
  frequentFoods: (soldierId, limit = 10) => request(`/soldiers/${soldierId}/frequent-foods?limit=${limit}`),

  // soldier logs
  getLogs: (soldierId, date) => request(`/soldier-logs/${soldierId}/${date}`),
  addLog: (body) => request('/soldier-logs', { method: 'POST', body }),
  deleteLog: (logId) => request(`/soldier-logs/${logId}`, { method: 'DELETE' }),
  duplicateLogs: (body) => request('/soldier-logs/duplicate', { method: 'POST', body }),
  getSkips: (soldierId, date) => request(`/soldier-logs/skip/${soldierId}/${date}`),
  addSkip: (body) => request('/soldier-logs/skip', { method: 'POST', body }),
  removeSkip: (skipId) => request(`/soldier-logs/skip/${skipId}`, { method: 'DELETE' }),

  // stats
  unitReport: (unitId, year, month) => request(`/units/${unitId}/report/${year}/${month}`),
  unitCoverage: (unitId, year, month) => request(`/unit-coverage/${unitId}/${year}/${month}`),
  soldierDay: (soldierId, date) => request(`/soldier-stats/${soldierId}/${date}`),
  soldierMonth: (soldierId, year, month) => request(`/soldier-stats/${soldierId}/${year}/${month}`),
};
