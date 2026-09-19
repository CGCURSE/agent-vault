export default function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex w-full flex-wrap gap-1 rounded-lg border border-border bg-bg p-1 sm:inline-flex sm:w-auto"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`min-h-11 flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
              active
                ? "border-border bg-surface-raised text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
