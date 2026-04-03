-- CreateTable
CREATE TABLE "invoice_rentals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoiceId" UUID NOT NULL,
    "rentalId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_rentals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invoice_rentals_invoiceId_idx" ON "invoice_rentals"("invoiceId");

-- CreateIndex
CREATE INDEX "invoice_rentals_rentalId_idx" ON "invoice_rentals"("rentalId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_rentals_invoiceId_rentalId_key" ON "invoice_rentals"("invoiceId", "rentalId");

-- AddForeignKey
ALTER TABLE "invoice_rentals" ADD CONSTRAINT "invoice_rentals_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_rentals" ADD CONSTRAINT "invoice_rentals_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
