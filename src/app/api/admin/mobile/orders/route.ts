import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q");
  const cursor = url.searchParams.get("cursor");
  const take = Math.min(parseInt(url.searchParams.get("limit") || "30", 10), 100);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { id: { contains: q } },
      { guestName: { contains: q } },
      { shipPhone: { contains: q } },
    ];
  }

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      items: {
        include: { product: { select: { id: true, title: true, image: true } } },
      },
    },
  });

  let nextCursor: string | null = null;
  if (orders.length > take) {
    const next = orders.pop();
    nextCursor = next?.id ?? null;
  }

  return NextResponse.json({ orders, nextCursor });
}
