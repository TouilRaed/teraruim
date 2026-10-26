-- Add ADEX courier columns to Order (additive; shipper columns kept dormant)
ALTER TABLE "Order" ADD COLUMN "adexBarcode" TEXT;
ALTER TABLE "Order" ADD COLUMN "adexLabelUrl" TEXT;
