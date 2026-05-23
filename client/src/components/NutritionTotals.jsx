import { kcal, g } from '../lib/format';

export default function NutritionTotals({ totals, title = '합계', goals }) {
  const t = totals || {};
  const items = [
    { label: '칼로리', value: kcal(t.calorie), key: 'calorie', raw: t.calorie },
    { label: '단백질', value: g(t.protein), key: 'protein', raw: t.protein },
    { label: '탄수화물', value: g(t.carbohydrate), key: 'carbohydrate', raw: t.carbohydrate },
    { label: '지방', value: g(t.fat), key: 'fat', raw: t.fat },
  ];
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-3">{title}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((it) => {
          const goal = goals?.[it.key];
          const pct = goal ? Math.min(100, Math.round((it.raw / goal) * 100)) : null;
          return (
            <div key={it.key} className="rounded-lg bg-brand-light px-3 py-3">
              <div className="text-xs text-gray-500">{it.label}</div>
              <div className="text-lg font-bold text-brand-dark">{it.value}</div>
              {goal != null && (
                <>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white">
                    <div
                      className="h-1.5 rounded-full bg-brand"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] text-gray-500">
                    목표 {it.key === 'calorie' ? `${goal}` : `${goal}g`} · {Math.round((it.raw / goal) * 100)}%
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
