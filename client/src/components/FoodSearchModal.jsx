import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { kcal } from '../lib/format';

export default function FoodSearchModal({ open, onClose, onSelect, allowCustom = false }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(100);
  const [loading, setLoading] = useState(false);
  const [custom, setCustom] = useState(null); // {name, calorie, protein, carbohydrate, fat}
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ(''); setResults([]); setSelected(null); setQuantity(100); setCustom(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { setResults(await api.searchFoods(q.trim())); }
      catch { setResults([]); }
      finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  if (!open) return null;

  const confirm = () => {
    if (custom) {
      if (!custom.name) return;
      onSelect({ custom: { ...custom }, quantity: Number(quantity) || 100 });
    } else if (selected) {
      onSelect({ food: selected, quantity: Number(quantity) || 100 });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div className="card w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-b-none sm:rounded-xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">음식 추가</h2>
          <button className="text-gray-400 text-2xl leading-none" onClick={onClose}>×</button>
        </div>

        {!custom && (
          <>
            <input
              ref={inputRef}
              className="input mb-3"
              placeholder="음식 검색 (예: 라면, 밥)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setSelected(null); }}
            />
            <div className="space-y-1 mb-3 max-h-56 overflow-y-auto">
              {loading && <p className="text-sm text-gray-400 p-2">검색 중…</p>}
              {!loading && q.trim() && results.length === 0 && (
                <p className="text-sm text-gray-400 p-2">검색 결과가 없습니다.</p>
              )}
              {results.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelected(f)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                    selected?.id === f.id ? 'bg-brand text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  <span>{f.name}</span>
                  <span className={selected?.id === f.id ? 'text-white/80' : 'text-gray-400'}>
                    {kcal(f.calorie)}/100g
                  </span>
                </button>
              ))}
            </div>
            {allowCustom && (
              <button
                className="mb-3 text-sm text-brand underline"
                onClick={() => setCustom({ name: q, calorie: '', protein: '', carbohydrate: '', fat: '' })}
              >
                + 목록에 없음 — 직접 입력하기
              </button>
            )}
          </>
        )}

        {custom && (
          <div className="mb-3 space-y-2">
            <input className="input" placeholder="음식 이름 (예: PX 라면)" value={custom.name}
              onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              {[['calorie', '칼로리(100g당)'], ['protein', '단백질(g)'], ['carbohydrate', '탄수화물(g)'], ['fat', '지방(g)']].map(([k, label]) => (
                <input key={k} type="number" inputMode="decimal" className="input" placeholder={label}
                  value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })} />
              ))}
            </div>
            <button className="text-xs text-gray-400 underline" onClick={() => setCustom(null)}>← 검색으로 돌아가기</button>
          </div>
        )}

        {(selected || custom) && (
          <div className="mb-3 flex items-center gap-2">
            <label className="text-sm text-gray-600">수량</label>
            <input type="number" inputMode="numeric" className="input w-28" value={quantity}
              onChange={(e) => setQuantity(e.target.value)} />
            <span className="text-sm text-gray-500">g</span>
          </div>
        )}

        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={!selected && !(custom && custom.name)} onClick={confirm}>추가</button>
          <button className="btn-ghost" onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
}
