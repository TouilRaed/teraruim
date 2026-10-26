// Rasterize Teraruim brand SVGs into web + mobile PNG assets.
// Run: node scripts/brand/rasterize.mjs   (needs `sharp`, already a dep)
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const svg = (name) => readFileSync(join(here, name));

const logo = svg("logo.svg");
const adaptive = svg("adaptive.svg");
const notif = svg("notification.svg");

const jobs = [
  // --- web ---
  { src: logo, out: "public/logo.png", size: 960 },
  { src: logo, out: "src/app/icon.png", size: 512 },
  // --- mobile (Expo) ---
  { src: logo, out: "mobile/assets/icon.png", size: 1024 },
  { src: adaptive, out: "mobile/assets/adaptive-icon.png", size: 1024 },
  { src: notif, out: "mobile/assets/notification-icon.png", size: 96 },
  { src: logo, out: "mobile/assets/favicon.png", size: 48 },
  // splash: mark on dark, contain handles centering
  { src: logo, out: "mobile/assets/splash.png", size: 1024 },
];

for (const j of jobs) {
  await sharp(j.src, { density: 384 })
    .resize(j.size, j.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(root, j.out));
  console.log("✓", j.out, `(${j.size}px)`);
}
console.log("Done.");
