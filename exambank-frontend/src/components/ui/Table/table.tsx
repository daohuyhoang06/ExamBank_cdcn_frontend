import React from 'react';
import './table.css';

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
    <div className={`ui-table-wrapper ${className}`.trim()}>
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>No data</td></tr>
          ) : (
            data.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key}>{renderCellValue(row[col.key])}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
