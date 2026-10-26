"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/CartContext";

export default function Nav() {
  const { count } = useCart();

  return (
    <header className="border-b border-[var(--line)] bg-[var(--paper)]/85 backdrop-blur sticky top-0 z-30">
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" />

      <div className="max-w-6xl mx-auto flex items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden ring-1 ring-[var(--gold)]/40 shadow-sm transition group-hover:scale-105">
            <Image src="/logo.png" alt="Teraruim Tunisie" fill className="object-cover" sizes="56px" priority />
          </div>
          <div className="leading-tight hidden sm:block">
            <p className="font-display text-xl text-[var(--ink)] font-semibold tracking-tight">
              Tera<em className="text-[var(--gold-deep)]" style={{ fontStyle: "italic" }}>ruim</em>
            </p>
            <p className="text-[9px] uppercase tracking-[0.3em] text-[var(--ink-muted)]">
              Football Lifestyle 🇹🇳
            </p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm ml-6 text-[var(--ink-soft)]">
          <Link href="/" className="hover:text-[var(--coral)] transition relative group">
            Collection
            <span className="absolute -bottom-1 left-0 right-0 h-px bg-[var(--coral)] scale-x-0 group-hover:scale-x-100 transition origin-left" />
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/cart"
            className="relative inline-flex items-center gap-2 border border-[var(--line)] hover:border-[var(--coral)] bg-[var(--paper-deep)] rounded-lg px-3 sm:px-4 py-2 text-sm transition"
          >
            <span className="text-base">🛍</span>
            <span className="hidden sm:inline text-[var(--ink-soft)]">Panier</span>
            {count > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[var(--coral)] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 pulse-gold">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
