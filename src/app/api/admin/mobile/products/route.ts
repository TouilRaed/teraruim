import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const cursor = url.searchParams.get("cursor");
  const take = Math.min(parseInt(url.searchParams.get("limit") || "30", 10), 100);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { sku: { contains: q } },
      { category: { contains: q } },
    ];
  }

  const products = await db.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let nextCursor: string | null = null;
  if (products.length > take) {
    const next = products.pop();
    nextCursor = next?.id ?? null;
  }

  return NextResponse.json({ products, nextCursor });
}
