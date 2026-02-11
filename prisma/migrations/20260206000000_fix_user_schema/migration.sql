-- AlterTable: Fix users table for Supabase auth
-- Remove passwordHash (using Supabase auth instead)
-- Make email required and unique
-- Remove default from id (id comes from Supabase auth.users)

-- DropColumn
ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordHash";

-- AlterTable: Make email required
-- First, update any NULL emails to a placeholder (if any exist)
UPDATE "users" SET "email" = 'temp_' || "id"::text || '@temp.com' WHERE "email" IS NULL;

-- Make email NOT NULL
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;

-- Create unique index on email if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- AlterTable: Remove default from id (id should come from Supabase auth.users)
-- The id column should not have a default since it comes from Supabase auth.users.id
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable: Add machine fields that were added directly to database
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "conditionOnArrival" TEXT;
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "manufactureYear" TEXT;
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "purchaseDate" TIMESTAMPTZ(6);
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "warrantyExpiryDate" TIMESTAMPTZ(6);
ALTER TABLE "machines" ADD COLUMN IF NOT EXISTS "warrantyStatus" TEXT;
