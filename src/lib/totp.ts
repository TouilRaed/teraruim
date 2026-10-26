import crypto from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = "";
  for (const c of clean) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) throw new Error("invalid base32");
    bits += i.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const mac = crypto.createHmac("sha1", secret).update(buf).digest();
  const offset = mac[mac.length - 1] & 0xf;
  const bin =
    ((mac[offset] & 0x7f) << 24) |
    ((mac[offset + 1] & 0xff) << 16) |
    ((mac[offset + 2] & 0xff) << 8) |
    (mac[offset + 3] & 0xff);
  return (bin % 1_000_000).toString().padStart(6, "0");
}

export function totpEnabled(): boolean {
  return Boolean(process.env.ADMIN_TOTP_SECRET);
}

export function verifyTotp(code: string, ts: number = Date.now()): boolean {
  const secretB32 = process.env.ADMIN_TOTP_SECRET;
  if (!secretB32) return false;
  if (!/^\d{6}$/.test(code)) return false;
  let secret: Buffer;
  try { secret = base32Decode(secretB32); } catch { return false; }
  const step = Math.floor(ts / 30_000);
  for (let w = -1; w <= 1; w++) {
    const expected = hotp(secret, step + w);
    try {
      if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return true;
    } catch { /* length mismatch impossible since regex */ }
  }
  return false;
}
