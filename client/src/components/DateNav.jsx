import { shiftDate, formatDateKo } from '../lib/format';

export default function DateNav({ date, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <button className="btn-ghost px-3" onClick={() => onChange(shiftDate(date, -1))}>‹</button>
      <div className="relative">
        <input
          type="date"
          className="input w-[180px] text-center"
          value={date}
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      </div>
      <button className="btn-ghost px-3" onClick={() => onChange(shiftDate(date, 1))}>›</button>
      <span className="hidden text-sm text-gray-500 sm:inline">{formatDateKo(date)}</span>
    </div>
  );
}
