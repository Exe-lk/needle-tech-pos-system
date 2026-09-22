-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "tools" JSONB[] DEFAULT ARRAY[]::JSONB[];
