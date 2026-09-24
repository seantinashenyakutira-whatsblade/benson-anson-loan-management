'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';
import { Surface } from './surface';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  empty,
  onRowClick,
  sortKey,
  sortDir,
  onSort,
}: {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}) {
  if (loading) {
    return (
      <Surface variant="solid" className="overflow-hidden">
        <div className="space-y-2 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-surface-glass" />
          ))}
        </div>
      </Surface>
    );
  }

  if (data.length === 0) {
    return <>{empty ?? <div className="py-12 text-center text-text-muted">No data.</div>}</>;
  }

  return (
    <>
      {/* Desktop table */}
      <Surface variant="solid" className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface-solid">
            <tr className="border-b border-border-subtle text-text-muted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium ${col.sortable ? 'cursor-pointer select-none' : ''}`}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={String(row.id ?? i)}
                onClick={() => onRowClick?.(row)}
                className={`${onRowClick ? 'cursor-pointer hover:bg-surface-glass' : ''} border-b border-border-subtle/50 ${i % 2 === 0 ? '' : 'bg-surface-glass/30'}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-text-primary">
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.map((row, i) => (
          <Surface key={String(row.id ?? i)} variant="glass" className={`p-4 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(row)}>
            {columns.map((col) => (
              <div key={col.key} className="flex justify-between gap-2 py-1 text-sm">
                <span className="text-text-muted">{col.header}</span>
                <span className="text-right font-medium text-text-primary">{col.render ? col.render(row) : String(row[col.key] ?? '')}</span>
              </div>
            ))}
          </Surface>
        ))}
      </div>
    </>
  );
}
