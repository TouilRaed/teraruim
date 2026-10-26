import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

const Body = z.object({
  productId: z.string().min(1).max(50),
  author: z.string().min(1).max(80),
  rating: z.number().int().min(1).max(5),
  body: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  const r = await db.review.create({ data: parsed.data });
  return NextResponse.json({ ok: true, id: r.id });
}

export async function GET(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const productId = new URL(req.url).searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });
  const list = await db.review.findMany({ where: { productId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(list);
}
