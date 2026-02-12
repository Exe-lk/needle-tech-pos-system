/*
  Warnings:

  - Added the required column `alertType` to the `outstanding_alerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `outstanding_alerts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `severity` to the `outstanding_alerts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('PAYMENT_OVERDUE', 'HIGH_BALANCE', 'CREDIT_LIMIT_EXCEEDED', 'AGREEMENT_EXPIRING');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('INVENTORY', 'RENTAL', 'RETURN', 'INVOICE', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('SUCCESS', 'PENDING', 'FAILED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AlertStatus" ADD VALUE 'ACTIVE';
ALTER TYPE "AlertStatus" ADD VALUE 'RESOLVED';

-- AlterTable: Add new columns as nullable to handle existing data
ALTER TABLE "outstanding_alerts" ADD COLUMN     "alertType" "AlertType",
ADD COLUMN     "amount" DECIMAL(15,2),
ADD COLUMN     "daysOverdue" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "dueDate" TIMESTAMPTZ(6),
ADD COLUMN     "relatedAgreement" TEXT,
ADD COLUMN     "relatedMachine" TEXT,
ADD COLUMN     "resolvedAt" TIMESTAMPTZ(6),
ADD COLUMN     "severity" "AlertSeverity";

-- CreateTable
CREATE TABLE "transaction_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transactionDate" TIMESTAMPTZ(6) NOT NULL,
    "category" "TransactionCategory" NOT NULL,
    "transactionType" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "customerId" UUID,
    "amount" DECIMAL(15,2),
    "quantity" INTEGER,
    "location" TEXT,
    "performedBy" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'SUCCESS',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_logs_transactionDate_idx" ON "transaction_logs"("transactionDate" DESC);

-- CreateIndex
CREATE INDEX "transaction_logs_category_idx" ON "transaction_logs"("category");

-- CreateIndex
CREATE INDEX "transaction_logs_transactionType_idx" ON "transaction_logs"("transactionType");

-- CreateIndex
CREATE INDEX "transaction_logs_status_idx" ON "transaction_logs"("status");

-- CreateIndex
CREATE INDEX "transaction_logs_customerId_idx" ON "transaction_logs"("customerId");

-- CreateIndex
CREATE INDEX "outstanding_alerts_alertType_idx" ON "outstanding_alerts"("alertType");

-- CreateIndex
CREATE INDEX "outstanding_alerts_severity_idx" ON "outstanding_alerts"("severity");

-- AddForeignKey
ALTER TABLE "transaction_logs" ADD CONSTRAINT "transaction_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
