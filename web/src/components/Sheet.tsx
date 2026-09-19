import { useEffect, useId, useRef, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  /** Rendered between the header and the scrollable body. Stays pinned. */
  headerExtra?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Tailwind max-width class. Defaults to `max-w-[520px]`. */
  widthClass?: string;
  /** Viewport edge the sheet docks to. Defaults to `right`. */
  side?: "left" | "right";
}

// Focusable elements for the Tab trap, in DOM order.
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function Sheet({
  open,
  onClose,
  eyebrow,
  title,
  headerExtra,
  children,
  footer,
  widthClass = "max-w-[520px]",
  side = "right",
}: SheetProps) {
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  // Capture the trigger during render, before mounting autofocus children can
  // move focus inside the sheet. This also covers sheets mounted only while open.
  if (open && !wasOpenRef.current && typeof document !== "undefined") {
    openerRef.current = document.activeElement as HTMLElement | null;
  }
  wasOpenRef.current = open;

  // Escape closes the sheet; Tab/Shift+Tab keep focus inside it.
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(
        (el) =>
          el.getClientRects().length > 0 &&
          getComputedStyle(el).visibility !== "hidden"
      );
      if (focusables.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = active !== null && panel.contains(active);
      if (e.shiftKey && (!inside || active === first)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || active === last)) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Keep background content out of keyboard and assistive-technology
  // navigation while preserving the in-tree sheet itself.
  useEffect(() => {
    if (!open) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const restore: Array<{ element: HTMLElement; inert: boolean }> = [];
    let branch: HTMLElement = overlay;
    while (branch.parentElement) {
      const parent = branch.parentElement;
      for (const sibling of Array.from(parent.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          restore.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = parent;
      if (parent === document.body) break;
    }
    return () => {
      for (const { element, inert } of restore.reverse()) {
        element.inert = inert;
      }
    };
  }, [open]);

  // Move initial focus into the dialog and restore it to the trigger when the
  // sheet closes.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    // Children may focus a field on mount; only take focus when nothing
    // inside the sheet already has it.
    if (panel && !panel.contains(document.activeElement)) {
      panel.focus();
    }
    return () => {
      const opener = openerRef.current;
      if (opener && document.contains(opener)) {
        opener.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 h-dvh" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`absolute top-0 h-full w-full ${widthClass} ${
          side === "left" ? "left-0" : "right-0"
        } bg-surface shadow-[0_0_48px_rgba(0,0,0,0.4)] flex flex-col outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow && (
                <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted mb-1">
                  {eyebrow}
                </div>
              )}
              <h2 id={titleId} className="text-lg font-semibold text-text truncate">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-2 w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full text-text-dim hover:text-text hover:bg-bg transition-colors"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {headerExtra && <div className="mt-4">{headerExtra}</div>}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-border flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
