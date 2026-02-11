import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/bincard/entries:
 *   get:
 *     summary: Get bincard entries (stock movements)
 *     description: Retrieve paginated list of stock movement entries
 *     tags: [Bincard]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder } = parseQueryParams(searchParams);
    
    const brandFilter = searchParams.get('brand');
    const modelFilter = searchParams.get('model');
    const transactionTypeFilter = searchParams.get('transactionType');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    const where: any = {};
    
    if (brandFilter) {
      where.brand = { contains: brandFilter, mode: 'insensitive' };
    }
    if (modelFilter) {
      where.model = { contains: modelFilter, mode: 'insensitive' };
    }
    if (transactionTypeFilter) {
      // Map frontend values to enum values
      const typeMap: Record<string, string> = {
        'Stock In': 'STOCK_IN',
        'Stock Out': 'STOCK_OUT',
        'Rental Out': 'RENTAL_OUT',
        'Return In': 'RETURN_IN',
        'Maintenance Out': 'MAINTENANCE_OUT',
        'Maintenance In': 'MAINTENANCE_IN',
        'Retired': 'RETIRED',
      };
      where.transactionType = typeMap[transactionTypeFilter] || transactionTypeFilter;
    }
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }
    
    const totalItems = await prisma.bincardEntry.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const entries = await prisma.bincardEntry.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
    });
    
    // Transform for frontend
    const transformed = entries.map((entry: any) => ({
      id: entry.id,
      date: entry.date,
      brand: entry.brand,
      model: entry.model,
      type: entry.machineType || '',
      transactionType: entry.transactionType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      reference: entry.reference || '',
      in: entry.quantityIn,
      out: entry.quantityOut,
      balance: entry.balance,
      location: entry.location || '',
      performedBy: entry.performedBy || '',
      notes: entry.notes || '',
    }));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      { entries: transformed },
      pagination,
      'Bincard entries retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      undefined,
      {
        ...(brandFilter && { brand: brandFilter }),
        ...(modelFilter && { model: modelFilter }),
        ...(transactionTypeFilter && { transactionType: transactionTypeFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching bincard entries:', error);
    return errorResponse('Failed to retrieve bincard entries', 500);
  }
});
