import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

// Sized by `rows` or by the caller's height/flex classes, never by a drag
// handle: manual resize would let the box grow past its container and push
// sibling helper text out of view.

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full resize-none rounded-lg border bg-surface-raised px-4 py-3 font-mono text-base leading-relaxed text-text outline-none transition-colors focus:border-border-focus focus:shadow-[0_0_0_3px_var(--color-primary-ring)] sm:text-sm ${error ? "border-danger" : "border-border"} ${className}`}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
export default Textarea;
