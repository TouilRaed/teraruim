import { NextResponse, after } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdminRequest, ORDER_STATUSES } from "@/lib/admin-auth";
import { clientIp } from "@/lib/rateLimit";
import { dispatchOrderToIntigo } from "@/lib/intigoOrder";

const Patch = z.object({
  status: z.enum(ORDER_STATUSES),
});

// Editable shipping/contact details. Governorate/delegation are free-text (same
// as checkout) — dispatch resolves them against Intigo's live region list, so
// they are not constrained to a fixed enum.
const EditBody = z.object({
  guestName: z.string().trim().min(1).max(80),
  shipPhone: z.string().trim().min(6).max(30),
  shipGovernorate: z.string().trim().min(1).max(80),
  shipCity: z.string().trim().min(1).max(80),
  shipAddress: z.string().trim().min(2).max(200),
  total: z.number().nonnegative().max(100000),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const existing = await db.order.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status === parsed.data.status) {
    // Re-saving "ready_to_ship" retries the courier dispatch (idempotent:
    // skips when the order already has an Intigo NID). Runs after the response
    // so the admin isn't blocked on the courier API.
    if (parsed.data.status === "ready_to_ship") {
      after(() => dispatchOrderToIntigo(id));
    }
    return NextResponse.json({ ok: true, unchanged: true });
  }

  await db.$transaction([
    db.order.update({ where: { id }, data: { status: parsed.data.status } }),
    db.orderAudit.create({
      data: {
        orderId: id,
        fromStatus: existing.status,
        toStatus: parsed.data.status,
        actor: "admin",
        ip: clientIp(req),
      },
    }),
  ]);

  // Hand the order to Intigo once it's marked ready to ship — but AFTER the
  // response is sent, so the courier round-trip never adds latency to the
  // status change. The dispatch records its outcome on the order
  // (intigoNid / trackingStatus) for the panel to read on refresh.
  if (parsed.data.status === "ready_to_ship") {
    after(() => dispatchOrderToIntigo(id));
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = EditBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const existing = await db.order.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.order.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await db.orderAudit.create({
    data: { orderId: id, fromStatus: null, toStatus: "deleted", actor: "admin", ip: clientIp(req) },
  }).catch(() => null);
  await db.orderItem.deleteMany({ where: { orderId: id } });
  await db.order.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
