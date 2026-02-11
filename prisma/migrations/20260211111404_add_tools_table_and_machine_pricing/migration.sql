-- CreateEnum
CREATE TYPE "ToolStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "ToolCondition" AS ENUM ('NEW', 'GOOD', 'FAIR', 'POOR');

-- AlterTable: Add pricing columns to machines table
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "unitPrice" DECIMAL(10,2);
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "monthlyRentalFee" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "tools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "toolName" TEXT NOT NULL,
    "toolType" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2),
    "status" "ToolStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT NOT NULL,
    "purchaseDate" TIMESTAMPTZ(6),
    "condition" "ToolCondition" NOT NULL DEFAULT 'GOOD',
    "notes" TEXT,
    "toolPhotoUrls" TEXT[],
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tools_toolName_idx" ON "tools"("toolName");

-- CreateIndex
CREATE INDEX "tools_toolType_idx" ON "tools"("toolType");

-- CreateIndex
CREATE INDEX "tools_status_idx" ON "tools"("status");

-- CreateIndex
CREATE INDEX "tools_location_idx" ON "tools"("location");

-- CreateIndex
CREATE INDEX "tools_isDeleted_idx" ON "tools"("isDeleted");
