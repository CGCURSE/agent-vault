import type { ReactNode } from "react";

/** A "?" chip that reveals its content on hover/focus. */
export default function InfoTooltip({ children }: { children: ReactNode }) {
  return (
    <span className="relative group inline-flex">
      <span
        tabIndex={0}
        aria-label="More info"
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-text-dim text-text-dim cursor-help normal-case font-normal text-[10px] leading-none focus:outline-none focus:border-text-muted focus:text-text-muted hover:border-text-muted hover:text-text-muted"
      >
        ?
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-md border border-border bg-surface-raised px-3 py-2 text-xs font-normal leading-snug tracking-normal text-text-muted normal-case opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100 sm:left-0 sm:w-72 sm:translate-x-0"
      >
        {children}
      </span>
    </span>
  );
}
