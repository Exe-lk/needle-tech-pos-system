-- AlterTable
ALTER TABLE "bincard_entries" ADD COLUMN IF NOT EXISTS "stockType" TEXT,
ADD COLUMN IF NOT EXISTS "warrantyExpiry" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "condition" TEXT;
