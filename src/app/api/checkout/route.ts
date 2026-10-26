import { NextResponse, after } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { signOrder } from "@/lib/orderToken";
import { sheetsEnabled, appendOrderRow } from "@/lib/sheets";
import { sendCapi, capiEnabled } from "@/lib/metaCapi";
import { notifyAdmins } from "@/lib/expoPush";
import { offerHasFreeShipping } from "@/lib/shipping";

const MAX_ITEMS_PER_ORDER = 50;
const MAX_QTY_PER_ITEM = 99;

const Item = z.object({
  productId: z.string().max(50),
  // qty 0 is allowed only for an add-on-only line (e.g. buy just the album, no sticker)
  qty: z.number().int().nonnegative().max(MAX_QTY_PER_ITEM),
  offerPrice: z.number().positive().optional(),
  addOn: z.boolean().optional(),
}).refine((it) => it.qty > 0 || it.addOn === true, {
  message: "qty 0 requires addOn",
});

const Body = z.object({
  items: z.array(Item).min(1).max(MAX_ITEMS_PER_ORDER),
  name: z.string().min(1).max(80),
  phone: z.string().min(6).max(30),
  address1: z.string().min(2).max(200),
  governorate: z.string().min(1).max(80),
  city: z.string().min(1).max(80),
  sessionId: z.string().min(8).max(80).optional(),
  pixelEventId: z.string().min(8).max(80).optional(),
});

export async function POST(req: Request) {
  const limit = rateLimit(`checkout:${clientIp(req)}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Trop de requêtes" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

  const { items, name, phone, address1, governorate, city, sessionId, pixelEventId } = parsed.data;

  // Convert: drop this browser-session's abandoned cart(s) now that it became a
  // real order. Keyed on sessionId only — phone may not have been persisted yet
  // (abandon save is debounced), so matching on phone would orphan the row.
  if (sessionId) {
    await db.order.deleteMany({
      where: { sessionId, status: "cart_abandoned" },
    }).catch(() => null);
  }

  const ids = items.map((i) => i.productId);
  const products = await db.product.findMany({ where: { id: { in: ids } } });
  const map = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  let shippingTotal = 0; // per-product delivery fee, once per distinct product line
  const orderItems: { productId: string; qty: number; price: number }[] = [];
  const addOnSummaries: string[] = []; // inline add-ons (not catalog products → no OrderItem row)
  const offerLabels: string[] = [];    // which offer/pack each line uses (for the sheet)
  let albumBought = false;             // any line chose its inline add-on
  for (const it of items) {
    const p = map.get(it.productId);
    if (!p) return NextResponse.json({ error: `Produit introuvable: ${it.productId}` }, { status: 400 });

    // Default: normal unit price × qty.
    let lineTotal = p.price * it.qty;
    let unitPrice = p.price;
    // Human label of the chosen offer — defaults to the standard single-unit option.
    let offerLabel = p.singleLabel?.trim() || "1 pièce";
    let freeShipping = false;

    // If the client claims an offer price, it must exactly match a declared
    // offer for this product (same qty + same total). Never trust client price.
    if (it.offerPrice != null) {
      let productOffers: { qty: number; price: number; name?: string }[] = [];
      try {
        const arr = p.offers ? JSON.parse(p.offers) : [];
        if (Array.isArray(arr)) productOffers = arr;
      } catch { /* ignore */ }
      const match = productOffers.find(
        (o) => o.qty === it.qty && Math.abs(o.price - it.offerPrice!) <= 0.01,
      );
      if (!match) return NextResponse.json({ error: "Offre invalide" }, { status: 400 });
      lineTotal = match.price;
      unitPrice = match.price / it.qty;
      offerLabel = match.name?.trim() || `Pack ${it.qty} (${match.price} TND)`;
      freeShipping = offerHasFreeShipping(productOffers, it.qty);
    }

    // qty 0 = add-on-only line (no sticker): contributes no product line/price.
    if (it.qty > 0) {
      subtotal += lineTotal;
      if (!freeShipping) shippingTotal += p.shippingFee ?? 0;
      offerLabels.push(offerLabel);
      orderItems.push({ productId: p.id, qty: it.qty, price: unitPrice });
    }

    // Inline add-on (e.g. album): priced from the product itself, never the
    // client. It's not a catalog product, so it rides in the order total and
    // the ADEX content summary — no OrderItem row (FK requires a real product).
    if (it.addOn && p.addOnLabel && p.addOnPrice && p.addOnPrice > 0) {
      subtotal += p.addOnPrice;
      addOnSummaries.push(`${p.addOnLabel} ×1 (${p.addOnPrice} TND)`);
      albumBought = true;
      // Album-only line (no sticker): still pays the product's delivery fee once.
      if (it.qty === 0) shippingTotal += p.shippingFee ?? 0;
    }
  }

  const order = await db.order.create({
    data: {
      userId: null,
      guestName: name,
      guestEmail: null,
      total: subtotal + shippingTotal,
      status: "pending",
      addOnsSummary: addOnSummaries.length ? addOnSummaries.join(" | ") : null,
      sessionId: sessionId ?? null,
      shipAddress: address1,
      shipCity: city,
      shipGovernorate: governorate,
      shipPhone: phone,
      items: { create: orderItems },
    },
  });

  // Human-readable line summary — reused for the ADEX content field and the sheet.
  const productSummary = orderItems
    .map((it) => `${map.get(it.productId)?.title ?? it.productId} ×${it.qty} (${(it.price * it.qty).toFixed(2)} TND)`)
    .concat(addOnSummaries)
    .join(" | ");

  // ADEX colis is NOT created here. Orders land as "pending"; an admin must
  // flip the order to "ready_to_ship" in the panel, which triggers the ADEX
  // dispatch (see src/lib/adexOrder.ts via /api/admin/orders/[id]).

  if (sheetsEnabled()) {
    const row = [
      new Date().toISOString(),
      order.id,
      name,
      phone,
      governorate,
      city,
      address1,
      productSummary,
      orderItems.reduce((s, i) => s + i.qty, 0),
      subtotal,
      shippingTotal,
      subtotal + shippingTotal,
      "pending",
      offerLabels.join(" | "),       // N — Offre choisie
      albumBought ? "Oui" : "Non",   // O — Album acheté
    ];
    // Google Sheets API is slow — append after the response, not in the
    // customer's critical path.
    after(() => appendOrderRow(row).catch((e) => console.error("Sheets append failed:", (e as Error).message)));
  }

  // Meta Conversions API — server-side Purchase event (survives ad blockers).
  // Runs via after() so it reliably completes after the response on Vercel
  // (a bare fire-and-forget promise can be frozen once the response returns)
  // without adding any latency to the customer's checkout.
  if (capiEnabled()) {
    const cookieHeader = req.headers.get("cookie") ?? "";
    const fbp = cookieHeader.match(/_fbp=([^;]+)/)?.[1] ?? null;
    const fbc = cookieHeader.match(/_fbc=([^;]+)/)?.[1] ?? null;
    const referer = req.headers.get("referer") ?? process.env.SITE_URL ?? "https://teraruim.vercel.app";
    const ua = req.headers.get("user-agent");
    const ip = clientIp(req);
    after(() =>
      sendCapi({
        eventName: "Purchase",
        eventId: pixelEventId ?? order.id,
        eventSourceUrl: referer,
        user: { phone, name, ip, userAgent: ua, fbp, fbc },
        value: subtotal + shippingTotal,
        currency: "TND",
        contentIds: ids,
        contents: items.map((i) => ({ id: i.productId, quantity: i.qty })),
      }).catch(() => null),
    );
  }

  // Notify admin mobile devices — after the response, guaranteed to run.
  after(() =>
    notifyAdmins({
      title: "🛒 Nouvelle commande",
      body: `${name} — ${(subtotal + shippingTotal).toFixed(2)} TND`,
      data: { type: "new_order", orderId: order.id },
    }).catch(() => null),
  );

  return NextResponse.json({ ok: true, orderId: order.id, token: signOrder(order.id) });
}
