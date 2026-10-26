import { cookies, headers } from "next/headers";
import crypto from "crypto";

const COOKIE = "admin_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7;

export async function ipAllowed(): Promise<boolean> {
  const list = (process.env.ADMIN_IP_ALLOWLIST ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return true; // not configured → allow any
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : (h.get("x-real-ip") ?? "");
  return list.includes(ip);
}

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || "";
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function buildToken(secret: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = `${nonce}.${exp}`;
  const mac = sign(payload, secret);
  return `${payload}.${mac}`;
}

function verifyToken(token: string, secret: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [nonce, expStr, mac] = parts;
  if (!nonce || !expStr || !mac) return false;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(`${nonce}.${expStr}`, secret);
  if (expected.length !== mac.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(mac));
  } catch {
    return false;
  }
}

export async function isAdmin(): Promise<boolean> {
  if (!(await ipAllowed())) return false;
  const c = await cookies();
  const t = c.get(COOKIE)?.value;
  const secret = sessionSecret();
  if (!t || !secret) return false;
  return verifyToken(t, secret);
}

const JWT_TTL_SEC = 60 * 60 * 24 * 30; // 30 days for mobile

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

export function issueJwt(subject: string = "admin"): string {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET not configured");
  const header = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(Buffer.from(JSON.stringify({ sub: subject, iat: now, exp: now + JWT_TTL_SEC, role: "admin" })));
  const sig = b64url(crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

export function verifyJwt(token: string): boolean {
  const secret = sessionSecret();
  if (!secret) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [h, p, s] = parts;
  const expectedSig = b64url(crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest());
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(s))) return false;
  } catch { return false; }
  try {
    const payload = JSON.parse(b64urlDecode(p).toString("utf8")) as { exp?: number; role?: string };
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;
    if (payload.role !== "admin") return false;
    return true;
  } catch { return false; }
}

function getBearer(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Accepts admin via cookie (web) OR Bearer JWT (mobile). */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const bearer = getBearer(req);
  if (bearer && verifyJwt(bearer)) {
    // Mobile bypasses ipAllowed (mobile devices roam). Token possession proves admin.
    return true;
  }
  return isAdmin();
}

export async function setAdminCookie() {
  const secret = sessionSecret();
  if (!secret) return;
  const c = await cookies();
  c.set(COOKIE, buildToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

export async function clearAdminCookie() {
  const c = await cookies();
  c.delete(COOKIE);
}

export function verifyPassword(input: string): boolean {
  const pwd = process.env.ADMIN_PASSWORD;
  if (!pwd || !input) return false;
  const a = Buffer.from(pwd);
  const b = Buffer.from(input);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const ORDER_STATUSES = [
  "cart_abandoned",
  "pending",
  "confirmed",
  "ready_to_ship",
  "shipped",
  "delivered",
  "return_not_received",
  "cancelled",
  "return_received",
  "paid",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, { fr: string; ar: string; color: string; icon: string }> = {
  cart_abandoned:      { fr: "Panier abandonné",     ar: "سلة مهملة",         color: "bg-zinc-100 text-zinc-700",     icon: "🛒" },
  pending:             { fr: "En attente",           ar: "في الانتظار",         color: "bg-amber-100 text-amber-800",   icon: "⏳" },
  confirmed:           { fr: "Confirmée",            ar: "مؤكدة",             color: "bg-emerald-100 text-emerald-800", icon: "✅" },
  ready_to_ship:       { fr: "Prêt à expédier",      ar: "جاهز للشحن",         color: "bg-sky-100 text-sky-800",       icon: "📦" },
  shipped:             { fr: "Expédiée",             ar: "مشحونة",            color: "bg-blue-100 text-blue-800",     icon: "🚚" },
  delivered:           { fr: "Livrée",               ar: "تم التسليم",         color: "bg-green-100 text-green-800",   icon: "🎁" },
  return_not_received: { fr: "Retour non reçu",      ar: "ارجاع غير مستلم",    color: "bg-orange-100 text-orange-800", icon: "↩️" },
  cancelled:           { fr: "Annulée",              ar: "ملغاة",             color: "bg-red-100 text-red-700",       icon: "✖️" },
  return_received:     { fr: "Retour reçue",         ar: "ارجاع مستلم",        color: "bg-purple-100 text-purple-800", icon: "↩️" },
  paid:                { fr: "Payée",                ar: "مدفوعة",            color: "bg-indigo-100 text-indigo-800", icon: "💵" },
};
