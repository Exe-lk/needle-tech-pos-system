-- AlterTable
-- Remove passwordHash column and fix email constraint
ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");
