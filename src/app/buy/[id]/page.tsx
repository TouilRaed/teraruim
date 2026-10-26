import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import BuyForm from "@/components/BuyForm";
import PriceTag from "@/components/PriceTag";
import ReviewsSection from "@/components/ReviewsSection";

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

// ISR: serve cached HTML to ad traffic (near-instant), refresh every 60s.
// Admin product writes call revalidatePath to bust this immediately.
export const revalidate = 60;

// Without generateStaticParams a dynamic segment renders on every request and
// `revalidate` is ignored. Empty list = no build-time pages, but each product
// is rendered on first hit and then served from the ISR cache.
export async function generateStaticParams() {
  return [];
}

export default async function BuyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await db.product.findUnique({ where: { id } });
  if (!product) notFound();

  const addOn = product.addOnLabel && product.addOnPrice
    ? { label: product.addOnLabel, price: product.addOnPrice }
    : null;

  return (
    <div className="max-w-3xl mx-auto"><div className="grid md:grid-cols-2 gap-6">
      {/* Compact summary on top for mobile, side on desktop */}
      <div className="md:order-1 order-1 card p-3 md:p-4 flex md:block items-center gap-3">
        <div className="relative w-24 h-24 md:w-full md:aspect-square md:h-auto md:mb-3 flex-shrink-0">
          <Image src={product.image} alt={product.title} fill priority className="object-cover rounded-lg" sizes="(max-width: 768px) 96px, 50vw" />
        </div>
        <div className="md:mt-0 flex-1 min-w-0">
          <span className="badge">{product.category}</span>
          <Link href={`/products/${product.id}`} className="block mt-1 md:mt-2 font-semibold hover:underline line-clamp-2 text-sm md:text-base">
            {product.title}
          </Link>
          <p className="hidden md:block text-sm text-zinc-500 line-clamp-3 mt-1">{product.description}</p>
          <div className="mt-2">
            <PriceTag price={product.price} compareAt={product.compareAtPrice} size="sm" />
          </div>
        </div>
      </div>

      {/* Form — visible above fold on mobile */}
      <div className="md:order-2 order-2">
        <h1 className="text-xl md:text-2xl font-bold mb-3">إتمام الطلب · Checkout</h1>
        <BuyForm product={{ id: product.id, title: product.title, price: product.price, compareAtPrice: product.compareAtPrice, offers: parseOffers(product.offers), singleLabel: product.singleLabel, hideSingle: product.hideSingle, shippingFee: product.shippingFee }} addOn={addOn} />
        <p className="text-xs text-zinc-500 mt-3">💵 الدفع عند الاستلام · Paiement à la livraison</p>
      </div>
    </div>

    <ReviewsSection productId={product.id} />
    </div>
  );
}
