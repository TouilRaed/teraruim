import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isAdminRequest } from "@/lib/admin-auth";

const Body = z.object({
  token: z.string().min(10).max(200),
  platform: z.enum(["ios", "android"]).optional(),
  deviceName: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  await db.adminDevice.upsert({
    where: { token: parsed.data.token },
    create: {
      token: parsed.data.token,
      platform: parsed.data.platform ?? null,
      deviceName: parsed.data.deviceName ?? null,
    },
    update: {
      platform: parsed.data.platform ?? null,
      deviceName: parsed.data.deviceName ?? null,
      lastSeenAt: new Date(),
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  await db.adminDevice.delete({ where: { token } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
