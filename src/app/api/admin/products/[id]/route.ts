import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

// Bust ISR cache for every page that renders this product.
function revalidateProduct(id: string) {
  revalidatePath(`/products/${id}`);
  revalidatePath(`/buy/${id}`);
  revalidatePath("/");
}

const Patch = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().nullable().optional(),
  hidePrice: z.boolean().optional().default(false),
  image: z.string().max(500).refine((u) => u.startsWith("https://") || u.startsWith("/uploads/"), "Image must be https:// or uploaded"),
  gallery: z.array(z.string().max(500).refine((u) => u.startsWith("https://") || u.startsWith("/uploads/"))).max(10).optional().default([]),
  category: z.string().min(1).max(60),
  stock: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
  sku: z.string().max(50).nullable().optional(),
  offers: z.array(z.object({
    name: z.string().max(40).optional(),
    qty: z.number().int().min(2).max(99),
    price: z.number().positive(),
  })).max(5).optional().default([]),
  singleLabel: z.string().max(60).nullable().optional(),
  hideSingle: z.boolean().optional().default(false),
  shippingFee: z.number().nonnegative().nullable().optional(),
  addOnLabel: z.string().max(80).nullable().optional(),
  addOnPrice: z.number().positive().nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad input", issues: parsed.error.flatten() }, { status: 400 });

  const offerQtys = parsed.data.offers.map((o) => o.qty);
  if (new Set(offerQtys).size !== offerQtys.length) {
    return NextResponse.json({ error: "Offres en double (même quantité)" }, { status: 400 });
  }

  const p = await db.product.update({
    where: { id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      price: parsed.data.price,
      compareAtPrice: parsed.data.compareAtPrice ?? null,
      hidePrice: parsed.data.hidePrice,
      image: parsed.data.image,
      gallery: parsed.data.gallery.length ? JSON.stringify(parsed.data.gallery) : null,
      category: parsed.data.category,
      stock: parsed.data.stock,
      weight: parsed.data.weight,
      sku: parsed.data.sku ?? null,
      offers: parsed.data.offers.length ? JSON.stringify(parsed.data.offers) : null,
      singleLabel: parsed.data.singleLabel?.trim() || null,
      hideSingle: parsed.data.hideSingle && parsed.data.offers.length > 0,
      shippingFee: parsed.data.shippingFee != null ? parsed.data.shippingFee : null,
      addOnLabel: parsed.data.addOnLabel?.trim() && parsed.data.addOnPrice ? parsed.data.addOnLabel.trim() : null,
      addOnPrice: parsed.data.addOnLabel?.trim() && parsed.data.addOnPrice ? parsed.data.addOnPrice : null,
    },
  }).catch(() => null);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  revalidateProduct(id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  // Drop disposable references (abandoned-cart line items) so they don't block
  // the delete. OrderItem.product is a required FK (onDelete: Restrict), so any
  // remaining reference comes from a real order — refuse rather than silently
  // fail (the old `.catch(() => null)` returned ok:true while the row stayed).
  await db.orderItem.deleteMany({ where: { productId: id, order: { status: "cart_abandoned" } } });
  const realRefs = await db.orderItem.count({ where: { productId: id } });
  if (realRefs > 0) {
    return NextResponse.json(
      { error: "Produit lié à des commandes existantes — suppression impossible." },
      { status: 409 },
    );
  }

  const deleted = await db.product.delete({ where: { id } }).catch(() => null);
  if (!deleted) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  revalidateProduct(id);
  return NextResponse.json({ ok: true });
}
