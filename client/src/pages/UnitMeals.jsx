import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { MEAL_LABELS, todayISO, kcal, g, formatDateKo, shiftDate } from '../lib/format';
import DateNav from '../components/DateNav';
import NutritionTotals from '../components/NutritionTotals';
import FoodSearchModal from '../components/FoodSearchModal';

const TYPES = ['breakfast', 'lunch', 'dinner'];

export default function UnitMeals() {
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalType, setModalType] = useState(null);

  useEffect(() => {
    api.listUnits().then((u) => {
      setUnits(u);
      if (u[0]) setUnitId(u[0].id);
    }).catch((e) => setError(e.message));
  }, []);

  const load = async () => {
    if (!unitId) return;
    setLoading(true); setError('');
    try { setDay(await api.getDayMeals(unitId, date)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [unitId, date]);

  const mealFoods = (type) => day?.[type]?.foods || [];

  const persist = async (type, foods) => {
    const foods_data = foods.map((f) => ({ food_id: f.food_id, quantity: f.quantity }));
    await api.saveMeal({ unit_id: unitId, meal_date: date, meal_type: type, foods_data });
    await load();
  };

  const addFood = async ({ food, quantity }) => {
    const current = mealFoods(modalType).map((f) => ({ food_id: f.food_id, quantity: f.quantity }));
    await persist(modalType, [...current, { food_id: food.id, quantity }]);
  };

  const removeFood = async (type, foodId) => {
    const remaining = mealFoods(type).filter((f) => f.food_id !== foodId);
    await persist(type, remaining);
  };

  const copyYesterday = async () => {
    if (!confirm(`${formatDateKo(shiftDate(date, -1))} 식단을 오늘로 복사할까요?`)) return;
    await api.copyMeals({ unit_id: unitId, from_date: shiftDate(date, -1), to_date: date });
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="input w-auto" value={unitId || ''} onChange={(e) => setUnitId(Number(e.target.value))}>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <DateNav date={date} onChange={setDate} />
        <button className="btn-ghost text-sm" onClick={copyYesterday}>📋 어제 식단 복사</button>
      </div>

      {error && <div className="card border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
      {loading && <p className="text-sm text-gray-400">불러오는 중…</p>}

      {day && TYPES.map((type) => {
        const meal = day[type];
        const foods = meal?.foods || [];
        return (
          <section key={type} className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold">{MEAL_LABELS[type]}</h2>
              <span className="text-sm font-semibold text-brand">{kcal(meal?.totals?.calorie || 0)}</span>
            </div>
            <ul className="divide-y divide-gray-50">
              {foods.length === 0 && <li className="py-2 text-sm text-gray-400">등록된 음식이 없습니다.</li>}
              {foods.map((f) => (
                <li key={f.meal_food_id} className="flex items-center justify-between py-2 text-sm">
                  <span>{f.name} <span className="text-gray-400">({f.quantity}g)</span></span>
                  <span className="flex items-center gap-3">
                    <span className="text-gray-500">{kcal(f.nutrition.calorie)}</span>
                    <button className="text-gray-300 hover:text-red-500" onClick={() => removeFood(type, f.food_id)}>✕</button>
                  </span>
                </li>
              ))}
            </ul>
            <button className="btn-ghost mt-2 w-full text-sm" onClick={() => setModalType(type)}>+ 음식 추가</button>
            {meal?.totals && (
              <div className="mt-2 text-xs text-gray-500">
                단백질 {g(meal.totals.protein)} · 탄수 {g(meal.totals.carbohydrate)} · 지방 {g(meal.totals.fat)}
              </div>
            )}
          </section>
        );
      })}

      {day && <NutritionTotals title="일일 합계" totals={day.daily_total} />}

      <FoodSearchModal open={!!modalType} onClose={() => setModalType(null)} onSelect={addFood} />
    </div>
  );
}
