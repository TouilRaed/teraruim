"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

export type CartItem = { id: string; title: string; price: number; image: string; qty: number; shippingFee?: number | null };

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  add: (it: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "teraruim_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const add = useCallback((it: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((p) => p.id === it.id);
      if (found) return prev.map((p) => (p.id === it.id ? { ...p, qty: p.qty + qty } : p));
      return [...prev, { ...it, qty }];
    });
  }, []);
  const remove = useCallback((id: string) => setItems((p) => p.filter((x) => x.id !== id)), []);
  const setQty = useCallback((id: string, qty: number) => {
    setItems((p) => p.map((x) => (x.id === id ? { ...x, qty: Math.max(1, qty) } : x)));
  }, []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartCtx>(() => ({
    items,
    count: items.reduce((n, x) => n + x.qty, 0),
    total: items.reduce((n, x) => n + x.qty * x.price, 0),
    add, remove, setQty, clear,
  }), [items, add, remove, setQty, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be inside CartProvider");
  return v;
}
