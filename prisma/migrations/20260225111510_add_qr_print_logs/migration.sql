-- CreateTable
CREATE TABLE "qr_print_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "machineId" UUID NOT NULL,
    "printedByUserId" UUID NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "boxNumber" TEXT,
    "qrCodeValue" TEXT NOT NULL,
    "printCount" INTEGER NOT NULL DEFAULT 1,
    "printedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "qr_print_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "qr_print_logs_machineId_idx" ON "qr_print_logs"("machineId");

-- CreateIndex
CREATE INDEX "qr_print_logs_printedByUserId_idx" ON "qr_print_logs"("printedByUserId");

-- CreateIndex
CREATE INDEX "qr_print_logs_printedAt_idx" ON "qr_print_logs"("printedAt" DESC);

-- CreateIndex
CREATE INDEX "qr_print_logs_serialNumber_idx" ON "qr_print_logs"("serialNumber");

-- CreateIndex
CREATE INDEX "qr_print_logs_qrCodeValue_idx" ON "qr_print_logs"("qrCodeValue");

-- AddForeignKey
ALTER TABLE "qr_print_logs" ADD CONSTRAINT "qr_print_logs_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_print_logs" ADD CONSTRAINT "qr_print_logs_printedByUserId_fkey" FOREIGN KEY ("printedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
