/*
  Warnings:

  - You are about to drop the column `brand` on the `machines` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `machines` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `machines` table. All the data in the column will be lost.
  - Added the required column `brandId` to the `machines` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "machines_brand_idx";

-- AlterTable
ALTER TABLE "machines" DROP COLUMN "brand",
DROP COLUMN "category",
DROP COLUMN "model",
ADD COLUMN     "brandId" UUID NOT NULL,
ADD COLUMN     "modelId" UUID,
ADD COLUMN     "typeId" UUID;

-- DropEnum
DROP TYPE "MachineBrand";

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "models" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "brandId" UUID NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "machine_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_code_key" ON "brands"("code");

-- CreateIndex
CREATE INDEX "brands_name_idx" ON "brands"("name");

-- CreateIndex
CREATE INDEX "brands_code_idx" ON "brands"("code");

-- CreateIndex
CREATE INDEX "brands_isActive_idx" ON "brands"("isActive");

-- CreateIndex
CREATE INDEX "models_name_idx" ON "models"("name");

-- CreateIndex
CREATE INDEX "models_brandId_idx" ON "models"("brandId");

-- CreateIndex
CREATE INDEX "models_isActive_idx" ON "models"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "models_name_brandId_key" ON "models"("name", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "machine_types_name_key" ON "machine_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "machine_types_code_key" ON "machine_types"("code");

-- CreateIndex
CREATE INDEX "machine_types_name_idx" ON "machine_types"("name");

-- CreateIndex
CREATE INDEX "machine_types_code_idx" ON "machine_types"("code");

-- CreateIndex
CREATE INDEX "machine_types_isActive_idx" ON "machine_types"("isActive");

-- CreateIndex
CREATE INDEX "machines_brandId_idx" ON "machines"("brandId");

-- CreateIndex
CREATE INDEX "machines_modelId_idx" ON "machines"("modelId");

-- CreateIndex
CREATE INDEX "machines_typeId_idx" ON "machines"("typeId");

-- AddForeignKey
ALTER TABLE "models" ADD CONSTRAINT "models_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "machine_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
