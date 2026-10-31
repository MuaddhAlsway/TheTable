import { createContext } from 'react';
import type { MenuItem } from '../data/menuItems';
export const DishDetailsContext = createContext<{ openDish: (item: MenuItem) => void }>({ openDish: () => {} });
