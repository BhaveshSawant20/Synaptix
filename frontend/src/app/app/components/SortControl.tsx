"use client";

import { SORT_OPTIONS, SortOption } from "@/lib/sorting";

export type { SortOption };
export { SORT_OPTIONS };

export type SortControlProps = {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
  label?: string;
  options?: Array<{ value: SortOption; label: string }>;
};

export default function SortControl({
  value,
  onChange,
  className = "",
  label = "Sort by:",
  options = SORT_OPTIONS,
}: SortControlProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {label && (
        <span className="text-xs font-semibold text-stone-500 whitespace-nowrap">
          {label}
        </span>
      )}

      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as SortOption)}
          aria-label={label || "Sort records"}
          className="h-10 appearance-none rounded-xl border border-stone-200 bg-white pl-3.5 pr-8 text-xs font-medium text-stone-800 shadow-sm outline-none transition duration-150 hover:border-orange-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-100/60 cursor-pointer"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">
          ▼
        </span>
      </div>
    </div>
  );
}
