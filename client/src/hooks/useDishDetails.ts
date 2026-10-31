import { useContext } from 'react';
import { DishDetailsContext } from '../context/dish-details-context';
export function useDishDetails() { return useContext(DishDetailsContext); }
