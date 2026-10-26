// Dispatch a stored order to ADEX. Called when an admin flips an order to
// "ready_to_ship" — not at checkout. Idempotent: skips if a barcode already
// exists, so re-saving the same status never creates a duplicate colis.

import { db } from "@/lib/db";
import { createColis, adexEnabled, adexCityCode } from "@/lib/adex";

export type AdexDispatch =
  | { ok: true; barcode: string; labelUrl: string }
  | { ok: true; skipped: "disabled" | "already" }
  | { ok: false; reason: "not_found" | "no_city" | "error"; message?: string };

export async function dispatchOrderToAdex(orderId: string): Promise<AdexDispatch> {
  if (!adexEnabled()) return { ok: true, skipped: "disabled" };

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { title: true } } } } },
  });
  if (!order) return { ok: false, reason: "not_found" };
  if (order.adexBarcode) return { ok: true, skipped: "already" };

  const ville = adexCityCode(order.shipGovernorate ?? "");
  if (ville == null) {
    console.error("ADEX: unresolved governorate for order", orderId, order.shipGovernorate);
    await db.order.update({ where: { id: orderId }, data: { trackingStatus: "adex_no_city" } });
    return { ok: false, reason: "no_city" };
  }

  // Free-text content summary. Inline add-ons (e.g. album) aren't OrderItem
  // rows, so they're pulled from the order's stored addOnsSummary — important
  // for album-only orders which have no OrderItem rows at all.
  const content = [
    ...order.items.map((it) => `${it.product?.title ?? it.productId} ×${it.qty}`),
    order.addOnsSummary ?? "",
  ].filter(Boolean).join(" | ");

  try {
    const res = await createColis({
      name: order.guestName ?? "",
      address: order.shipAddress ?? "",
      cityCode: ville,
      phone: order.shipPhone ?? "",
      content,
      codTotal: order.total,
      externalId: order.id,
      comment: `${order.shipGovernorate ?? ""} · ${order.shipCity ?? ""}`,
    });
    await db.order.update({
      where: { id: orderId },
      data: { adexBarcode: res.num_suivi_cmd, adexLabelUrl: res.url_bl, trackingStatus: "created" },
    });
    return { ok: true, barcode: res.num_suivi_cmd, labelUrl: res.url_bl };
  } catch (e) {
    console.error("ADEX create failed for order", orderId, (e as Error).message);
    await db.order.update({ where: { id: orderId }, data: { trackingStatus: "adex_error" } });
    return { ok: false, reason: "error", message: (e as Error).message };
  }
}
