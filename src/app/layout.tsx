import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import MetaPixel from "@/components/MetaPixel";
import PixelRouteTracker from "@/components/PixelRouteTracker";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Self-hosted woff2 (latin + arabic subsets only — no Google request, no
// cyrillic/greek/viet dead weight). Variable files for display + body.
// Oswald — bold condensed sporty sans for headings (jersey / football
// lifestyle register). Variable weight axis.
const oswald = localFont({
  src: "./fonts/Oswald-latin-var.woff2",
  variable: "--font-fraunces",
  weight: "300 700",
  display: "swap",
});
const interTight = localFont({
  src: "./fonts/InterTight-latin-var.woff2",
  variable: "--font-inter-tight",
  weight: "400 700",
  display: "swap",
});
const tajawal = localFont({
  src: [
    { path: "./fonts/Tajawal-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/Tajawal-arabic-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/Tajawal-arabic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Teraruim Tunisie — Stickers Panini Coupe du Monde 2026 · Livraison partout en Tunisie",
  description: "Teraruim Tunisie — stickers Panini Mondial 2026 🇹🇳. Packs, albums, équipes. Livraison partout, paiement à la livraison.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${oswald.variable} ${interTight.variable} ${tajawal.variable} h-full antialiased`}>
      <head>
        {/* Warm the TLS connection for the async Pixel — non-blocking. */}
        <link rel="preconnect" href="https://connect.facebook.net" />
        <link rel="dns-prefetch" href="https://www.facebook.com" />
        <MetaPixel />
      </head>
      <body className="min-h-full flex flex-col">
        <SpeedInsights />
        <PixelRouteTracker />
        <Providers>
          <Nav />
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>
          <footer className="bg-[var(--paper-deep)] text-[var(--ink)] mt-16 border-t border-[var(--line)]">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" />
            <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-8">
              <div>
                <p className="font-display text-2xl text-[var(--gold)] font-semibold">Teraruim Tunisie</p>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)] mt-1">Football Lifestyle · Mondial 2026</p>
                <p className="text-sm text-[var(--ink-soft)] mt-3 max-w-xs">
                  Packs, albums, équipes. Livraison partout en Tunisie 🇹🇳. Paiement à la réception.
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Service</p>
                <ul className="mt-3 space-y-1 text-sm text-[var(--ink-soft)]">
                  <li>Paiement à la livraison</li>
                  <li>Retour possible à la réception</li>
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">Contactez-nous · اتصل بنا</p>
                <p className="font-display text-lg text-[var(--ink)] mt-3">Teraruim Tunisie</p>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)] mt-5">Suivez-nous · تابعنا على</p>
                <div className="flex items-center gap-3 mt-3">
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--on-gold)] hover:bg-[var(--coral)] hover:border-[var(--coral)] transition"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898v-2.89h2.54V9.797c0-2.507 1.492-3.892 3.777-3.892 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                  </a>
                  <a
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--on-gold)] hover:bg-[var(--coral)] hover:border-[var(--coral)] transition"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.741 0 8.332.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.332 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
            <div className="border-t border-[var(--line)] py-4 text-center text-[11px] tracking-wider uppercase text-[var(--ink-muted)]">
              © {new Date().getFullYear()} Teraruim Tunisie · Collectionnez le Mondial
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
