import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 60_000);
  if (isNaN(sinceDate.getTime())) {
    return NextResponse.json({ error: "Bad since" }, { status: 400 });
  }

  const orders = await db.order.findMany({
    where: {
      createdAt: { gt: sinceDate },
      status: { not: "cart_abandoned" },
    },
    select: { id: true, guestName: true, total: true, createdAt: true, shipPhone: true },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const now = new Date().toISOString();
  return NextResponse.json({ now, count: orders.length, orders });
}
