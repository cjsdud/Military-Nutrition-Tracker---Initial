import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { MEAL_LABELS, todayISO, kcal, shiftDate, formatDateKo } from '../lib/format';
import DateNav from '../components/DateNav';
import NutritionTotals from '../components/NutritionTotals';
import FoodSearchModal from '../components/FoodSearchModal';

const SKIP_TYPES = ['breakfast', 'lunch', 'dinner'];

export default function SoldierTracker() {
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState(null);
  const [soldiers, setSoldiers] = useState([]);
  const [soldierId, setSoldierId] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [skips, setSkips] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);

  useEffect(() => {
    api.listUnits().then((u) => { setUnits(u); if (u[0]) setUnitId(u[0].id); }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!unitId) return;
    api.listSoldiers(unitId).then((s) => { setSoldiers(s); setSoldierId(s[0]?.id || null); }).catch((e) => setError(e.message));
  }, [unitId]);

  const load = async () => {
    if (!soldierId) { setStats(null); setLogs([]); setSkips([]); return; }
    setError('');
    try {
      const [st, lg, sk] = await Promise.all([
        api.soldierDay(soldierId, date),
        api.getLogs(soldierId, date),
        api.getSkips(soldierId, date),
      ]);
      setStats(st); setLogs(lg); setSkips(sk);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { load(); }, [soldierId, date]);

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

  const toggleSkip = async (type) => {
    const existing = skips.find((s) => s.meal_type === type);
    if (existing) await api.removeSkip(existing.id);
    else await api.addSkip({ soldier_id: soldierId, skip_date: date, meal_type: type, reason: '외출/회식' });
    await load();
  };

  const duplicateYesterday = async () => {
    await api.duplicateLogs({ soldier_id: soldierId, from_date: shiftDate(date, -1), to_date: date });
    await load();
  };

  const skipped = new Set(skips.map((s) => s.meal_type));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="input w-auto" value={unitId || ''} onChange={(e) => setUnitId(Number(e.target.value))}>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select className="input w-auto" value={soldierId || ''} onChange={(e) => setSoldierId(Number(e.target.value))}>
          {soldiers.length === 0 && <option value="">병사 없음</option>}
          {soldiers.map((s) => <option key={s.id} value={s.id}>{s.rank} {s.name}</option>)}
        </select>
        <DateNav date={date} onChange={setDate} />
      </div>

      {error && <div className="card border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {stats && (
        <>
          <section className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-bold">부대 식단 (자동)</h2>
              <span className="text-sm font-semibold text-brand">{kcal(stats.unit_meals?.calorie || 0)}</span>
            </div>
            <ul className="space-y-1 text-sm">
              {SKIP_TYPES.map((t) => {
                const isSkip = skipped.has(t);
                return (
                  <li key={t} className="flex items-center justify-between py-1">
                    <span className={isSkip ? 'text-gray-300 line-through' : ''}>
                      {MEAL_LABELS[t]} · {kcal(stats.unit_by_meal?.[t]?.calorie || 0)}
                    </span>
                    <button className={`text-xs underline ${isSkip ? 'text-brand' : 'text-gray-400'}`} onClick={() => toggleSkip(t)}>
                      {isSkip ? '식사함으로 변경' : '외출/회식 (제외)'}
                    </button>
                  </li>
                );
              })}
            </ul>
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
    </div>
  );
}
