import crypto from "crypto";

function secret(): string {
  return process.env.ORDER_URL_SECRET || process.env.ADMIN_SESSION_SECRET || "";
}

export function signOrder(id: string): string {
  const s = secret();
  if (!s) return "";
  return crypto.createHmac("sha256", s).update(id).digest("hex").slice(0, 24);
}

export function verifyOrder(id: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = signOrder(id);
  if (!expected || expected.length !== token.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}
