import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../lib/api';
import { MEAL_LABELS, todayISO, kcal, shiftDate } from '../lib/format';
import DateNav from '../components/DateNav';
import NutritionTotals from '../components/NutritionTotals';
import FoodSearchModal from '../components/FoodSearchModal';
import GoalSettingsModal from '../components/GoalSettingsModal';

const UNIT_MEALS = ['breakfast', 'lunch', 'dinner'];
const PORTIONS = [
  { v: 0, label: '안 먹음' },
  { v: 0.5, label: '적게' },
  { v: 1, label: '보통' },
  { v: 1.5, label: '많이' },
];

export default function SoldierTracker() {
  const { session } = useOutletContext();
  const unitId = session.unitId;
  const soldierId = session.soldierId;

  const [date, setDate] = useState(todayISO());
  const [soldier, setSoldier] = useState(null);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [unitMeals, setUnitMeals] = useState(null);
  const [portions, setPortions] = useState({});
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [goalModal, setGoalModal] = useState(false);
  const autoGen = useRef(new Set());

  useEffect(() => {
    api.getSoldier(soldierId).then(setSoldier).catch((e) => setError(e.message));
  }, [soldierId]);

  const load = async () => {
    setError('');
    try {
      let um = await api.getDayMeals(unitId, date);
      const empty = !um.breakfast && !um.lunch && !um.dinner;
      const key = `${unitId}-${date.slice(0, 7)}`;
      if (empty && !autoGen.current.has(key)) {
        autoGen.current.add(key);
        const [y, m] = date.split('-');
        await api.generateMeals({ unit_id: unitId, year: Number(y), month: Number(m) });
        um = await api.getDayMeals(unitId, date);
      }
      const [st, lg, pr] = await Promise.all([
        api.soldierDay(soldierId, date),
        api.getLogs(soldierId, date),
        api.getPortions(soldierId, date),
      ]);
      setStats(st); setLogs(lg); setUnitMeals(um);
      setPortions(Object.fromEntries(pr.map((p) => [p.meal_type, p.portion])));
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { load(); }, [date]);

  const addLog = async ({ food, custom, quantity }) => {
    const body = { soldier_id: soldierId, log_date: date, quantity, meal_type: 'snack' };
    if (food) body.food_id = food.id;
    else Object.assign(body, {
      custom_name: custom.name,
      custom_calorie: Number(custom.calorie) || 0,
      custom_protein: Number(custom.protein) || 0,
      custom_carbohydrate: Number(custom.carbohydrate) || 0,
      custom_fat: Number(custom.fat) || 0,
    });
    await api.addLog(body);
    await load();
  };

  const delLog = async (id) => { await api.deleteLog(id); await load(); };

  const setPortionFor = async (type, value) => {
    await api.setPortion({ soldier_id: soldierId, log_date: date, meal_type: type, portion: value });
    await load();
  };

  const duplicateYesterday = async () => {
    await api.duplicateLogs({ soldier_id: soldierId, from_date: shiftDate(date, -1), to_date: date });
    await load();
  };

  const onGoalsSaved = async () => {
    setSoldier(await api.getSoldier(soldierId));
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <DateNav date={date} onChange={setDate} />
        <button className="btn-ghost text-sm" disabled={!soldier} onClick={() => setGoalModal(true)}>🎯 목표 설정</button>
      </div>

      {error && <div className="card border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {stats && (
        <>
          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">부대 식단</h2>
              <span className="text-sm font-semibold text-brand">{kcal(stats.unit_meals?.calorie || 0)}</span>
            </div>

            <div className="space-y-3">
              {UNIT_MEALS.map((t) => {
                const meal = unitMeals?.[t];
                const foods = meal?.foods || [];
                const portion = portions[t] ?? 1;
                const baseCal = meal?.totals?.calorie || 0;
                return (
                  <div key={t} className="rounded-lg border border-gray-100 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium">{MEAL_LABELS[t]}</span>
                      <span className="text-sm text-gray-500">
                        {kcal(baseCal * portion)}
                        {portion !== 1 && <span className="ml-1 text-xs text-gray-400">(원래 {kcal(baseCal)})</span>}
                      </span>
                    </div>

                    {foods.length === 0 ? (
                      <p className="mb-2 text-xs text-gray-400">등록된 식단이 없습니다.</p>
                    ) : (
                      <p className="mb-2 text-xs text-gray-500">
                        {foods.map((f) => `${f.name}(${f.quantity}g)`).join(' · ')}
                      </p>
                    )}

                    <div className="grid grid-cols-4 gap-1">
                      {PORTIONS.map((p) => (
                        <button
                          key={p.v}
                          onClick={() => setPortionFor(t, p.v)}
                          className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                            portion === p.v ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold">추가로 섭취한 음식</h2>
              <span className="text-sm font-semibold text-brand">{kcal(stats.additional_logs?.calorie || 0)}</span>
            </div>
            <ul className="divide-y divide-gray-50">
              {logs.length === 0 && <li className="py-2 text-sm text-gray-400">기록된 음식이 없습니다.</li>}
              {logs.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {l.food_name} <span className="text-gray-400">({l.quantity}g)</span>
                    {l.is_custom && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">직접입력</span>}
                    {l.memo && <span className="ml-1 text-xs text-gray-400">· {l.memo}</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-gray-500">{kcal(l.nutrition.calorie)}</span>
                    <button className="text-gray-300 hover:text-red-500" onClick={() => delLog(l.id)}>✕</button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <button className="btn-primary flex-1 text-sm" onClick={() => setModal(true)}>+ 음식 추가</button>
              <button className="btn-ghost text-sm" onClick={duplicateYesterday}>↺ 어제 그대로</button>
            </div>
          </section>

          <NutritionTotals title="누적 합계 (목표 대비)" totals={stats.totals} goals={stats.goals} />
        </>
      )}

      <FoodSearchModal open={modal} onClose={() => setModal(false)} onSelect={addLog} allowCustom />
      <GoalSettingsModal open={goalModal} soldier={soldier} onClose={() => setGoalModal(false)} onSaved={onGoalsSaved} />
    </div>
  );
}
