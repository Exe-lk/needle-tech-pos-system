import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month'); // Format: YYYY-MM
    const year = searchParams.get('year'); // Format: YYYY
    
    let startDate: Date;
    let endDate: Date;
    
    if (month && year) {
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    
    // Total rentals
    const totalRentals = await prisma.rental.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });
    
    // Total revenue
    const invoices = await prisma.invoice.findMany({
      where: {
        issueDate: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        grandTotal: true,
        taxCategory: true,
        paymentStatus: true,
        balance: true,
      },
    });
    
    // Total payments received
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { totalAmount: true },
    });
    
    // Calculations
    const totalRevenue = invoices.reduce((sum, inv) => sum + (parseFloat(inv.grandTotal?.toString() || '0')), 0);
    const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.totalAmount?.toString() || '0'), 0);
    
    const vatInvoices = invoices.filter(inv => inv.taxCategory === 'VAT');
    const nonVatInvoices = invoices.filter(inv => inv.taxCategory === 'NON_VAT');
    
    const vatRevenue = vatInvoices.reduce((sum, inv) => sum + parseFloat(inv.grandTotal?.toString() || '0'), 0);
    const nonVatRevenue = nonVatInvoices.reduce((sum, inv) => sum + parseFloat(inv.grandTotal?.toString() || '0'), 0);
    
    // Machine utilization
    const activeRentals = await prisma.rental.count({
      where: {
        status: 'ACTIVE',
        createdAt: { lte: endDate },
      },
    });
    
    const totalMachines = await prisma.machine.count({
      where: {
        status: { not: 'RETIRED' },
      },
    });
    
    const utilizationRate = totalMachines > 0 ? (activeRentals / totalMachines) * 100 : 0;
    
    // Outstanding amounts
    const outstandingInvoices = invoices.filter(inv => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(inv.paymentStatus));
    const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + parseFloat(inv.balance?.toString() || '0'), 0);
    
    // Returns and damages
    const returns = await prisma.return.count({
      where: {
        returnDate: { gte: startDate, lte: endDate },
      },
    });
    
    const damageReports = await prisma.damageReport.count({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
    });
    
    const analytics = {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      rentals: {
        total: totalRentals,
        active: activeRentals,
      },
      revenue: {
        total: totalRevenue,
        vat: vatRevenue,
        nonVat: nonVatRevenue,
        paymentsReceived: totalPayments,
      },
      machines: {
        total: totalMachines,
        rented: activeRentals,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
      },
      financials: {
        totalOutstanding: totalOutstanding,
        totalPayments: totalPayments,
      },
      operations: {
        totalReturns: returns,
        totalDamages: damageReports,
      },
    };
    
    return successResponse(analytics, 'Month-end analytics retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return errorResponse('Failed to retrieve analytics', 500);
  }
});
