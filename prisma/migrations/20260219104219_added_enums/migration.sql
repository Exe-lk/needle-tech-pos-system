-- AlterEnum
ALTER TYPE "GatePassStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "rentals" ADD COLUMN     "requestedMachineLines" JSONB;
