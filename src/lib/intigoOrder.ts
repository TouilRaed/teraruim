// Dispatch a stored order to Intigo (Partner V3 REST). Called when an admin
// flips an order to "ready_to_ship". Idempotent: skips if a NID already exists.

import { db } from "@/lib/db";
import { createParcel, intigoEnabled, resolveDestination, normalizeTnPhone } from "@/lib/intigo";

export type IntigoDispatch =
  | { ok: true; nid: string }
  | { ok: true; skipped: "disabled" | "already" }
  | { ok: false; reason: "not_found" | "no_city" | "bad_phone" | "error"; message?: string };

export async function dispatchOrderToIntigo(orderId: string): Promise<IntigoDispatch> {
  if (!intigoEnabled()) return { ok: true, skipped: "disabled" };

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { title: true } } } } },
  });
  if (!order) return { ok: false, reason: "not_found" };
  if (order.intigoNid) return { ok: true, skipped: "already" };

  const phone = normalizeTnPhone(order.shipPhone ?? "");
  if (!phone) {
    console.error("Intigo: unusable phone for order", orderId, order.shipPhone);
    await db.order.update({ where: { id: orderId }, data: { trackingStatus: "intigo_bad_phone" } });
    return { ok: false, reason: "bad_phone", message: order.shipPhone ?? "" };
  }

  // Free-text content summary. Inline add-ons (e.g. album) aren't OrderItem
  // rows, so they're pulled from the order's stored addOnsSummary — important
  // for album-only orders which have no OrderItem rows at all.
  const description = [
    ...order.items.map((it) => `${it.product?.title ?? it.productId} ×${it.qty}`),
    order.addOnsSummary ?? "",
  ].filter(Boolean).join(" | ");

  try {
    const dest = await resolveDestination(order.shipGovernorate ?? "", order.shipCity ?? "");
    if (!dest) {
      console.error("Intigo: unresolved region for order", orderId, order.shipGovernorate, order.shipCity);
      await db.order.update({ where: { id: orderId }, data: { trackingStatus: "intigo_no_city" } });
      return { ok: false, reason: "no_city" };
    }

    const res = await createParcel({
      name: order.guestName ?? "",
      phone,
      address: order.shipAddress ?? "",
      cityId: dest.cityId,
      districtId: dest.districtId,
      codTotal: order.total,
      description,
      cid: order.id,
    });
    await db.order.update({
      where: { id: orderId },
      data: { intigoNid: res.nid, trackingStatus: "created" },
    });
    return { ok: true, nid: res.nid };
  } catch (e) {
    console.error("Intigo create failed for order", orderId, (e as Error).message);
    await db.order.update({ where: { id: orderId }, data: { trackingStatus: "intigo_error" } });
    return { ok: false, reason: "error", message: (e as Error).message };
  }
}
