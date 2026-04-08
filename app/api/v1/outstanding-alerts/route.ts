import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function toNumberDecimal(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  // Prisma Decimal has toString()
  const maybe = value as { toString?: () => string };
  if (typeof maybe?.toString === 'function') return Number(maybe.toString());
  return Number(value);
}

/**
 * @swagger
 * /api/v1/outstanding-alerts:
 *   get:
 *     summary: Get all outstanding alerts
 *     tags: [Outstanding Alerts]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const customerTypeFilter = searchParams.get('customerType');
    const alertTypeFilter = searchParams.get('alertType');
    const severityFilter = searchParams.get('severity');
    const statusFilter = searchParams.get('status');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    
    if (customerTypeFilter) {
      const customerType = customerTypeFilter === 'Company' ? 'GARMENT_FACTORY' : 'INDIVIDUAL';
      where.customer = { type: customerType };
    }
    
    if (alertTypeFilter) {
      where.alertType = alertTypeFilter.toUpperCase().replace(/ /g, '_');
    }
    
    if (severityFilter) {
      where.severity = severityFilter.toUpperCase();
    }
    
    if (statusFilter) {
      where.status = statusFilter.toUpperCase();
    }
    
    const totalItems = await prisma.outstandingAlert.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 'asc' ? 'asc' : 'desc';
    
    const alerts = await prisma.outstandingAlert.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: { customer: true }
    });
    
    // Transform for frontend
    const transformed = alerts.map((alert: any) => ({
      id: alert.id,
      customerId: alert.customerId,
      customerName: alert.customer?.name || '',
      customerType: alert.customer?.type === 'GARMENT_FACTORY' ? 'Company' : 'Individual',
      alertType: alert.alertType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || '',
      description: alert.description || '',
      amount: alert.amount ? parseFloat(alert.amount.toString()) : null,
      dueDate: alert.dueDate,
      severity: alert.severity?.charAt(0) + alert.severity?.slice(1).toLowerCase() || '',
      status: alert.status === 'RESOLVED' ? 'Resolved' : 'Active',
      createdAt: alert.createdAt,
      resolvedAt: alert.resolvedAt,
      relatedAgreement: alert.relatedAgreement || null,
      relatedMachine: alert.relatedMachine || null,
      daysOverdue: alert.daysOverdue || null,
    }));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      transformed ,
      pagination,
      'Outstanding alerts retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(customerTypeFilter && { customerType: customerTypeFilter }),
        ...(alertTypeFilter && { alertType: alertTypeFilter }),
        ...(severityFilter && { severity: severityFilter }),
        ...(statusFilter && { status: statusFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching outstanding alerts:', error);
    return errorResponse('Failed to retrieve outstanding alerts', 500);
  }
});

/**
 * @swagger
 * /api/v1/outstanding-alerts:
 *   post:
 *     summary: Check and create outstanding alerts (idempotent)
 *     tags: [Outstanding Alerts]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(
  ['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER'],
  async (request: NextRequest) => {
    try {
      // Optional body for future extension (e.g. customerId)
      let body: { customerId?: string } | null = null;
      try {
        body = (await request.json()) as { customerId?: string };
      } catch {
        body = null;
      }

      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const scheduleDay = now.getDate();

      const [settings, customers, openInvoices, activeRentals] = await Promise.all([
        prisma.settings.findUnique({ where: { id: 'global' } }),
        prisma.customer.findMany({
          where: {
            status: 'ACTIVE',
            ...(body?.customerId ? { id: body.customerId } : {}),
          },
          select: {
            id: true,
            name: true,
            type: true,
            creditLimit: true,
            currentBalance: true,
            paymentTermsDays: true,
            alertChannels: true,
            oldestOutstandingInvoiceDate: true,
          },
        }),
        prisma.invoice.findMany({
          where: {
            ...(body?.customerId ? { customerId: body.customerId } : {}),
            status: { in: ['ISSUED', 'OVERDUE'] },
            balance: { gt: 0 },
          },
          select: {
            id: true,
            invoiceNumber: true,
            customerId: true,
            dueDate: true,
            balance: true,
            status: true,
            paymentStatus: true,
          },
        }),
        prisma.rental.findMany({
          where: {
            ...(body?.customerId ? { customerId: body.customerId } : {}),
            status: 'ACTIVE',
            expectedEndDate: { not: null },
          },
          select: {
            id: true,
            customerId: true,
            agreementNumber: true,
            expectedEndDate: true,
          },
        }),
      ]);

      const maxOutstandingForNewRentals = toNumberDecimal(settings?.maxOutstandingForNewRentals ?? 0);
      const lockAfterDaysOverdue = settings?.lockAfterDaysOverdue ?? 30;

      const invoicesByCustomer = new Map<string, typeof openInvoices>();
      for (const inv of openInvoices) {
        const list = invoicesByCustomer.get(inv.customerId) ?? [];
        list.push(inv);
        invoicesByCustomer.set(inv.customerId, list);
      }

      const rentalsByCustomer = new Map<string, typeof activeRentals>();
      for (const r of activeRentals) {
        const list = rentalsByCustomer.get(r.customerId) ?? [];
        list.push(r);
        rentalsByCustomer.set(r.customerId, list);
      }

      let checkedCustomers = 0;
      let created = 0;
      let skipped = 0;

      for (const customer of customers) {
        checkedCustomers += 1;

        const invoices = invoicesByCustomer.get(customer.id) ?? [];
        const totalOutstanding = invoices.reduce((sum, i) => sum + toNumberDecimal(i.balance), 0);

        const overdue = invoices
          .map((i) => {
            const bal = toNumberDecimal(i.balance);
            const isOverdue = bal > 0 && new Date(i.dueDate).getTime() < now.getTime() && i.paymentStatus !== 'PAID';
            if (!isOverdue) return null;
            const days = Math.max(0, Math.floor((now.getTime() - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
            return {
              invoiceId: i.id,
              invoiceNumber: i.invoiceNumber,
              dueDate: i.dueDate,
              balance: bal,
              daysOverdue: days,
            };
          })
          .filter(Boolean) as Array<{ invoiceId: string; invoiceNumber: string; dueDate: Date; balance: number; daysOverdue: number }>;

        const totalOverdue = overdue.reduce((sum, o) => sum + o.balance, 0);
        const maxDaysOverdue = overdue.reduce((max, o) => Math.max(max, o.daysOverdue), 0);
        const earliestOverdueDueDate = overdue.reduce<Date | null>((min, o) => (min == null || o.dueDate < min ? o.dueDate : min), null);

        const creditLimit = toNumberDecimal(customer.creditLimit);
        const currentBalance = toNumberDecimal(customer.currentBalance);

        const hasCreditLimit = creditLimit > 0;
        const creditLimitExceeded = hasCreditLimit && currentBalance > creditLimit;
        const highBalance = maxOutstandingForNewRentals > 0 && totalOutstanding > maxOutstandingForNewRentals;

        const expiringRentals = (rentalsByCustomer.get(customer.id) ?? []).filter((r) => {
          const end = r.expectedEndDate ? new Date(r.expectedEndDate) : null;
          if (!end) return false;
          const daysToEnd = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return daysToEnd >= 0 && daysToEnd <= 30;
        });

        let alertType: 'PAYMENT_OVERDUE' | 'HIGH_BALANCE' | 'CREDIT_LIMIT_EXCEEDED' | 'AGREEMENT_EXPIRING' | null = null;
        let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null = null;
        let description: string | null = null;
        let amount: number | null = null;
        let dueDate: Date | null = null;
        let relatedAgreement: string | null = null;
        let daysOverdue: number | null = null;

        if (totalOverdue > 0) {
          alertType = 'PAYMENT_OVERDUE';
          amount = totalOverdue;
          dueDate = earliestOverdueDueDate;
          daysOverdue = maxDaysOverdue;
          severity =
            maxDaysOverdue >= 60 ? 'CRITICAL' :
            maxDaysOverdue >= 30 ? 'HIGH' :
            maxDaysOverdue >= 14 ? 'MEDIUM' :
            'LOW';
          description = `Customer has overdue invoices. Total overdue Rs. ${totalOverdue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
        } else if (creditLimitExceeded) {
          alertType = 'CREDIT_LIMIT_EXCEEDED';
          amount = currentBalance;
          severity = currentBalance >= creditLimit * 1.25 ? 'CRITICAL' : 'HIGH';
          description = `Customer balance exceeds credit limit. Balance Rs. ${currentBalance.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / Limit Rs. ${creditLimit.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
        } else if (highBalance) {
          alertType = 'HIGH_BALANCE';
          amount = totalOutstanding;
          severity = totalOutstanding >= maxOutstandingForNewRentals * 2 ? 'HIGH' : 'MEDIUM';
          description = `Customer outstanding balance is high. Total outstanding Rs. ${totalOutstanding.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
        } else if (expiringRentals.length > 0) {
          alertType = 'AGREEMENT_EXPIRING';
          severity = 'LOW';
          relatedAgreement = expiringRentals[0]?.agreementNumber ?? null;
          const end = expiringRentals[0]?.expectedEndDate ? new Date(expiringRentals[0].expectedEndDate) : null;
          dueDate = end;
          description = `Rental agreement is expiring soon${relatedAgreement ? ` (${relatedAgreement})` : ''}.`;
        }

        const shouldCreate = alertType != null;
        if (!shouldCreate) continue;

        const existingToday = await prisma.outstandingAlert.findFirst({
          where: {
            customerId: customer.id,
            alertType,
            status: { not: 'RESOLVED' },
            generatedAt: { gte: todayStart, lte: todayEnd },
          },
          select: { id: true },
        });

        if (existingToday) {
          skipped += 1;
          continue;
        }

        const rawChannels = Array.isArray(customer.alertChannels) ? customer.alertChannels : [];
        const channel = rawChannels.includes('SMS') ? 'SMS' : 'EMAIL';

        const totalOutstandingStr = totalOutstanding.toFixed(2);
        const totalOverdueStr = totalOverdue.toFixed(2);

        const creditLockTriggered =
          (settings?.enableCreditLock ?? true) &&
          (maxDaysOverdue >= lockAfterDaysOverdue || creditLimitExceeded);

        await prisma.outstandingAlert.create({
          data: {
            customerId: customer.id,
            generatedAt: now,
            scheduleDay,
            channel,
            status: 'ACTIVE',
            alertType,
            severity,
            description,
            amount: amount != null ? amount.toFixed(2) : null,
            dueDate,
            relatedAgreement,
            relatedMachine: null,
            daysOverdue,
            overdueInvoices: overdue.map((o) => ({
              invoiceId: o.invoiceId,
              invoiceNumber: o.invoiceNumber,
              dueDate: o.dueDate,
              balance: o.balance,
              daysOverdue: o.daysOverdue,
            })),
            totalOutstanding: totalOutstandingStr,
            totalOverdue: totalOverdueStr,
            creditLockTriggered,
          },
        });

        created += 1;
      }

      return successResponse(
        { checkedCustomers, created, skipped },
        created > 0 ? 'Outstanding alerts checked and created successfully' : 'Outstanding alerts checked (no new alerts created)'
      );
    } catch (error: unknown) {
      console.error('Error checking/creating outstanding alerts:', error);
      return errorResponse('Failed to check/create outstanding alerts', 500);
    }
  }
);
