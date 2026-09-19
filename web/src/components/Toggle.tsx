interface ToggleProps {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus:outline-none focus:shadow-[0_0_0_3px_var(--color-primary-ring)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        aria-hidden="true"
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-surface shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-[3px]"
          }`}
        />
      </span>
    </button>
  );
}
