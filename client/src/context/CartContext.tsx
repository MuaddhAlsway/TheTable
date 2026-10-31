import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { MenuItem } from "../data/menuItems";
import { CartContext, type CartLine } from "./cart-context";

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartLine[]>([]);

  const addToCart = useCallback((item: MenuItem) => {
    setCartItems((current) => current.some((line) => line.item.id === item.id)
      ? current.map((line) => line.item.id === item.id ? { ...line, quantity: line.quantity + 1 } : line)
      : [...current, { item, quantity: 1 }]);
  }, []);
  const increaseQuantity = useCallback((itemId: MenuItem["id"]) => {
    setCartItems((current) => current.map((line) => line.item.id === itemId ? { ...line, quantity: line.quantity + 1 } : line));
  }, []);
  const decreaseQuantity = useCallback((itemId: MenuItem["id"]) => {
    setCartItems((current) => current.flatMap((line) => {
      if (line.item.id !== itemId) return [line];
      return line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : [];
    }));
  }, []);
  const removeItem = useCallback((itemId: MenuItem["id"]) => {
    setCartItems((current) => current.filter((line) => line.item.id !== itemId));
  }, []);

  const value = useMemo(() => ({
    cartItems, addToCart, increaseQuantity, decreaseQuantity, removeItem,
    totalQuantity: cartItems.reduce((total, line) => total + line.quantity, 0),
    subtotal: cartItems.reduce((total, line) => total + line.item.price * line.quantity, 0),
  }), [cartItems, addToCart, increaseQuantity, decreaseQuantity, removeItem]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
