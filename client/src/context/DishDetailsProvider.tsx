import { useCallback, useState, type ReactNode } from 'react';
import type { MenuItem } from '../data/menuItems';
import { DishDetailsContext } from './dish-details-context';
import DishDetails from '../components/menu/DishDetails';
export default function DishDetailsProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<MenuItem | null>(null);
  const openDish = useCallback((item: MenuItem) => setSelected(item), []);
  const close = useCallback(() => setSelected(null), []);
  return <DishDetailsContext.Provider value={{ openDish }}>{children}{selected && <DishDetails key={selected.id} item={selected} onClose={close} />}</DishDetailsContext.Provider>;
}
