import { createContext, useContext } from 'react';
export type TableSession = { token: string; label: string };
export const TableContext = createContext<{ table: TableSession | null; select: (table: TableSession | null) => void }>({ table: null, select: () => {} });
export const useTableSession = () => useContext(TableContext);
