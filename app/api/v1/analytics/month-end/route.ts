import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse } from '@/lib/api-response';
import { sanitizeObject } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
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
    const totalRentals = await db.collection('rentals').countDocuments({
      createdAt: { $gte: startDate, $lte: endDate },
    });
    
    // Total revenue
    const rentals = await db.collection('rentals').find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).toArray();
    
    const totalRevenue = rentals.reduce((sum, rental) => sum + (rental.financials?.total || 0), 0);
    
    // Total payments received
    const payments = await db.collection('payments').find({
      paidAt: { $gte: startDate, $lte: endDate },
    }).toArray();
    
    const totalPayments = payments.reduce((sum, payment) => sum + (payment.totalAmount || 0), 0);
    
    // VAT vs Non-VAT breakdown
    const invoices = await db.collection('invoices').find({
      issueDate: { $gte: startDate, $lte: endDate },
    }).toArray();
    
    const vatInvoices = invoices.filter(inv => inv.taxCategory === 'VAT');
    const nonVatInvoices = invoices.filter(inv => inv.taxCategory === 'NON_VAT');
    
    const vatRevenue = vatInvoices.reduce((sum, inv) => sum + (inv.totals?.grandTotal || 0), 0);
    const nonVatRevenue = nonVatInvoices.reduce((sum, inv) => sum + (inv.totals?.grandTotal || 0), 0);
    
    // Machine utilization
    const activeRentals = await db.collection('rentals').countDocuments({
      status: 'ACTIVE',
      createdAt: { $lte: endDate },
    });
    
    const totalMachines = await db.collection('machines').countDocuments({
      status: { $ne: 'RETIRED' },
    });
    
    const utilizationRate = totalMachines > 0 ? (activeRentals / totalMachines) * 100 : 0;
    
    // Outstanding amounts
    const outstandingInvoices = await db.collection('invoices').find({
      paymentStatus: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
    }).toArray();
    
    const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    
    // Returns and damages
    const returns = await db.collection('returns').find({
      returnDate: { $gte: startDate, $lte: endDate },
    }).toArray();
    
    const damageReports = await db.collection('damageReports').find({
      createdAt: { $gte: startDate, $lte: endDate },
    }).toArray();
    
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
        totalReturns: returns.length,
        totalDamages: damageReports.length,
      },
    };
    
    return successResponse(sanitizeObject(analytics), 'Month-end analytics retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return errorResponse('Failed to retrieve analytics', 500);
  }
}
