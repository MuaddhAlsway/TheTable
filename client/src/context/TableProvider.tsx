import { useState, type ReactNode } from 'react';
import { TableContext, type TableSession } from './table-session';
export default function TableProvider({ children }: { children: ReactNode }) {
  const [table, setTable] = useState<TableSession | null>(() => {
    try { const value = JSON.parse(sessionStorage.getItem('thetable.dining-table') || 'null'); return value && /^[a-f0-9]{48}$/.test(value.token) && typeof value.label === 'string' ? value : null; } catch { return null; }
  });
  function select(value: TableSession | null) {
    setTable(value);
    try { if (value) sessionStorage.setItem('thetable.dining-table', JSON.stringify(value)); else sessionStorage.removeItem('thetable.dining-table'); } catch { /* The current tab still works without storage. */ }
  }
  return <TableContext.Provider value={{ table, select }}>{children}</TableContext.Provider>;
}
