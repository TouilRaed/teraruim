import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const Item = z.object({
  productId: z.string().max(50),
  qty: z.number().int().positive().max(99),
});

const Body = z.object({
  sessionId: z.string().min(8).max(80),
  items: z.array(Item).min(1).max(50),
  name: z.string().max(80).optional(),
  phone: z.string().max(30).optional(),
  address1: z.string().max(200).optional(),
  governorate: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
});

export async function POST(req: Request) {
  const limit = rateLimit(`abandon:${clientIp(req)}`, 30, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many" }, { status: 429 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const { sessionId, items, name, phone, address1, governorate, city } = parsed.data;

  // Require at minimum a phone OR name to bother saving
  if (!phone && !name) return NextResponse.json({ ok: true, skipped: true });

  // Compute subtotal from product prices server-side
  const ids = items.map((i) => i.productId);
  const products = await db.product.findMany({ where: { id: { in: ids } } });
  const map = new Map(products.map((p) => [p.id, p]));
  let subtotal = 0;
  let shipping = 0;
  for (const it of items) {
    const p = map.get(it.productId);
    if (!p) continue;
    subtotal += p.price * it.qty;
    shipping += p.shippingFee ?? 0;
  }

  const total = subtotal + shipping;

  // Find existing abandoned order for this session — but only reuse it if
  // identity matches (phone or name). Otherwise a different person reusing
  // the same browser would overwrite the previous cart.
  const candidate = await db.order.findFirst({
    where: { sessionId, status: "cart_abandoned" },
    select: { id: true, shipPhone: true, guestName: true },
  });

  const identityMatches = (() => {
    if (!candidate) return false;
    // Reuse if previous row has no identity yet
    if (!candidate.shipPhone && !candidate.guestName) return true;
    // Reuse only if phone matches (when both sides have a phone)
    if (phone && candidate.shipPhone) return candidate.shipPhone === phone;
    // Phone missing on one side → fall back to name match
    if (name && candidate.guestName) return candidate.guestName === name;
    return false;
  })();

  const existing = identityMatches ? candidate : null;

  if (existing) {
    await db.order.update({
      where: { id: existing.id },
      data: {
        guestName: name ?? undefined,
        shipPhone: phone ?? undefined,
        shipAddress: address1 ?? undefined,
        shipGovernorate: governorate ?? undefined,
        shipCity: city ?? undefined,
        total,
      },
    });
    // Refresh items: delete + recreate
    await db.orderItem.deleteMany({ where: { orderId: existing.id } });
    await db.orderItem.createMany({
      data: items
        .filter((it) => map.has(it.productId))
        .map((it) => ({
          orderId: existing.id,
          productId: it.productId,
          qty: it.qty,
          price: map.get(it.productId)!.price,
        })),
    });
    return NextResponse.json({ ok: true, orderId: existing.id });
  }

  const order = await db.order.create({
    data: {
      sessionId,
      status: "cart_abandoned",
      total,
      guestName: name ?? null,
      shipPhone: phone ?? null,
      shipAddress: address1 ?? null,
      shipGovernorate: governorate ?? null,
      shipCity: city ?? null,
      items: {
        create: items
          .filter((it) => map.has(it.productId))
          .map((it) => ({
            productId: it.productId,
            qty: it.qty,
            price: map.get(it.productId)!.price,
          })),
      },
    },
  });

  return NextResponse.json({ ok: true, orderId: order.id, created: true });
}
