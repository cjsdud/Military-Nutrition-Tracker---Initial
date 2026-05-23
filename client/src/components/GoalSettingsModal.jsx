import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { GOAL_TYPES, ACTIVITY_LEVELS, calcGoals } from '../lib/tdee';

const EMPTY = {
  goal_type: 'maintain', sex: 'male', age: '', height_cm: '', weight_kg: '', activity_level: 'moderate',
  daily_calorie_goal: '', daily_protein_goal: '', daily_carb_goal: '', daily_fat_goal: '',
};

export default function GoalSettingsModal({ open, soldier, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !soldier) return;
    setError('');
    setForm({
      goal_type: soldier.goal_type || 'maintain',
      sex: soldier.sex || 'male',
      age: soldier.age ?? '',
      height_cm: soldier.height_cm ?? '',
      weight_kg: soldier.weight_kg ?? '',
      activity_level: soldier.activity_level || 'moderate',
      daily_calorie_goal: soldier.daily_calorie_goal ?? '',
      daily_protein_goal: soldier.daily_protein_goal ?? '',
      daily_carb_goal: soldier.daily_carb_goal ?? '',
      daily_fat_goal: soldier.daily_fat_goal ?? '',
    });
  }, [open, soldier]);

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const autoCalc = () => {
    const g = calcGoals(form);
    if (!g) { setError('자동 계산하려면 나이·키·체중을 입력하세요.'); return; }
    setError('');
    setForm((f) => ({
      ...f,
      daily_calorie_goal: g.calorie,
      daily_protein_goal: g.protein,
      daily_carb_goal: g.carbohydrate,
      daily_fat_goal: g.fat,
    }));
  };

  const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.updateSoldier(soldier.id, {
        goal_type: form.goal_type,
        sex: form.sex,
        age: numOrNull(form.age),
        height_cm: numOrNull(form.height_cm),
        weight_kg: numOrNull(form.weight_kg),
        activity_level: form.activity_level,
        daily_calorie_goal: numOrNull(form.daily_calorie_goal),
        daily_protein_goal: numOrNull(form.daily_protein_goal),
        daily_carb_goal: numOrNull(form.daily_carb_goal),
        daily_fat_goal: numOrNull(form.daily_fat_goal),
      });
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-4 sm:max-w-md sm:rounded-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">🎯 목표 설정 {soldier && <span className="text-sm font-normal text-gray-400">· {soldier.rank} {soldier.name}</span>}</h2>
          <button className="text-2xl leading-none text-gray-400" onClick={onClose}>×</button>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm text-gray-600">목표 유형</label>
          <div className="grid grid-cols-3 gap-2">
            {GOAL_TYPES.map((g) => (
              <button key={g.value} onClick={() => set('goal_type', g.value)}
                className={`rounded-lg border px-2 py-2 text-sm ${form.goal_type === g.value ? 'border-brand bg-brand text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
                <div className="font-medium">{g.label}</div>
                <div className={`text-[10px] ${form.goal_type === g.value ? 'text-white/80' : 'text-gray-400'}`}>{g.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm text-gray-600">성별</label>
            <select className="input" value={form.sex} onChange={(e) => set('sex', e.target.value)}>
              <option value="male">남</option>
              <option value="female">여</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">나이</label>
            <input type="number" inputMode="numeric" className="input" value={form.age} onChange={(e) => set('age', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">키 (cm)</label>
            <input type="number" inputMode="numeric" className="input" value={form.height_cm} onChange={(e) => set('height_cm', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-600">체중 (kg)</label>
            <input type="number" inputMode="decimal" className="input" value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)} />
          </div>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm text-gray-600">활동량</label>
          <select className="input" value={form.activity_level} onChange={(e) => set('activity_level', e.target.value)}>
            {ACTIVITY_LEVELS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>

        <button className="btn-ghost mb-3 w-full text-sm" onClick={autoCalc}>⚙️ 신체정보로 목표 자동 계산</button>

        <div className="mb-3 grid grid-cols-2 gap-2">
          {[
            ['daily_calorie_goal', '목표 칼로리 (kcal)'],
            ['daily_protein_goal', '단백질 (g)'],
            ['daily_carb_goal', '탄수화물 (g)'],
            ['daily_fat_goal', '지방 (g)'],
          ].map(([k, label]) => (
            <div key={k}>
              <label className="mb-1 block text-sm text-gray-600">{label}</label>
              <input type="number" inputMode="numeric" className="input" value={form[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
        </div>

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={saving} onClick={save}>{saving ? '저장 중…' : '저장'}</button>
          <button className="btn-ghost" onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
}
