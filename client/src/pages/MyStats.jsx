import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts';
import { api } from '../lib/api';
import { todayISO, shiftDate, kcal, g } from '../lib/format';

const GRANS = [
  { v: 'day', label: '일별' },
  { v: 'week', label: '주별' },
  { v: 'month', label: '월별' },
];

function firstOfMonthsAgo(n) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function mondayOf(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const dow = (d.getUTCDay() + 6) % 7; // 월=0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

function rangeFor(gran) {
  const to = todayISO();
  if (gran === 'day') return { from: shiftDate(to, -29), to };
  if (gran === 'week') return { from: shiftDate(to, -55), to };
  return { from: firstOfMonthsAgo(5), to };
}

function aggregate(days, gran) {
  if (gran === 'day') {
    return days.map((d) => ({
      label: d.date.slice(5),
      calorie: Math.round(d.calorie), protein: Math.round(d.protein),
      carbohydrate: Math.round(d.carbohydrate), fat: Math.round(d.fat),
    }));
  }
  const buckets = new Map();
  for (const d of days) {
    const key = gran === 'week' ? mondayOf(d.date) : d.date.slice(0, 7);
    if (!buckets.has(key)) buckets.set(key, { key, n: 0, calorie: 0, protein: 0, carbohydrate: 0, fat: 0 });
    const b = buckets.get(key);
    b.n += 1; b.calorie += d.calorie; b.protein += d.protein; b.carbohydrate += d.carbohydrate; b.fat += d.fat;
  }
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key)).map((b) => ({
    label: gran === 'week' ? `${b.key.slice(5).replace('-', '/')}주` : `${Number(b.key.slice(5))}월`,
    calorie: Math.round(b.calorie / b.n), protein: Math.round(b.protein / b.n),
    carbohydrate: Math.round(b.carbohydrate / b.n), fat: Math.round(b.fat / b.n),
  }));
}

export default function MyStats() {
  const { session } = useOutletContext();
  const soldierId = session.soldierId;
  const [gran, setGran] = useState('day');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const { from, to } = rangeFor(gran);
    setError('');
    api.soldierRange(soldierId, from, to).then(setData).catch((e) => setError(e.message));
  }, [gran, soldierId]);

  const chart = useMemo(() => (data ? aggregate(data.days, gran) : []), [data, gran]);
  const avg = data?.average || {};
  const goals = data?.goals || {};
  const unitLabel = gran === 'day' ? '일' : gran === 'week' ? '주' : '월';
  const calPct = goals.calorie ? Math.round((avg.calorie / goals.calorie) * 100) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {GRANS.map((gOpt) => (
          <button key={gOpt.v} onClick={() => setGran(gOpt.v)}
            className={`rounded-lg py-2 text-sm font-medium ${gran === gOpt.v ? 'bg-brand text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {gOpt.label}
          </button>
        ))}
      </div>

      {error && <div className="card border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              [`${unitLabel}평균 칼로리`, kcal(avg.calorie), calPct != null ? `목표 ${calPct}%` : null],
              [`${unitLabel}평균 단백질`, g(avg.protein), goals.protein ? `목표 ${goals.protein}g` : null],
              [`${unitLabel}평균 탄수화물`, g(avg.carbohydrate), null],
              ['기록 일수', `${data.days.length}일`, null],
            ].map(([label, val, sub]) => (
              <div key={label} className="card p-3">
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-lg font-bold text-brand-dark">{val}</div>
                {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
              </div>
            ))}
          </div>

          <section className="card p-4">
            <h2 className="mb-3 font-bold">칼로리 ({GRANS.find((x) => x.v === gran).label}{gran !== 'day' ? ' 평균' : ''})</h2>
            {chart.length === 0 ? (
              <p className="text-sm text-gray-400">이 기간에 기록된 데이터가 없습니다.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  {goals.calorie && <ReferenceLine y={goals.calorie} stroke="#f0b429" strokeDasharray="4 4" label={{ value: '목표', fontSize: 10, fill: '#b07d0a' }} />}
                  <Line type="monotone" dataKey="calorie" name="칼로리" stroke="#2f6b3f" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="card p-4">
            <h2 className="mb-3 font-bold">단백질 (g)</h2>
            {chart.length === 0 ? (
              <p className="text-sm text-gray-400">데이터 없음</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  {goals.protein && <ReferenceLine y={goals.protein} stroke="#f0b429" strokeDasharray="4 4" />}
                  <Bar dataKey="protein" name="단백질" fill="#2f6b3f" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>
        </>
      )}
    </div>
  );
}
