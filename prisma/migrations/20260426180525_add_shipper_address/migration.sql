-- AlterTable
ALTER TABLE "Gift" ADD COLUMN "shipperOrderId" INTEGER;
ALTER TABLE "Gift" ADD COLUMN "trackingStatus" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "shipAddress" TEXT;
ALTER TABLE "Order" ADD COLUMN "shipCity" TEXT;
ALTER TABLE "Order" ADD COLUMN "shipGovernorate" TEXT;
ALTER TABLE "Order" ADD COLUMN "shipPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "shipperOrderId" INTEGER;
ALTER TABLE "Order" ADD COLUMN "trackingStatus" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "image" TEXT,
    "phone" TEXT,
    "address1" TEXT,
    "divisionL1Id" INTEGER,
    "divisionL1" TEXT,
    "divisionL2Id" INTEGER,
    "divisionL2" TEXT,
    "country" TEXT NOT NULL DEFAULT 'TN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("createdAt", "email", "id", "image", "name", "password") SELECT "createdAt", "email", "id", "image", "name", "password" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
