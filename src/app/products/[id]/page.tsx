import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";
import BuyForm from "@/components/BuyForm";
import ProductGallery from "@/components/ProductGallery";
import PriceTag from "@/components/PriceTag";
import ReviewsSection from "@/components/ReviewsSection";
import PixelViewContent from "@/components/PixelViewContent";

// ISR: serve cached HTML to ad traffic (near-instant), refresh every 60s.
// Admin product writes call revalidatePath to bust this immediately.
export const revalidate = 60;

// Without generateStaticParams a dynamic segment renders on every request and
// `revalidate` is ignored. Empty list = no build-time pages, but each product
// is rendered on first hit and then served from the ISR cache.
export async function generateStaticParams() {
  return [];
}

function parseGallery(raw: string | null, fallback: string): string[] {
  if (!raw) return [fallback];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.every((s) => typeof s === "string")) {
      const merged = [fallback, ...arr.filter((u) => u !== fallback)];
      return merged.slice(0, 10);
    }
  } catch { /* ignore */ }
  return [fallback];
}

function parseOffers(raw: string | null): { name?: string; qty: number; price: number }[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr.filter(
        (o) => o && typeof o.qty === "number" && o.qty >= 2 && typeof o.price === "number" && o.price > 0,
      );
    }
  } catch { /* ignore */ }
  return [];
}

// Detects Arabic glyphs for sizing
function hasArabic(s: string) { return /[؀-ۿ]/.test(s); }

// Split a bilingual title "FR — AR" or "AR · FR" so we can size them independently
function splitTitle(t: string): { latin: string; arabic: string } {
  // Try common separators
  const seps = ["—", "·", "·", "  "];
  for (const sep of seps) {
    const i = t.indexOf(sep);
    if (i > 0) {
      const a = t.slice(0, i).trim();
      const b = t.slice(i + sep.length).trim();
      if (hasArabic(a) && !hasArabic(b)) return { arabic: a, latin: b };
      if (hasArabic(b) && !hasArabic(a)) return { latin: a, arabic: b };
    }
  }
  if (hasArabic(t)) return { latin: "", arabic: t };
  return { latin: t, arabic: "" };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  if (!product) notFound();

  const addOn = product.addOnLabel && product.addOnPrice
    ? { label: product.addOnLabel, price: product.addOnPrice }
    : null;

  const images = parseGallery(product.gallery, product.image);
  // Per-product flag: hide price/discount/savings on landing page (price kept for COD checkout)
  const hidePrice = product.hidePrice;
  const { latin: titleLatin, arabic: titleArabic } = splitTitle(product.title);

  return (
    <div className="max-w-xl mx-auto">
      <PixelViewContent id={product.id} name={product.title} price={product.price} />

      {/* Product image */}
      <div>
        <ProductGallery title={product.title} images={images} />
      </div>

      {/* Title */}
      <div className="mt-6">
        {titleLatin && (
          <h1 className="font-display font-medium text-2xl md:text-3xl leading-[1.15] tracking-[-0.015em] text-[var(--ink)]"
              style={{ fontVariationSettings: '"SOFT" 50, "opsz" 80' }}>
            {titleLatin}
          </h1>
        )}
        {titleArabic && (
          <p className="font-arabic text-lg md:text-xl text-[var(--ink-soft)] mt-1 leading-snug" dir="rtl">
            {titleArabic}
          </p>
        )}
        {!titleLatin && !titleArabic && (
          <h1 className="font-display font-medium text-2xl md:text-3xl">{product.title}</h1>
        )}
      </div>

      {/* Price */}
      {!hidePrice && (
        <div className="mt-3">
          <PriceTag price={product.price} compareAt={product.compareAtPrice} size="lg" />
        </div>
      )}

      {/* Trust line — one compact row */}
      <p className="mt-4 text-sm text-[var(--ink-soft)] flex flex-wrap gap-x-4 gap-y-1">
        <span className="inline-flex items-center gap-1.5"><span className="text-[var(--mint)]">✓</span> Paiement à la livraison</span>
        <span className="inline-flex items-center gap-1.5"><span className="text-[var(--mint)]">✓</span> Livraison 24–72h</span>
        <span className="inline-flex items-center gap-1.5"><span className="text-[var(--mint)]">✓</span> Retour à la réception</span>
      </p>

      {/* Order form — flows directly on the page */}
      <div id="checkout" className="scroll-mt-24 mt-6">
        <BuyForm product={{ id: product.id, title: product.title, price: product.price, compareAtPrice: product.compareAtPrice, offers: parseOffers(product.offers), singleLabel: product.singleLabel, hideSingle: product.hideSingle, shippingFee: product.shippingFee }} addOn={addOn} />
        <div className="mt-4 flex justify-center">
          <AddToCartButton product={product} label="Ou ajouter au panier" />
        </div>
      </div>

      {/* Description */}
      <div className="mt-10">
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--ink-muted)] mb-3">Description</p>
        <p className="text-[15px] text-[var(--ink-soft)] whitespace-pre-line leading-relaxed">
          {product.description}
        </p>
      </div>

      <ReviewsSection productId={product.id} />
    </div>
  );
}
