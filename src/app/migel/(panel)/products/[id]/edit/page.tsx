import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ProductForm from "@/components/admin/ProductForm";
import ReviewsAdmin from "@/components/admin/ReviewsAdmin";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.product.findUnique({ where: { id } });
  if (!p) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Modifier produit</h1>
      <ProductForm initial={{
        id: p.id, title: p.title, description: p.description, price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        hidePrice: p.hidePrice,
        image: p.image,
        gallery: (() => {
          try {
            const arr = p.gallery ? JSON.parse(p.gallery) : [];
            return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
          } catch { return []; }
        })(),
        category: p.category, stock: p.stock, weight: p.weight, sku: p.sku ?? "",
        offers: (() => {
          try {
            const arr = p.offers ? JSON.parse(p.offers) : [];
            return Array.isArray(arr)
              ? arr.filter((o): o is { name?: string; qty: number; price: number } =>
                  o && typeof o.qty === "number" && typeof o.price === "number")
              : [];
          } catch { return []; }
        })(),
        singleLabel: p.singleLabel ?? null,
        hideSingle: p.hideSingle ?? false,
        shippingFee: p.shippingFee ?? null,
        addOnLabel: p.addOnLabel ?? null,
        addOnPrice: p.addOnPrice ?? null,
      }} />

      <div className="mt-8">
        <ReviewsAdmin productId={p.id} />
      </div>
    </div>
  );
}
