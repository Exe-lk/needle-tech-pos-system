import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/inventory/transactions:
 *   get:
 *     summary: List stock transactions
 *     description: Returns stock-in/stock-out transactions for history view
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *         description: Filter by model
 *       - in: query
 *         name: transactionType
 *         schema:
 *           type: string
 *           enum: [Stock In, Stock Out]
 *         description: Filter by transaction type
 *       - in: query
 *         name: stockType
 *         schema:
 *           type: string
 *           enum: [New, Used]
 *         description: Filter by stock type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter from date (ISO date)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter to date (ISO date)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER', 'OPERATOR', 'USER', 'Stock_Keeper'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder } = parseQueryParams(searchParams);
    
    const brandFilter = searchParams.get('brand');
    const modelFilter = searchParams.get('model');
    const transactionTypeFilter = searchParams.get('transactionType');
    const stockTypeFilter = searchParams.get('stockType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    const where: any = {};
    
    // Filter by brand
    if (brandFilter) {
      where.brand = { contains: brandFilter, mode: 'insensitive' };
    }
    
    // Filter by model
    if (modelFilter) {
      where.model = { contains: modelFilter, mode: 'insensitive' };
    }
    
    // Filter by transaction type (Stock In or Stock Out)
    if (transactionTypeFilter) {
      const typeMap: Record<string, string> = {
        'Stock In': 'STOCK_IN',
        'Stock Out': 'STOCK_OUT',
      };
      where.transactionType = typeMap[transactionTypeFilter] || transactionTypeFilter;
    } else {
      // Default to only Stock In and Stock Out transactions
      where.transactionType = { in: ['STOCK_IN', 'STOCK_OUT'] };
    }
    
    // Filter by stock type
    if (stockTypeFilter) {
      where.stockType = stockTypeFilter;
    }
    
    // Filter by date range
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    
    const totalItems = await prisma.bincardEntry.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 'asc' ? 'asc' : 'desc';
    
    const entries = await prisma.bincardEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy || 'date']: sortOrder_ },
    });
    
    // Transform for frontend
    const transactions = entries.map((entry: any) => ({
      id: entry.id,
      brand: entry.brand,
      model: entry.model,
      type: entry.machineType || '',
      transactionType: entry.transactionType === 'STOCK_IN' ? 'Stock In' : 'Stock Out',
      stockType: entry.stockType || null,
      quantity: entry.transactionType === 'STOCK_IN' ? entry.quantityIn : entry.quantityOut,
      warrantyExpiry: entry.warrantyExpiry ? entry.warrantyExpiry.toISOString().split('T')[0] : null,
      condition: entry.condition || null,
      location: entry.location || '',
      notes: entry.notes || '',
      transactionDate: entry.date.toISOString().split('T')[0],
      performedBy: entry.performedBy || '',
    }));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
       transactions ,
      pagination,
      'Stock transactions retrieved successfully',
      { sortBy: sortBy || 'date', sortOrder: sortOrder_ },
      undefined,
      {
        ...(brandFilter && { brand: brandFilter }),
        ...(modelFilter && { model: modelFilter }),
        ...(transactionTypeFilter && { transactionType: transactionTypeFilter }),
        ...(stockTypeFilter && { stockType: stockTypeFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching stock transactions:', error);
    return errorResponse('Failed to retrieve stock transactions', 500);
  }
});
