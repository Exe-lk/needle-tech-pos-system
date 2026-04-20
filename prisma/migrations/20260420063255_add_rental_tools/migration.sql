-- CreateTable
CREATE TABLE "rental_tools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rentalId" UUID NOT NULL,
    "toolId" UUID NOT NULL,
    "unitPrice" DECIMAL(10,2),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_tools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rental_tools_rentalId_idx" ON "rental_tools"("rentalId");

-- CreateIndex
CREATE INDEX "rental_tools_toolId_idx" ON "rental_tools"("toolId");

-- AddForeignKey
ALTER TABLE "rental_tools" ADD CONSTRAINT "rental_tools_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_tools" ADD CONSTRAINT "rental_tools_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
