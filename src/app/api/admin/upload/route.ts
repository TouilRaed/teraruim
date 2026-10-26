import { NextResponse } from "next/server";
import crypto from "crypto";
import { isAdminRequest } from "@/lib/admin-auth";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function POST(req: Request) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Bad form" }, { status: 400 });

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Validate
  for (const f of files) {
    if (f.size === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
    if (f.size > MAX_BYTES) return NextResponse.json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` }, { status: 413 });
    if (!ALLOWED[f.type]) return NextResponse.json({ error: `Unsupported type: ${f.type}` }, { status: 415 });
  }

  // Transcode every upload to webp at ingest → smaller origin bytes, one format
  // to serve. (next/image still re-optimizes per device on delivery.)
  const { default: sharp } = await import("sharp");
  async function toWebp(f: File): Promise<Buffer> {
    const input = Buffer.from(await f.arrayBuffer());
    return sharp(input, { animated: f.type === "image/gif" })
      .rotate() // honor EXIF orientation before stripping metadata
      .webp({ quality: 80 })
      .toBuffer();
  }

  const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const urls: string[] = [];

  // On Vercel the filesystem is read-only, so the local /public/uploads path
  // can never work in production. Fail clearly instead of crashing with ENOENT.
  if (!useBlob && (process.env.VERCEL || process.env.NODE_ENV === "production")) {
    return NextResponse.json(
      { error: "Stockage image non configuré : ajoutez un store Vercel Blob (BLOB_READ_WRITE_TOKEN) puis redéployez." },
      { status: 503 },
    );
  }

  if (useBlob) {
    const { put } = await import("@vercel/blob");
    for (const f of files) {
      const webp = await toWebp(f);
      const key = `products/${crypto.randomUUID()}.webp`;
      const blob = await put(key, webp, { access: "public", contentType: "image/webp" });
      urls.push(blob.url);
    }
  } else {
    // Local dev: write to /public/uploads
    const { writeFile, mkdir } = await import("fs/promises");
    const path = await import("path");
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    for (const f of files) {
      const webp = await toWebp(f);
      const name = `${crypto.randomUUID()}.webp`;
      await writeFile(path.join(uploadDir, name), webp);
      urls.push(`/uploads/${name}`);
    }
  }

  return NextResponse.json({ ok: true, urls });
}
