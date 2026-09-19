import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  render: (item: T, index: number) => ReactNode;
  align?: "left" | "right";
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (item: T, index: number) => string | number;
  onRowClick?: (item: T, index: number) => void;
  renderMobileItem?: (item: T, index: number) => ReactNode;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  renderMobileItem,
  emptyTitle = "No data",
  emptyDescription,
}: DataTableProps<T>) {
  const emptyState = (
    <div className="px-4 py-12 text-center sm:py-16">
      <div className="mx-auto max-w-[360px]">
        <div className="mb-1 text-base font-semibold text-text-muted">
          {emptyTitle}
        </div>
        {emptyDescription && (
          <div className="text-sm text-text-muted">
            {emptyDescription}
          </div>
        )}
      </div>
    </div>
  );

  const detailColumns = columns.filter((col) => col.header.trim() !== "");
  const actionColumns = columns.filter((col) => col.header.trim() === "");

  function defaultMobileItem(item: T, index: number) {
    return (
      <>
        <dl className="space-y-3">
          {detailColumns.map((col) => (
            <div key={col.key} className="min-w-0">
              <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                {col.header}
              </dt>
              <dd className="min-w-0 break-words text-sm text-text">
                {col.render(item, index)}
              </dd>
            </div>
          ))}
        </dl>
        {actionColumns.length > 0 && (
          <div className="mt-4 flex min-h-11 items-center justify-end gap-2 border-t border-border pt-3">
            {actionColumns.map((col) => (
              <div key={col.key}>{col.render(item, index)}</div>
            ))}
          </div>
        )}
      </>
    );
  }

  function activateMobileRow(item: T, index: number) {
    onRowClick?.(item, index);
  }

  return (
    <>
      <div className="md:hidden">
        {data.length === 0 ? (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {emptyState}
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) => (
              <article
                key={rowKey(item, index)}
                className={`overflow-hidden rounded-xl border border-border bg-surface p-4 transition-colors${onRowClick ? " cursor-pointer hover:bg-bg/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus" : ""}`}
                onClick={onRowClick ? () => activateMobileRow(item, index) : undefined}
                onKeyDown={onRowClick ? (event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    activateMobileRow(item, index);
                  }
                } : undefined}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {renderMobileItem
                  ? renderMobileItem(item, index)
                  : defaultMobileItem(item, index)}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider ${col.align === "right" ? "text-right w-0" : "text-left"}${col.className ? " " + col.className : ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-0">
                  {emptyState}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={rowKey(item, index)}
                  className={`border-b border-border last:border-b-0 hover:bg-bg/50 transition-colors${onRowClick ? " cursor-pointer" : ""}`}
                  onClick={onRowClick ? () => onRowClick(item, index) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-5 py-3.5${col.align === "right" ? " w-0" : ""}${col.className ? " " + col.className : ""}`}>
                      {col.align === "right" ? (
                        <div className="flex justify-end">{col.render(item, index)}</div>
                      ) : (
                        col.render(item, index)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
