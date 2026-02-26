import type { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

/**
 * Transaction type for use inside prisma.$transaction callback.
 */
type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// Match machine-assign and invoice flow (18% VAT on rental invoices)
const VAT_RATE = 0.18;

/**
 * After a partial or full return:
 * 1. Remove returned machines from the rental so agreement reflects only remaining machines.
 * 2. Recalculate rental totals from the agreement's MONTHLY RENTAL FEE (proportional to remaining machines and remaining months).
 * 3. Cancel any future invoices for this rental.
 * 4. Generate one invoice per remaining month, each for the monthly rental fee (remaining machines only).
 * 5. If all machines returned, set rental status to COMPLETED and zero totals.
 */
export async function processReturnPostProcessing(
  tx: Tx,
  rentalId: string,
  returnDate: Date,
  returnedMachineIds: string[],
  createdByUserId: string
): Promise<{ rentalUpdated: boolean; invoiceCreated: boolean; cancelledInvoiceCount: number }> {
  const result = { rentalUpdated: false, invoiceCreated: false, cancelledInvoiceCount: 0 };

  if (returnedMachineIds.length === 0) return result;

  await tx.rentalMachine.deleteMany({
    where: { rentalId, machineId: { in: returnedMachineIds } },
  });

  const rental = await tx.rental.findUnique({
    where: { id: rentalId },
    include: {
      customer: true,
      machines: {
        include: {
          machine: {
            include: {
              brand: true,
              model: true,
              type: true,
            },
          },
        },
      },
    },
  });

  if (!rental || !rental.expectedEndDate) return result;

  const startDate = new Date(rental.startDate);
  const expectedEnd = new Date(rental.expectedEndDate);
  const returnDateOnly = new Date(returnDate);
  returnDateOnly.setHours(0, 0, 0, 0);

  // Remaining period: day after return until expected end
  const periodStart = new Date(returnDateOnly);
  periodStart.setDate(periodStart.getDate() + 1);
  const periodEnd = new Date(rental.expectedEndDate);

  const remainingMachines = (rental.machines as any[]) || [];

  if (remainingMachines.length === 0) {
    await tx.rental.update({
      where: { id: rentalId },
      data: {
        status: 'COMPLETED',
        actualEndDate: returnDate,
        subtotal: new Decimal(0),
        vatAmount: new Decimal(0),
        total: new Decimal(0),
        balance: new Decimal(0),
      },
    });
    result.rentalUpdated = true;
    const cancelled = await tx.invoice.updateMany({
      where: {
        rentalId,
        status: { in: ['DRAFT', 'ISSUED'] },
        dueDate: { gt: returnDate },
      },
      data: { status: 'CANCELLED' },
    });
    result.cancelledInvoiceCount = cancelled.count;
    return result;
  }

  // Full agreement period (months) – used to derive monthly rental fee
  const fullPeriodMs = expectedEnd.getTime() - startDate.getTime();
  const fullPeriodDays = Math.max(1, fullPeriodMs / (1000 * 60 * 60 * 24));
  const totalMonths = Math.max(1, Math.ceil(fullPeriodDays / 30));

  // Original monthly rental total from agreement (subtotal is for full period)
  const originalSubtotal = Number(rental.subtotal ?? 0);
  const originalMonthlySubtotal = originalSubtotal / totalMonths;

  // Original machine count = remaining + returned
  const originalCount = remainingMachines.length + returnedMachineIds.length;
  if (originalCount <= 0) return result;

  // New monthly subtotal = original monthly × (remaining machines / original machines)
  const newMonthlySubtotal = originalMonthlySubtotal * (remainingMachines.length / originalCount);

  // Remaining period (months)
  const remainingMs = periodEnd.getTime() - periodStart.getTime();
  const remainingDays = Math.max(0, remainingMs / (1000 * 60 * 60 * 24));
  const remainingMonths = Math.max(1, Math.ceil(remainingDays / 30));
  const hasRemainingPeriod = remainingDays > 0;

  // Rental totals for remaining period = monthly fee × remaining months (same as original model)
  const newSubtotal = Math.round(newMonthlySubtotal * remainingMonths * 100) / 100;
  const newVatAmount = Math.round(newSubtotal * VAT_RATE * 100) / 100;
  const newTotal = Math.round((newSubtotal + newVatAmount) * 100) / 100;
  const paidAmount = Number(rental.paidAmount ?? 0);
  const newBalance = Math.round((newTotal - paidAmount) * 100) / 100;

  await tx.rental.update({
    where: { id: rentalId },
    data: {
      subtotal: new Decimal(newSubtotal),
      vatAmount: new Decimal(newVatAmount),
      total: new Decimal(newTotal),
      balance: new Decimal(newBalance),
    },
  });
  result.rentalUpdated = true;

  const cancelled = await tx.invoice.updateMany({
    where: {
      rentalId,
      status: { in: ['DRAFT', 'ISSUED'] },
      dueDate: { gt: returnDate },
    },
    data: { status: 'CANCELLED' },
  });
  result.cancelledInvoiceCount = cancelled.count;

  if (!hasRemainingPeriod) return result;

  // Monthly rental fee per machine (for line items) – same concept as initial invoice
  const monthlyRatePerMachine =
    remainingMachines.length > 0 ? newMonthlySubtotal / remainingMachines.length : 0;

  // Group by brand/model/type (like machine-assign)
  const categoryMap = new Map<
    string,
    { brand: string; model: string; type: string; count: number }
  >();
  for (const rm of remainingMachines) {
    const machine = rm.machine as any;
    const brand = machine?.brand?.name ?? 'Unknown';
    const model = machine?.model?.name ?? 'Unknown';
    const type = machine?.type?.name ?? '';
    const key = `${brand}|${model}|${type}`;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { brand, model, type, count: 0 });
    }
    const cat = categoryMap.get(key)!;
    cat.count += rm.quantity ?? 1;
  }

  // One invoice per remaining month – each for one month's rental fee (remaining machines only)
  const baseInvTime = Date.now();
  for (let m = 0; m < remainingMonths; m++) {
    const monthStart = new Date(periodStart.getFullYear(), periodStart.getMonth() + m, periodStart.getDate());
    const lastDayOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const monthEnd = lastDayOfMonth > periodEnd ? new Date(periodEnd) : lastDayOfMonth;

    const lineItems: any[] = [];
    let itemIndex = 0;
    for (const [, cat] of categoryMap) {
      lineItems.push({
        description: [cat.brand, cat.model, cat.type].filter(Boolean).join(' ').toUpperCase() || 'Machine',
        quantity: cat.count,
        unitPrice: monthlyRatePerMachine,
        machineId: null,
        brand: cat.brand,
        model: cat.model,
        type: cat.type,
        brandId: null,
        modelId: null,
        machineTypeId: null,
        itemCode: `212WG${String(++itemIndex).padStart(5, '0')}`,
        serialNumber: undefined,
        vatRate: VAT_RATE,
      });
    }

    const invoiceSubtotal = Math.round(newMonthlySubtotal * 100) / 100;
    const invoiceVat = Math.round(invoiceSubtotal * VAT_RATE * 100) / 100;
    const invoiceGrandTotal = Math.round((invoiceSubtotal + invoiceVat) * 100) / 100;

    await tx.invoice.create({
      data: {
        invoiceNumber: `INV-${baseInvTime}-${m + 1}`,
        customerId: rental.customerId,
        rentalId: rental.id,
        type: 'RENTAL',
        taxCategory: 'VAT',
        status: 'ISSUED',
        issueDate: monthStart,
        dueDate: monthEnd,
        lineItems,
        subtotal: new Decimal(invoiceSubtotal),
        vatAmount: new Decimal(invoiceVat),
        grandTotal: new Decimal(invoiceGrandTotal),
        balance: new Decimal(invoiceGrandTotal),
        createdByUserId,
      },
    });
  }
  result.invoiceCreated = true;

  return result;
}
