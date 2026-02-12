import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/bincard/summary:
 *   get:
 *     summary: Get bincard summary by brand/model
 *     description: Retrieve summary of stock movements grouped by brand and model
 *     tags: [Bincard]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brandFilter = searchParams.get('brand');
    const modelFilter = searchParams.get('model');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    const where: any = {};
    
    if (brandFilter) {
      where.brand = { contains: brandFilter, mode: 'insensitive' };
    }
    if (modelFilter) {
      where.model = { contains: modelFilter, mode: 'insensitive' };
    }
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    
    // Get all entries for the filter
    const entries = await prisma.bincardEntry.findMany({
      where,
      orderBy: { date: 'asc' },
    });
    
    // Group by brand and model
    const grouped = entries.reduce((acc: any, entry: any) => {
      const key = `${entry.brand}|||${entry.model}|||${entry.machineType || 'N/A'}`;
      if (!acc[key]) {
        acc[key] = {
          brand: entry.brand,
          model: entry.model,
          type: entry.machineType || '',
          totalIn: 0,
          totalOut: 0,
          closingBalance: 0,
          lastTransactionDate: entry.date,
        };
      }
      acc[key].totalIn += entry.quantityIn;
      acc[key].totalOut += entry.quantityOut;
      acc[key].closingBalance = entry.balance;
      if (entry.date > acc[key].lastTransactionDate) {
        acc[key].lastTransactionDate = entry.date;
      }
      return acc;
    }, {});
    
    // Convert to array and calculate opening balance
    const summary = Object.values(grouped).map((item: any) => ({
      brand: item.brand,
      model: item.model,
      type: item.type,
      openingBalance: item.closingBalance - item.totalIn + item.totalOut,
      totalIn: item.totalIn,
      totalOut: item.totalOut,
      closingBalance: item.closingBalance,
      lastTransactionDate: item.lastTransactionDate,
    }));
    
    return successResponse(
      { summary },
      'Bincard summary retrieved successfully'
    );
  } catch (error: any) {
    console.error('Error fetching bincard summary:', error);
    return errorResponse('Failed to retrieve bincard summary', 500);
  }
});
