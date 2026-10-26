import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword, issueJwt } from "@/lib/admin-auth";
import { totpEnabled, verifyTotp } from "@/lib/totp";
import { rateLimit, clientIp } from "@/lib/rateLimit";

const Body = z.object({
  password: z.string().min(1).max(200),
  code: z.string().regex(/^\d{6}$/).optional(),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`mobile-login:${ip}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad input" }, { status: 400 });

  if (!verifyPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  if (totpEnabled()) {
    if (!parsed.data.code || !verifyTotp(parsed.data.code)) {
      return NextResponse.json({ error: "Invalid 2FA code", need2fa: true }, { status: 401 });
    }
  }

  const token = issueJwt("admin");
  return NextResponse.json({ ok: true, token, expiresIn: 60 * 60 * 24 * 30 });
}
