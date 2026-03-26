import React from 'react';

export type TableColumn<T> = {
  key: keyof T | string;
  label: string;
  headerClassName?: string;
  cellClassName?: string;
  render?: (row: T, index: number) => React.ReactNode;
};

export type TableProps<T extends Record<string, unknown>> = {
  columns: TableColumn<T>[];
  data: T[];
  rowKey?: (row: T, index: number) => React.Key;
  emptyText?: string;
  dense?: boolean;
  className?: string;
  tableClassName?: string;
  headerRowClassName?: string;
  bodyRowClassName?: string;
};

const renderCellValue = (value: unknown): React.ReactNode => {
  if (value === null || value === undefined) {
    return '';
  }

  if (React.isValidElement(value)) {
    return value;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  emptyText = 'No data',
  dense = false,
  className = '',
  tableClassName = '',
  headerRowClassName = '',
  bodyRowClassName = '',
}: TableProps<T>) {
  const cellPadding = dense ? 'px-4 py-3' : 'px-6 py-4';

  return (
    <div className={`w-full overflow-x-auto rounded-3xl border border-[var(--line-soft)] bg-white shadow-[var(--shadow-soft)] ${className}`.trim()}>
      <table className={`w-full text-left ${tableClassName}`.trim()}>
        <thead>
          <tr className={`border-b border-[var(--line-soft)] bg-[var(--bg-soft)] text-[0.68rem] uppercase tracking-[0.1em] text-[var(--ink-600)] ${headerRowClassName}`.trim()}>
            {columns.map(col => (
              <th
                key={String(col.key)}
                className={`whitespace-nowrap font-semibold ${cellPadding} ${col.headerClassName ?? ''}`.trim()}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className={`${cellPadding} text-center text-[var(--ink-500)]`} colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={rowKey ? rowKey(row, i) : i}
                className={`border-b border-[var(--line-soft)]/70 transition hover:bg-[var(--bg-soft)]/60 ${bodyRowClassName}`.trim()}
              >
                {columns.map(col => (
                  <td
                    key={String(col.key)}
                    className={`${cellPadding} text-sm text-[var(--ink-700)] ${col.cellClassName ?? ''}`.trim()}
                  >
                    {col.render ? col.render(row, i) : renderCellValue(row[col.key as keyof T])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
