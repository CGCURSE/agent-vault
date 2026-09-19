import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-lg border bg-surface-raised px-4 py-3 text-base text-text outline-none transition-colors focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-primary-ring)] sm:text-sm ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
export default Input;
