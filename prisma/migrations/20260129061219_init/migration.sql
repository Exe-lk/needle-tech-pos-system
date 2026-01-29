-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('GARMENT_FACTORY', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "TaxCategory" AS ENUM ('VAT', 'NON_VAT');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MachineBrand" AS ENUM ('JUKI', 'SINGER', 'KANSAL');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('AVAILABLE', 'RENTED', 'DAMAGED', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('RENTAL', 'DEPOSIT', 'DAMAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'CARD');

-- CreateEnum
CREATE TYPE "GatePassStatus" AS ENUM ('PENDING', 'DEPARTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "TriageCategory" AS ENUM ('STANDARD', 'DAMAGE', 'MISSING_PARTS', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "DamageSeverity" AS ENUM ('MINOR', 'MODERATE', 'MAJOR');

-- CreateEnum
CREATE TYPE "DamageCategory" AS ENUM ('DAMAGE', 'MISSING_PARTS', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "companyName" TEXT,
    "companyAddress" TEXT,
    "vatRegistrationNumber" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "defaultCountry" TEXT,
    "defaultVatRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "customerTypeTaxRules" JSONB,
    "enableCreditLock" BOOLEAN NOT NULL DEFAULT true,
    "lockAfterDaysOverdue" INTEGER NOT NULL DEFAULT 30,
    "maxOutstandingForNewRentals" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "alertDaysOfMonth" INTEGER[],
    "alertChannels" TEXT[],
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoiceStartNumber" INTEGER NOT NULL DEFAULT 1000,
    "agreementPrefix" TEXT NOT NULL DEFAULT 'RNT',
    "agreementStartNumber" INTEGER NOT NULL DEFAULT 1000,
    "gatePassPrefix" TEXT NOT NULL DEFAULT 'GP',
    "gatePassStartNumber" INTEGER NOT NULL DEFAULT 1000,
    "returnPrefix" TEXT NOT NULL DEFAULT 'RET',
    "returnStartNumber" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phones" TEXT[],
    "emails" TEXT[],
    "billingAddressLine1" TEXT,
    "billingAddressLine2" TEXT,
    "billingCity" TEXT,
    "billingRegion" TEXT,
    "billingPostalCode" TEXT,
    "billingCountry" TEXT,
    "shippingAddressLine1" TEXT,
    "shippingAddressLine2" TEXT,
    "shippingCity" TEXT,
    "shippingRegion" TEXT,
    "shippingPostalCode" TEXT,
    "shippingCountry" TEXT,
    "vatApplicable" BOOLEAN NOT NULL DEFAULT true,
    "vatRegistrationNumber" TEXT,
    "taxCategory" "TaxCategory" NOT NULL DEFAULT 'VAT',
    "creditLimit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "currentBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "oldestOutstandingInvoiceDate" TIMESTAMPTZ(6),
    "isCreditLocked" BOOLEAN NOT NULL DEFAULT false,
    "creditLockReason" TEXT,
    "alertChannels" TEXT[],
    "alertLanguage" TEXT NOT NULL DEFAULT 'en',
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brand" "MachineBrand" NOT NULL,
    "model" TEXT NOT NULL,
    "category" TEXT,
    "serialNumber" TEXT NOT NULL,
    "boxNumber" TEXT,
    "qrCodeValue" TEXT NOT NULL,
    "qrCodeImageUrl" TEXT,
    "photos" TEXT[],
    "voltage" TEXT,
    "power" TEXT,
    "stitchType" TEXT,
    "maxSpeedSpm" INTEGER,
    "specsOther" TEXT,
    "status" "MachineStatus" NOT NULL DEFAULT 'AVAILABLE',
    "statusHistory" JSONB[],
    "currentLocationType" TEXT,
    "currentLocationName" TEXT,
    "currentLocationAddress" TEXT,
    "onboardedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onboardedByUserId" UUID,
    "lastRentalId" UUID,
    "totalRentalDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rentals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agreementNumber" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'ACTIVE',
    "agreementType" TEXT NOT NULL DEFAULT 'RENTAL',
    "startDate" TIMESTAMPTZ(6) NOT NULL,
    "expectedEndDate" TIMESTAMPTZ(6) NOT NULL,
    "actualEndDate" TIMESTAMPTZ(6),
    "subtotal" DECIMAL(15,2) NOT NULL,
    "vatAmount" DECIMAL(15,2) NOT NULL,
    "total" DECIMAL(15,2) NOT NULL,
    "depositTotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "securityDepositInvoiceId" UUID,
    "isLockedForNewTransactions" BOOLEAN NOT NULL DEFAULT false,
    "lockedReason" TEXT,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_machines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rentalId" UUID NOT NULL,
    "machineId" UUID NOT NULL,
    "dailyRate" DECIMAL(10,2) NOT NULL,
    "securityDeposit" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoiceNumber" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "rentalId" UUID,
    "type" "InvoiceType" NOT NULL,
    "taxCategory" "TaxCategory" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMPTZ(6) NOT NULL,
    "dueDate" TIMESTAMPTZ(6) NOT NULL,
    "lineItems" JSONB[],
    "subtotal" DECIMAL(15,2) NOT NULL,
    "vatAmount" DECIMAL(15,2) NOT NULL,
    "grandTotal" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "receiptNumber" TEXT NOT NULL,
    "customerId" UUID NOT NULL,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "referenceNumber" TEXT,
    "paidAt" TIMESTAMPTZ(6) NOT NULL,
    "receivedByUserId" UUID NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "paymentId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_passes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gatePassNumber" TEXT NOT NULL,
    "rentalId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "driverName" TEXT,
    "vehicleNumber" TEXT,
    "departureTime" TIMESTAMPTZ(6) NOT NULL,
    "arrivalTime" TIMESTAMPTZ(6),
    "issuedByUserId" UUID NOT NULL,
    "status" "GatePassStatus" NOT NULL DEFAULT 'PENDING',
    "printedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "gate_passes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gate_pass_machines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gatePassId" UUID NOT NULL,
    "machineId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gate_pass_machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "returns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "returnNumber" TEXT NOT NULL,
    "rentalId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "machineId" UUID NOT NULL,
    "returnDate" TIMESTAMPTZ(6) NOT NULL,
    "condition" TEXT,
    "triageCategory" "TriageCategory" NOT NULL DEFAULT 'STANDARD',
    "notes" TEXT,
    "photos" TEXT[],
    "damageReportId" UUID,
    "inspectedByUserId" UUID NOT NULL,
    "returnReceiptNumber" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "damage_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "machineId" UUID NOT NULL,
    "rentalId" UUID NOT NULL,
    "severity" "DamageSeverity" NOT NULL,
    "category" "DamageCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "photos" TEXT[],
    "estimatedRepairCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "approvedChargeToCustomer" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "billedInvoiceId" UUID,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMPTZ(6),
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "damage_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outstanding_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customerId" UUID NOT NULL,
    "generatedAt" TIMESTAMPTZ(6) NOT NULL,
    "scheduleDay" INTEGER NOT NULL,
    "channel" "AlertChannel" NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMPTZ(6),
    "overdueInvoices" JSONB[],
    "totalOutstanding" DECIMAL(15,2) NOT NULL,
    "totalOverdue" DECIMAL(15,2) NOT NULL,
    "creditLockTriggered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "outstanding_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,
    "roleId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID,
    "description" TEXT,
    "before" JSONB,
    "after" JSONB,
    "sourceIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_name_idx" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- CreateIndex
CREATE INDEX "customers_code_idx" ON "customers"("code");

-- CreateIndex
CREATE INDEX "customers_type_idx" ON "customers"("type");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_isCreditLocked_idx" ON "customers"("isCreditLocked");

-- CreateIndex
CREATE INDEX "customers_currentBalance_idx" ON "customers"("currentBalance");

-- CreateIndex
CREATE UNIQUE INDEX "machines_serialNumber_key" ON "machines"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "machines_qrCodeValue_key" ON "machines"("qrCodeValue");

-- CreateIndex
CREATE INDEX "machines_serialNumber_idx" ON "machines"("serialNumber");

-- CreateIndex
CREATE INDEX "machines_qrCodeValue_idx" ON "machines"("qrCodeValue");

-- CreateIndex
CREATE INDEX "machines_brand_idx" ON "machines"("brand");

-- CreateIndex
CREATE INDEX "machines_status_idx" ON "machines"("status");

-- CreateIndex
CREATE INDEX "machines_boxNumber_idx" ON "machines"("boxNumber");

-- CreateIndex
CREATE UNIQUE INDEX "rentals_agreementNumber_key" ON "rentals"("agreementNumber");

-- CreateIndex
CREATE INDEX "rentals_agreementNumber_idx" ON "rentals"("agreementNumber");

-- CreateIndex
CREATE INDEX "rentals_customerId_idx" ON "rentals"("customerId");

-- CreateIndex
CREATE INDEX "rentals_status_idx" ON "rentals"("status");

-- CreateIndex
CREATE INDEX "rentals_startDate_idx" ON "rentals"("startDate");

-- CreateIndex
CREATE INDEX "rentals_createdByUserId_idx" ON "rentals"("createdByUserId");

-- CreateIndex
CREATE INDEX "rental_machines_rentalId_idx" ON "rental_machines"("rentalId");

-- CreateIndex
CREATE INDEX "rental_machines_machineId_idx" ON "rental_machines"("machineId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_customerId_idx" ON "invoices"("customerId");

-- CreateIndex
CREATE INDEX "invoices_rentalId_idx" ON "invoices"("rentalId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate");

-- CreateIndex
CREATE INDEX "invoices_paymentStatus_idx" ON "invoices"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "payments_receiptNumber_key" ON "payments"("receiptNumber");

-- CreateIndex
CREATE INDEX "payments_receiptNumber_idx" ON "payments"("receiptNumber");

-- CreateIndex
CREATE INDEX "payments_customerId_idx" ON "payments"("customerId");

-- CreateIndex
CREATE INDEX "payments_paidAt_idx" ON "payments"("paidAt");

-- CreateIndex
CREATE INDEX "payment_invoices_paymentId_idx" ON "payment_invoices"("paymentId");

-- CreateIndex
CREATE INDEX "payment_invoices_invoiceId_idx" ON "payment_invoices"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "gate_passes_gatePassNumber_key" ON "gate_passes"("gatePassNumber");

-- CreateIndex
CREATE INDEX "gate_passes_gatePassNumber_idx" ON "gate_passes"("gatePassNumber");

-- CreateIndex
CREATE INDEX "gate_passes_rentalId_idx" ON "gate_passes"("rentalId");

-- CreateIndex
CREATE INDEX "gate_passes_customerId_idx" ON "gate_passes"("customerId");

-- CreateIndex
CREATE INDEX "gate_passes_status_idx" ON "gate_passes"("status");

-- CreateIndex
CREATE INDEX "gate_passes_departureTime_idx" ON "gate_passes"("departureTime");

-- CreateIndex
CREATE INDEX "gate_pass_machines_gatePassId_idx" ON "gate_pass_machines"("gatePassId");

-- CreateIndex
CREATE INDEX "gate_pass_machines_machineId_idx" ON "gate_pass_machines"("machineId");

-- CreateIndex
CREATE UNIQUE INDEX "returns_returnNumber_key" ON "returns"("returnNumber");

-- CreateIndex
CREATE INDEX "returns_returnNumber_idx" ON "returns"("returnNumber");

-- CreateIndex
CREATE INDEX "returns_rentalId_idx" ON "returns"("rentalId");

-- CreateIndex
CREATE INDEX "returns_machineId_idx" ON "returns"("machineId");

-- CreateIndex
CREATE INDEX "returns_returnDate_idx" ON "returns"("returnDate");

-- CreateIndex
CREATE INDEX "returns_triageCategory_idx" ON "returns"("triageCategory");

-- CreateIndex
CREATE INDEX "damage_reports_machineId_idx" ON "damage_reports"("machineId");

-- CreateIndex
CREATE INDEX "damage_reports_rentalId_idx" ON "damage_reports"("rentalId");

-- CreateIndex
CREATE INDEX "damage_reports_resolved_idx" ON "damage_reports"("resolved");

-- CreateIndex
CREATE INDEX "damage_reports_severity_idx" ON "damage_reports"("severity");

-- CreateIndex
CREATE INDEX "outstanding_alerts_customerId_idx" ON "outstanding_alerts"("customerId");

-- CreateIndex
CREATE INDEX "outstanding_alerts_generatedAt_idx" ON "outstanding_alerts"("generatedAt");

-- CreateIndex
CREATE INDEX "outstanding_alerts_status_idx" ON "outstanding_alerts"("status");

-- CreateIndex
CREATE INDEX "outstanding_alerts_scheduleDay_idx" ON "outstanding_alerts"("scheduleDay");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_machines" ADD CONSTRAINT "rental_machines_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_machines" ADD CONSTRAINT "rental_machines_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_invoices" ADD CONSTRAINT "payment_invoices_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_invoices" ADD CONSTRAINT "payment_invoices_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_pass_machines" ADD CONSTRAINT "gate_pass_machines_gatePassId_fkey" FOREIGN KEY ("gatePassId") REFERENCES "gate_passes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gate_pass_machines" ADD CONSTRAINT "gate_pass_machines_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_inspectedByUserId_fkey" FOREIGN KEY ("inspectedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_damageReportId_fkey" FOREIGN KEY ("damageReportId") REFERENCES "damage_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_billedInvoiceId_fkey" FOREIGN KEY ("billedInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "damage_reports" ADD CONSTRAINT "damage_reports_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outstanding_alerts" ADD CONSTRAINT "outstanding_alerts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
