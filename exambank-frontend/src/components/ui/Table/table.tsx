import React from 'react';

export type TableProps = {
  columns: { key: string; label: string }[];
  data: Record<string, unknown>[];
  className?: string;
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

export const Table: React.FC<TableProps> = ({ columns, data, className = '' }) => {
  return (
    <div className={`mb-6 w-full overflow-x-auto rounded-[var(--radius-lg)] bg-[var(--surface-container-highest)] p-4 ${className}`.trim()}>
      <table className="w-full border-separate border-spacing-y-[0.45rem] bg-transparent font-[var(--font-body)] text-[var(--body-md)]">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="whitespace-nowrap border-none bg-transparent px-[0.95rem] py-[0.78rem] text-left font-[var(--font-label)] text-[var(--label-sm)] font-semibold uppercase tracking-[0.08em] text-[var(--on-surface-variant)]"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="px-[0.95rem] py-[0.78rem] text-center text-[var(--color-muted)]" colSpan={columns.length}>
                No data
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="group">
                {columns.map(col => (
                  <td
                    key={col.key}
                    className="border-none bg-[var(--surface-container-lowest)] px-[0.95rem] py-[0.78rem] text-left text-[var(--on-surface)] first:rounded-l-[var(--radius-md)] last:rounded-r-[var(--radius-md)] group-hover:bg-[var(--surface-container-low)]"
                  >
                    {renderCellValue(row[col.key])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
