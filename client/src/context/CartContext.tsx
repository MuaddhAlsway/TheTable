import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { MenuItem } from '../data/menuItems';
import { CartContext, type CartLine } from './cart-context';
import { useBackendAuth } from '../hooks/useBackendAuth';
import { accountCartKey, GUEST_CART_KEY, mergeCartLines, readCart, writeCart } from '../lib/cartStorage';

function ScopedCartProvider({ children, storageKey }: { children: ReactNode; storageKey: string | null }) {
  const [initial] = useState(() => {
    const guest = storageKey && storageKey !== GUEST_CART_KEY ? readCart(GUEST_CART_KEY) : [];
    return { items: mergeCartLines(readCart(storageKey), guest), importGuest: guest.length > 0 };
  });
  const [cartItems, setCartItems] = useState<CartLine[]>(initial.items);
  const guestImportPending = useRef(initial.importGuest);
  useEffect(() => {
    if (!storageKey) return;
    writeCart(storageKey, cartItems, guestImportPending.current);
    guestImportPending.current = false;
  }, [cartItems, storageKey]);
  useEffect(() => {
    if (!storageKey) return;
    const sync = (event: StorageEvent) => { if (event.storageArea === window.localStorage && (event.key === storageKey || event.key === null)) setCartItems(readCart(storageKey)); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [storageKey]);
  const addToCart = useCallback((item: MenuItem) => {
    setCartItems(current => current.some(line => line.item.id === item.id)
      ? current.map(line => line.item.id === item.id ? { ...line, quantity: Math.min(99, line.quantity + 1) } : line)
      : current.length < 50 ? [...current, { item, quantity: 1 }] : current);
  }, []);
  const increaseQuantity = useCallback((itemId: MenuItem['id']) => { setCartItems(current => current.map(line => line.item.id === itemId ? { ...line, quantity: Math.min(99, line.quantity + 1) } : line)); }, []);
  const decreaseQuantity = useCallback((itemId: MenuItem['id']) => {
    setCartItems(current => current.flatMap(line => line.item.id !== itemId ? [line] : line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : []));
  }, []);
  const removeItem = useCallback((itemId: MenuItem['id']) => { setCartItems(current => current.filter(line => line.item.id !== itemId)); }, []);
  const clearPurchasedItems = useCallback((items: { menuItemId: string; quantity: number }[]) => {
    // Only clear the matching checkout bag; preserve any bag edited since checkout.
    setCartItems(current => current.length === items.length && current.every(line => items.some(item => item.menuItemId === line.item.id && item.quantity === line.quantity)) ? [] : current);
  }, []);
  const value = useMemo(() => ({ cartItems, addToCart, increaseQuantity, decreaseQuantity, removeItem, clearPurchasedItems, totalQuantity: cartItems.reduce((total, line) => total + line.quantity, 0), subtotal: cartItems.reduce((total, line) => total + line.item.price * line.quantity, 0) }), [cartItems, addToCart, increaseQuantity, decreaseQuantity, removeItem, clearPurchasedItems]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function CartProvider({ children }: { children: ReactNode }) {
  const auth = useBackendAuth();
  const storageKey = !auth.loaded ? null : auth.userId ? accountCartKey(auth.userId) : GUEST_CART_KEY;
  // Account changes remount the cart state, preventing one customer's cart leaking to another.
  return <ScopedCartProvider key={storageKey || 'auth-loading'} storageKey={storageKey}>{children}</ScopedCartProvider>;
}
