import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function Login({ onLogin }) {
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState('');
  const [role, setRole] = useState('admin');
  const [soldiers, setSoldiers] = useState([]);
  const [soldierId, setSoldierId] = useState('');
  const [error, setError] = useState('');

  const [unitForm, setUnitForm] = useState(null); // {name, code}
  const [soldierForm, setSoldierForm] = useState(null); // {name, rank}

  const reloadUnits = async (selectId) => {
    const u = await api.listUnits();
    setUnits(u);
    if (selectId) setUnitId(String(selectId));
    else if (u[0] && !unitId) setUnitId(String(u[0].id));
  };

  useEffect(() => { reloadUnits().catch((e) => setError(e.message)); }, []);

  useEffect(() => {
    if (role !== 'soldier' || !unitId) return;
    api.listSoldiers(unitId)
      .then((s) => { setSoldiers(s); setSoldierId(s[0] ? String(s[0].id) : ''); })
      .catch((e) => setError(e.message));
  }, [role, unitId]);

  const addUnit = async () => {
    if (!unitForm?.name) return;
    try {
      const u = await api.createUnit({ name: unitForm.name, code: unitForm.code || null });
      setUnitForm(null);
      await reloadUnits(u.id);
    } catch (e) { setError(e.message); }
  };

  const addSoldier = async () => {
    if (!soldierForm?.name) return;
    try {
      const s = await api.createSoldier({ unit_id: Number(unitId), name: soldierForm.name, rank: soldierForm.rank || null });
      setSoldierForm(null);
      const list = await api.listSoldiers(unitId);
      setSoldiers(list);
      setSoldierId(String(s.id));
    } catch (e) { setError(e.message); }
  };

  const start = () => {
    setError('');
    const unit = units.find((u) => String(u.id) === String(unitId));
    if (!unit) { setError('부대를 선택하세요.'); return; }
    if (role === 'soldier') {
      const s = soldiers.find((x) => String(x.id) === String(soldierId));
      if (!s) { setError('병사를 선택하거나 등록하세요.'); return; }
      onLogin({ role: 'soldier', unitId: unit.id, unitName: unit.name, soldierId: s.id, soldierName: s.name, soldierRank: s.rank });
    } else {
      onLogin({ role: 'admin', unitId: unit.id, unitName: unit.name });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light p-4">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-1 text-center text-xl font-bold text-brand-dark">🍽️ 군부대 식단 영양가 추적</h1>
        <p className="mb-5 text-center text-sm text-gray-500">부대와 사용자를 선택해 시작하세요</p>

        {/* 부대 선택 */}
        <label className="mb-1 block text-sm font-medium text-gray-600">부대</label>
        <div className="mb-2 flex gap-2">
          <select className="input" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            {units.length === 0 && <option value="">부대 없음 — 새로 추가</option>}
            {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <button className="btn-ghost whitespace-nowrap px-3" onClick={() => setUnitForm(unitForm ? null : { name: '', code: '' })}>＋ 부대</button>
        </div>
        {unitForm && (
          <div className="mb-3 space-y-2 rounded-lg bg-gray-50 p-3">
            <input className="input" placeholder="부대명 (예: 제5322부대)" value={unitForm.name}
              onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} />
            <input className="input" placeholder="부대 코드 (선택)" value={unitForm.code}
              onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value })} />
            <button className="btn-primary w-full text-sm" onClick={addUnit}>부대 추가</button>
          </div>
        )}

        {/* 역할 선택 */}
        <label className="mb-1 mt-2 block text-sm font-medium text-gray-600">역할</label>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {[['admin', '🍱 관리자 (식단 관리)'], ['soldier', '🪖 병사 (개인 추적)']].map(([v, label]) => (
            <button key={v} onClick={() => setRole(v)}
              className={`rounded-lg border px-2 py-3 text-sm font-medium ${role === v ? 'border-brand bg-brand text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* 병사 선택 */}
        {role === 'soldier' && (
          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium text-gray-600">병사 (본인)</label>
            <div className="flex gap-2">
              <select className="input" value={soldierId} onChange={(e) => setSoldierId(e.target.value)}>
                {soldiers.length === 0 && <option value="">병사 없음 — 등록 필요</option>}
                {soldiers.map((s) => <option key={s.id} value={s.id}>{s.rank} {s.name}</option>)}
              </select>
              <button className="btn-ghost whitespace-nowrap px-3" onClick={() => setSoldierForm(soldierForm ? null : { name: '', rank: '' })}>＋ 등록</button>
            </div>
            {soldierForm && (
              <div className="mt-2 space-y-2 rounded-lg bg-gray-50 p-3">
                <input className="input" placeholder="이름" value={soldierForm.name}
                  onChange={(e) => setSoldierForm({ ...soldierForm, name: e.target.value })} />
                <input className="input" placeholder="계급 (예: 이병)" value={soldierForm.rank}
                  onChange={(e) => setSoldierForm({ ...soldierForm, rank: e.target.value })} />
                <button className="btn-primary w-full text-sm" onClick={addSoldier}>병사 등록</button>
              </div>
            )}
          </div>
        )}

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <button className="btn-primary w-full" onClick={start}>시작하기</button>
      </div>
    </div>
  );
}
