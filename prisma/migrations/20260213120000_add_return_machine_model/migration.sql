-- AlterTable: Make machineId optional in returns table for backward compatibility
-- Column name in database is "machineId" (camelCase)
ALTER TABLE "returns" ALTER COLUMN "machineId" DROP NOT NULL;

-- CreateTable: Create return_machines table
CREATE TABLE "return_machines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "return_id" UUID NOT NULL,
    "machine_id" UUID NOT NULL,
    "return_type" TEXT NOT NULL,
    "damage_note" TEXT,
    "photos" TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "return_machines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "return_machines_return_id_idx" ON "return_machines"("return_id");

-- CreateIndex
CREATE INDEX "return_machines_machine_id_idx" ON "return_machines"("machine_id");

-- AddForeignKey
ALTER TABLE "return_machines" ADD CONSTRAINT "return_machines_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_machines" ADD CONSTRAINT "return_machines_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
