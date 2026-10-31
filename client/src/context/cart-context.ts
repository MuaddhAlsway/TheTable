import { createContext } from "react";
import type { MenuItem } from "../data/menuItems";

export type CartLine = { item: MenuItem; quantity: number };
export type CartContextValue = {
  cartItems: CartLine[];
  addToCart: (item: MenuItem) => void;
  increaseQuantity: (itemId: MenuItem["id"]) => void;
  decreaseQuantity: (itemId: MenuItem["id"]) => void;
  removeItem: (itemId: MenuItem["id"]) => void;
  clearPurchasedItems: (items: { menuItemId: string; quantity: number }[]) => void;
  totalQuantity: number;
  subtotal: number;
};
export const CartContext = createContext<CartContextValue | undefined>(undefined);
