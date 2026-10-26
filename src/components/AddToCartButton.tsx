"use client";

import { useState } from "react";
import { useCart } from "@/components/CartContext";
import { trackPixel } from "@/components/MetaPixel";

type P = { id: string; title: string; price: number; image: string; shippingFee?: number | null };

export default function AddToCartButton({ product, label = "+ Panier" }: { product: P; label?: string }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add(product, 1);
        trackPixel("AddToCart", {
          content_ids: [product.id],
          content_name: product.title,
          content_type: "product",
          value: product.price,
          currency: "TND",
        });
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="inline-flex items-center justify-center text-xs font-medium px-3 py-2 rounded-md border border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:bg-[var(--paper-sand)] transition"
    >
      {done ? "✓ Ajouté" : label}
    </button>
  );
}
