-- CreateTable
CREATE TABLE "gate_pass_tools" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gatePassId" UUID NOT NULL,
    "toolId" UUID NOT NULL,
    "unitPrice" DECIMAL(10,2),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gate_pass_tools_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gate_pass_tools_gatePassId_idx" ON "gate_pass_tools"("gatePassId");

-- CreateIndex
CREATE INDEX "gate_pass_tools_toolId_idx" ON "gate_pass_tools"("toolId");

-- AddForeignKey
ALTER TABLE "gate_pass_tools" ADD CONSTRAINT "gate_pass_tools_gatePassId_fkey" FOREIGN KEY ("gatePassId") REFERENCES "gate_passes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_pass_tools" ADD CONSTRAINT "gate_pass_tools_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
