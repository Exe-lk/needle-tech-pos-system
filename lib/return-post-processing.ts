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
 * 1. Mark returned machines as returned in rental_machines (keep history via returnedAt field).
 * 2. Recalculate rental totals from the agreement's MONTHLY RENTAL FEE (proportional to remaining machines and remaining months).
 * 3. Cancel any future invoices (DRAFT/ISSUED) for this rental that are after the return date.
 * 4. Generate one invoice per remaining month, each for the monthly rental fee (remaining machines only).
 * 5. If all machines returned, set rental status to COMPLETED and zero totals.
 * 6. Update rental metadata to track return history.
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

  // Mark machines as returned instead of deleting (preserves rental history)
  await tx.rentalMachine.updateMany({
    where: { rentalId, machineId: { in: returnedMachineIds } },
    data: { 
      lastBilledToDate: returnDate, // Track when machine was returned for billing
    },
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

  // Filter machines: only those not yet returned (lastBilledToDate is null or after returnDate)
  const remainingMachines = (rental.machines as any[]).filter((rm: any) => {
    return !returnedMachineIds.includes(rm.machineId);
  });

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

  // Calculate which month of the rental period this return occurred in
  const returnMonth = Math.floor((returnDateOnly.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  
  // Original monthly rental total from agreement (subtotal is for full period)
  const originalSubtotal = Number(rental.subtotal ?? 0);
  const originalMonthlySubtotal = originalSubtotal / totalMonths;

  // Original machine count = remaining + returned
  const originalCount = remainingMachines.length + returnedMachineIds.length;
  if (originalCount <= 0) return result;

  // For the current month (month where return happened), invoice should include all original machines
  // For future months, only remaining machines should be invoiced
  // This matches the scenario: Month 1 = 5 machines, Month 2-3 = 3 machines

  // For the current month (month where return happened), invoice should include all original machines
  // For future months, only remaining machines should be invoiced
  // This matches the scenario: Month 1 = 5 machines, Month 2-3 = 3 machines

  // New monthly subtotal for future months = original monthly × (remaining machines / original machines)
  const newMonthlySubtotal = originalMonthlySubtotal * (remainingMachines.length / originalCount);

  // Remaining period (months from day after return to end)
  const remainingMs = periodEnd.getTime() - periodStart.getTime();
  const remainingDays = Math.max(0, remainingMs / (1000 * 60 * 60 * 24));
  const remainingMonths = Math.max(0, Math.ceil(remainingDays / 30));
  const hasRemainingPeriod = remainingDays > 0 && remainingMonths > 0;

  // Rental totals update: only for remaining period (future months with reduced machines)
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

  // Cancel ALL future invoices (including current month if not yet issued) - we'll regenerate them
  const cancelled = await tx.invoice.updateMany({
    where: {
      rentalId,
      status: { in: ['DRAFT', 'ISSUED'] },
      issueDate: { gte: startDate }, // Cancel all invoices from rental start (we'll regenerate only what's needed)
    },
    data: { status: 'CANCELLED' },
  });
  result.cancelledInvoiceCount = cancelled.count;

  result.cancelledInvoiceCount = cancelled.count;

  if (!hasRemainingPeriod) return result;

  // Generate NEW invoices:
  // - For completed months (up to and including return month): Invoice with ORIGINAL machine count
  // - For future months (after return month): Invoice with REMAINING machine count only
  
  // Monthly rental fee per machine (for line items)
  const monthlyRatePerMachine =
    originalCount > 0 ? originalMonthlySubtotal / originalCount : 0;
  const monthlyRatePerRemainingMachine =
    remainingMachines.length > 0 ? newMonthlySubtotal / remainingMachines.length : 0;

  // Group ALL machines (original + returned) by brand/model/type for past months
  const allMachines = [...remainingMachines];
  
  // Add back returned machines for historical invoicing
  const returnedMachineData = await tx.rentalMachine.findMany({
    where: {
      rentalId,
      machineId: { in: returnedMachineIds },
    },
    include: {
      machine: {
        include: {
          brand: true,
          model: true,
          type: true,
        },
      },
    },
  });
  
  const allMachinesForPastInvoices = [...remainingMachines, ...returnedMachineData];
  
  const categoryMapAll = new Map<
    string,
    { brand: string; model: string; type: string; count: number }
  >();
  for (const rm of allMachinesForPastInvoices) {
    const machine = rm.machine as any;
    const brand = machine?.brand?.name ?? 'Unknown';
    const model = machine?.model?.name ?? 'Unknown';
    const type = machine?.type?.name ?? '';
    const key = `${brand}|${model}|${type}`;
    if (!categoryMapAll.has(key)) {
      categoryMapAll.set(key, { brand, model, type, count: 0 });
    }
    const cat = categoryMapAll.get(key)!;
    cat.count += rm.quantity ?? 1;
  }

  // Group REMAINING machines only (for future invoices)
  const categoryMapRemaining = new Map<
    string,
    { brand: string; model: string; type: string; count: number }
  >();
  for (const rm of remainingMachines) {
    const machine = rm.machine as any;
    const brand = machine?.brand?.name ?? 'Unknown';
    const model = machine?.model?.name ?? 'Unknown';
    const type = machine?.type?.name ?? '';
    const key = `${brand}|${model}|${type}`;
    if (!categoryMapRemaining.has(key)) {
      categoryMapRemaining.set(key, { brand, model, type, count: 0 });
    }
    const cat = categoryMapRemaining.get(key)!;
    cat.count += rm.quantity ?? 1;
  }

  // Generate invoices: one per month from rental start to rental end
  const baseInvTime = Date.now();
  let invoiceCounter = 0;
  
  for (let m = 0; m < totalMonths; m++) {
    const monthStart = new Date(startDate.getFullYear(), startDate.getMonth() + m, startDate.getDate());
    const lastDayOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const monthEnd = lastDayOfMonth > periodEnd ? new Date(periodEnd) : lastDayOfMonth;
    
    // Determine if this month is before, during, or after the return
    const isBeforeReturn = m < returnMonth;
    const isReturnMonth = m === returnMonth;
    const isAfterReturn = m > returnMonth;
    
    let lineItems: any[] = [];
    let invoiceSubtotal = 0;
    let categoryMap: Map<string, { brand: string; model: string; type: string; count: number }>;
    let ratePerMachine = 0;
    
    if (isBeforeReturn || isReturnMonth) {
      // Use ALL original machines for months up to and including return month
      categoryMap = categoryMapAll;
      ratePerMachine = monthlyRatePerMachine;
      invoiceSubtotal = originalMonthlySubtotal;
    } else {
      // Use only REMAINING machines for months after return
      categoryMap = categoryMapRemaining;
      ratePerMachine = monthlyRatePerRemainingMachine;
      invoiceSubtotal = newMonthlySubtotal;
    }
    
    let itemIndex = 0;
    for (const [, cat] of categoryMap) {
      lineItems.push({
        description: [cat.brand, cat.model, cat.type].filter(Boolean).join(' ').toUpperCase() || 'Machine',
        quantity: cat.count,
        unitPrice: ratePerMachine,
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

    invoiceSubtotal = Math.round(invoiceSubtotal * 100) / 100;
    const invoiceVat = Math.round(invoiceSubtotal * VAT_RATE * 100) / 100;
    const invoiceGrandTotal = Math.round((invoiceSubtotal + invoiceVat) * 100) / 100;

    await tx.invoice.create({
      data: {
        invoiceNumber: `INV-${baseInvTime}-${++invoiceCounter}`,
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
