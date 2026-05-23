import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { api } from '../lib/api';
import { kcal } from '../lib/format';

function ym() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export default function Stats() {
  const [units, setUnits] = useState([]);
  const [unitId, setUnitId] = useState(null);
  const [{ year, month }, setPeriod] = useState(ym());
  const [report, setReport] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listUnits().then((u) => { setUnits(u); if (u[0]) setUnitId(u[0].id); }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!unitId) return;
    setError('');
    Promise.all([
      api.unitReport(unitId, year, month),
      api.unitCoverage(unitId, year, month),
    ]).then(([r, c]) => { setReport(r); setCoverage(c); }).catch((e) => setError(e.message));
  }, [unitId, year, month]);

  const shiftMonth = (delta) => {
    let m = month + delta, y = year;
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    setPeriod({ year: y, month: m });
  };

  const chartData = (report?.stats || []).map((s) => ({
    date: s.date.slice(8),
    칼로리: Math.round(s.calorie),
    단백질: Math.round(s.protein),
    탄수화물: Math.round(s.carbohydrate),
    지방: Math.round(s.fat),
  }));

  const incompleteDays = (coverage?.days || []).filter((d) => !d.complete && d.filled.length > 0);
  const emptyDays = (coverage?.days || []).filter((d) => d.filled.length === 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="input w-auto" value={unitId || ''} onChange={(e) => setUnitId(Number(e.target.value))}>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <button className="btn-ghost px-3" onClick={() => shiftMonth(-1)}>‹</button>
          <span className="font-semibold">{year}년 {month}월</span>
          <button className="btn-ghost px-3" onClick={() => shiftMonth(1)}>›</button>
        </div>
      </div>

      {error && <div className="card border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['일평균 칼로리', kcal(report.monthly_average.calorie)],
              ['일평균 단백질', `${report.monthly_average.protein}g`],
              ['식단 작성일', `${report.days_with_meals}일`],
              ['총 끼니 수', `${report.meals_count}끼`],
            ].map(([label, val]) => (
              <div key={label} className="card p-3">
                <div className="text-xs text-gray-500">{label}</div>
                <div className="text-lg font-bold text-brand-dark">{val}</div>
              </div>
            ))}
          </div>

          <section className="card p-4">
            <h2 className="mb-3 font-bold">일별 칼로리 추이</h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-gray-400">이 달에 입력된 식단이 없습니다.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="칼로리" stroke="#2f6b3f" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </section>

          <section className="card p-4">
            <h2 className="mb-3 font-bold">일별 영양소 (g)</h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-gray-400">데이터 없음</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="단백질" fill="#2f6b3f" />
                  <Bar dataKey="탄수화물" fill="#9ccc9c" />
                  <Bar dataKey="지방" fill="#f0b429" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          {coverage && (
            <section className="card p-4">
              <h2 className="mb-3 font-bold">식단 작성 현황</h2>
              {emptyDays.length === 0 && incompleteDays.length === 0 ? (
                <p className="text-sm text-brand">✅ 이 달 모든 날짜의 3끼가 입력되었습니다.</p>
              ) : (
                <div className="space-y-1 text-sm">
                  {incompleteDays.map((d) => (
                    <div key={d.date} className="text-amber-700">
                      ⚠️ {d.date}: {d.missing.map((m) => ({ breakfast: '조식', lunch: '중식', dinner: '석식' }[m])).join(', ')} 누락
                    </div>
                  ))}
                  <div className="text-gray-400">미입력 {emptyDays.length}일 · 일부 누락 {incompleteDays.length}일</div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
