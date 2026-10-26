// Vercel-build pre-step: swap schema.prisma for the Postgres variant.
// Runs in Vercel's ephemeral build container. Local dev untouched.
import { copyFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "prisma", "schema.postgres.prisma");
const dest = path.join(root, "prisma", "schema.prisma");

await copyFile(src, dest);
console.log(`✓ swapped Postgres schema into ${dest}`);
