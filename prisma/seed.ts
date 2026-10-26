import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("No-op seed. Add real products via Prisma Studio or admin tooling.");
}

main().finally(() => db.$disconnect());
