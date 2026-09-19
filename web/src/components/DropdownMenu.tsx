import { useState, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface DropdownMenuItem {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: "danger";
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  /** Width of the dropdown in pixels. Defaults to 128. */
  width?: number;
}

export default function DropdownMenu({ items, width = 128 }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width });

  useLayoutEffect(() => {
    if (!open) return;
    function positionMenu() {
      const button = btnRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const menuWidth = Math.min(width, Math.max(0, window.innerWidth - 16));
      const estimatedHeight = items.length * 44 + 8;
      const top = rect.bottom + 4 + estimatedHeight <= window.innerHeight
        ? rect.bottom + 4
        : Math.max(8, rect.top - estimatedHeight - 4);
      const left = Math.min(
        Math.max(8, rect.right - menuWidth),
        Math.max(8, window.innerWidth - menuWidth - 8),
      );
      setPos({ top, left, width: menuWidth });
    }
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    positionMenu();
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", positionMenu);
    window.addEventListener("scroll", positionMenu, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", positionMenu);
      window.removeEventListener("scroll", positionMenu, true);
    };
  }, [items.length, open, width]);

  function toggle() {
    setOpen((value) => !value);
  }

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label="Open actions"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-text-dim transition-colors hover:bg-bg hover:text-text"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-50 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={async () => {
                  setOpen(false);
                  await item.onClick();
                }}
                className={`min-h-11 w-full px-4 py-2.5 text-left text-sm transition-colors ${
                  item.variant === "danger"
                    ? "text-danger hover:bg-danger-bg"
                    : "text-text hover:bg-bg"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
