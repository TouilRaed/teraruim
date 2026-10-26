import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getEtat, adexEnabled } from "@/lib/adex";
import { verifyOrder } from "@/lib/orderToken";
import { isAdmin } from "@/lib/admin-auth";

export async function GET(req: Request, ctx: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await ctx.params;
  if (type !== "order") return NextResponse.json({ error: "Bad type" }, { status: 400 });

  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  if (!verifyOrder(id, token) && !(await isAdmin())) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const o = await db.order.findUnique({ where: { id }, select: { adexBarcode: true } });
  if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!o.adexBarcode || !adexEnabled()) {
    return NextResponse.json({ status: "not_tracked", shipments: [] });
  }
  try {
    const data = await getEtat([o.adexBarcode]);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
