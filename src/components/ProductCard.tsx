"use client";

import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";
import { discountPct } from "@/components/PriceTag";

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  hidePrice?: boolean;
  image: string;
  category: string;
};

export default function ProductCard({ product, num }: { product: Product; num?: number }) {
  const pct = product.hidePrice ? null : discountPct(product.price, product.compareAtPrice);

  return (
    <div className="sticker-card group relative">
      {num != null && (
        <span className="sticker-num">№ {String(num).padStart(3, "0")}</span>
      )}
      {pct !== null && (
        <span className="absolute top-2 right-2 z-10 badge-clay shadow">
          −{pct}%
        </span>
      )}
      <Link href={`/products/${product.id}`} className="block relative aspect-square bg-[var(--paper-deep)] overflow-hidden rounded-sm">
        <Image
          src={product.image}
          alt={product.title}
          fill
          className="object-cover group-hover:scale-[1.04] transition duration-500"
          sizes="(max-width: 640px) 100vw, 33vw"
        />
        <span className="absolute bottom-2 left-2 badge">{product.category}</span>
      </Link>

      <div className="p-5 flex flex-col flex-1">
        <Link
          href={`/products/${product.id}`}
          className="font-display text-lg leading-tight text-[var(--ink)] hover:text-[var(--clay)] transition line-clamp-2"
          style={{ fontVariationSettings: '"SOFT" 50, "opsz" 36' }}
        >
          {product.title}
        </Link>
        <p className="text-xs text-[var(--ink-muted)] mt-1.5 line-clamp-2 leading-relaxed">{product.description}</p>

        <div className="mt-auto pt-4 flex items-end justify-between gap-3 border-t border-[var(--line-soft)] mt-4">
          <div className="flex flex-col">
            {!product.hidePrice && (
              <>
                {product.compareAtPrice && pct !== null && (
                  <span className="text-xs text-[var(--ink-muted)] line-through leading-none">
                    {product.compareAtPrice.toFixed(2)} TND
                  </span>
                )}
                <span className="price-display text-2xl font-semibold text-[var(--clay)] leading-none mt-1">
                  {product.price.toFixed(2)} <span className="text-sm text-[var(--ink-muted)] font-normal">TND</span>
                </span>
              </>
            )}
          </div>
          <Link
            href={`/buy/${product.id}`}
            className="inline-flex items-center justify-center gap-2 bg-[var(--coral)] hover:bg-[var(--coral-deep)] text-white text-sm font-bold px-4 py-2.5 rounded-lg transition shadow-[0_4px_12px_-3px_rgba(255,90,121,0.5)]"
          >
            Acheter
            <span className="w-px h-3.5 bg-white/35" />
            <span className="font-arabic">شراء</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
