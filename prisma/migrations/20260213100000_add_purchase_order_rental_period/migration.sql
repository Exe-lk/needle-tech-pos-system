-- AlterTable: add rental period to purchase orders (used when creating hiring agreements from PO)
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMPTZ(6);
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMPTZ(6);
