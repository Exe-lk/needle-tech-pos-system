import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/transaction-log:
 *   get:
 *     summary: Get transaction logs
 *     description: Retrieve paginated list of all system transactions
 *     tags: [Transaction Log]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parsed = parseQueryParams(searchParams);
    const page = parsed.page;
    const limit = parsed.limit;
    const sortBy = searchParams.get('sortBy') || 'transactionDate';
    const sortOrder = parsed.sortOrder;
    const search = parsed.search;
    
    const categoryFilter = searchParams.get('category');
    const transactionTypeFilter = searchParams.get('transactionType');
    const statusFilter = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    
    if (categoryFilter) {
      where.category = categoryFilter.toUpperCase();
    }
    
    if (transactionTypeFilter) {
      where.transactionType = { contains: transactionTypeFilter, mode: 'insensitive' };
    }
    
    if (statusFilter) {
      where.status = statusFilter.toUpperCase();
    }
    
    if (dateFrom || dateTo) {
      where.transactionDate = {};
      if (dateFrom) where.transactionDate.gte = new Date(dateFrom);
      if (dateTo) where.transactionDate.lte = new Date(dateTo);
    }
    
    const totalItems = await prisma.transactionLog.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 'asc' ? 'asc' : 'desc';
    
    const transactions = await prisma.transactionLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: { customer: true }
    });
    
    // Transform for frontend
    const transformed = transactions.map((tx: any) => {
      const date = new Date(tx.transactionDate);
      return {
        id: tx.id,
        transactionDate: date.toISOString().split('T')[0],
        transactionTime: date.toTimeString().split(' ')[0],
        category: tx.category.charAt(0) + tx.category.slice(1).toLowerCase(),
        transactionType: tx.transactionType,
        reference: tx.reference || '',
        description: tx.description,
        brand: tx.brand || null,
        model: tx.model || null,
        customer: tx.customer?.name || null,
        amount: tx.amount ? parseFloat(tx.amount.toString()) : null,
        quantity: tx.quantity || null,
        location: tx.location || '',
        performedBy: tx.performedBy || '',
        status: tx.status.charAt(0) + tx.status.slice(1).toLowerCase(),
        notes: tx.notes || '',
      };
    });
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      transformed,
      pagination,
      'Transaction logs retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(categoryFilter && { category: categoryFilter }),
        ...(transactionTypeFilter && { transactionType: transactionTypeFilter }),
        ...(statusFilter && { status: statusFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching transaction logs:', error);
    return errorResponse('Failed to retrieve transaction logs', 500);
  }
});
