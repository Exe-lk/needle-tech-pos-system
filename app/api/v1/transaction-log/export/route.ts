import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/api-response';
import { parseQueryParams } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/transaction-log/export:
 *   get:
 *     summary: Export transaction logs
 *     description: Export transaction logs as CSV/XLSX
 *     tags: [Transaction Log]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
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
    
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const transactions = await prisma.transactionLog.findMany({
      where,
      orderBy: { [sortBy]: sortOrder_ },
      include: { customer: true }
    });
    
    // Convert to CSV
    const headers = [
      'Transaction Date',
      'Transaction Time',
      'Category',
      'Transaction Type',
      'Reference',
      'Description',
      'Brand',
      'Model',
      'Customer',
      'Amount',
      'Quantity',
      'Location',
      'Performed By',
      'Status',
      'Notes'
    ];
    
    const rows = transactions.map((tx: any) => {
      const date = new Date(tx.transactionDate);
      return [
        date.toISOString().split('T')[0],
        date.toTimeString().split(' ')[0],
        tx.category.charAt(0) + tx.category.slice(1).toLowerCase(),
        tx.transactionType,
        tx.reference || '',
        tx.description,
        tx.brand || '',
        tx.model || '',
        tx.customer?.name || '',
        tx.amount ? tx.amount.toString() : '',
        tx.quantity?.toString() || '',
        tx.location || '',
        tx.performedBy || '',
        tx.status.charAt(0) + tx.status.slice(1).toLowerCase(),
        tx.notes || '',
      ];
    });
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting transaction logs:', error);
    return errorResponse('Failed to export transaction logs', 500);
  }
});
