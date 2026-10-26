// Generate placeholder PNG assets (no external deps) using built-in zlib.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, "..", "assets");
mkdirSync(ASSETS, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// draw: function(x,y) -> [r,g,b,a]
function png(w, h, draw) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  let p = 0;
  for (let y = 0; y < h; y++) {
    raw[p++] = 0; // filter none
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = draw(x, y);
      raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = a ?? 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const DARK = hex("#0a0a0a");
const RED = hex("#dc2626");
const AMBER = hex("#f59e0b");

// App icon: dark bg, centered red rounded square with amber stripe
function iconDraw(size) {
  const pad = size * 0.18;
  const r = size * 0.16; // corner radius
  return (x, y) => {
    const inX = x >= pad && x <= size - pad;
    const inY = y >= pad && y <= size - pad;
    if (inX && inY) {
      // rounded corners
      const cx = Math.min(Math.max(x, pad + r), size - pad - r);
      const cy = Math.min(Math.max(y, pad + r), size - pad - r);
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r + 0.5) {
        // amber diagonal accent band
        const band = (x + y) > size * 0.95 && (x + y) < size * 1.15;
        return band ? [...AMBER, 255] : [...RED, 255];
      }
    }
    return [...DARK, 255];
  };
}

// Adaptive foreground: transparent bg, red square (safe zone ~66%)
function adaptiveDraw(size) {
  const pad = size * 0.28;
  return (x, y) => {
    if (x >= pad && x <= size - pad && y >= pad && y <= size - pad) {
      const band = (x + y) > size * 1.0 && (x + y) < size * 1.2;
      return band ? [...AMBER, 255] : [...RED, 255];
    }
    return [0, 0, 0, 0];
  };
}

// Splash: solid dark with centered red dot
function splashDraw(w, h) {
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.12;
  return (x, y) => (Math.hypot(x - cx, y - cy) <= r ? [...RED, 255] : [...DARK, 255]);
}

writeFileSync(join(ASSETS, "icon.png"), png(1024, 1024, iconDraw(1024)));
writeFileSync(join(ASSETS, "adaptive-icon.png"), png(1024, 1024, adaptiveDraw(1024)));
writeFileSync(join(ASSETS, "splash.png"), png(1242, 2436, splashDraw(1242, 2436)));
writeFileSync(join(ASSETS, "favicon.png"), png(48, 48, iconDraw(48)));
writeFileSync(join(ASSETS, "notification-icon.png"), png(96, 96, adaptiveDraw(96)));
console.log("Assets written to", ASSETS);
