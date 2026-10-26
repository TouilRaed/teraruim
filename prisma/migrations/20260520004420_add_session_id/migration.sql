-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "total" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "sessionId" TEXT,
    "shipperOrderId" INTEGER,
    "trackingStatus" TEXT,
    "shipAddress" TEXT,
    "shipCity" TEXT,
    "shipGovernorate" TEXT,
    "shipPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "guestEmail", "guestName", "id", "shipAddress", "shipCity", "shipGovernorate", "shipPhone", "shipperOrderId", "status", "total", "trackingStatus", "userId") SELECT "createdAt", "guestEmail", "guestName", "id", "shipAddress", "shipCity", "shipGovernorate", "shipPhone", "shipperOrderId", "status", "total", "trackingStatus", "userId" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_sessionId_idx" ON "Order"("sessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
