-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED', 'PARTIALLY_FULFILLED');

-- CreateEnum
CREATE TYPE "StockTransactionType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'RENTAL_OUT', 'RETURN_IN', 'MAINTENANCE_OUT', 'MAINTENANCE_IN', 'RETIRED', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "rentals" ADD COLUMN     "purchaseOrderId" UUID;

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "requestNumber" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "requestDate" TIMESTAMPTZ(6) NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'PENDING',
    "machines" JSONB[],
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bincard_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" TIMESTAMPTZ(6) NOT NULL,
    "transactionType" "StockTransactionType" NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "machineType" TEXT,
    "reference" TEXT,
    "quantityIn" INTEGER NOT NULL DEFAULT 0,
    "quantityOut" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL,
    "location" TEXT,
    "performedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bincard_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_requestNumber_key" ON "purchase_orders"("requestNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_requestNumber_idx" ON "purchase_orders"("requestNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_customerId_idx" ON "purchase_orders"("customerId");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_requestDate_idx" ON "purchase_orders"("requestDate");

-- CreateIndex
CREATE INDEX "bincard_entries_date_idx" ON "bincard_entries"("date" DESC);

-- CreateIndex
CREATE INDEX "bincard_entries_brand_idx" ON "bincard_entries"("brand");

-- CreateIndex
CREATE INDEX "bincard_entries_model_idx" ON "bincard_entries"("model");

-- CreateIndex
CREATE INDEX "bincard_entries_transactionType_idx" ON "bincard_entries"("transactionType");

-- CreateIndex
CREATE INDEX "rentals_purchaseOrderId_idx" ON "rentals"("purchaseOrderId");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
