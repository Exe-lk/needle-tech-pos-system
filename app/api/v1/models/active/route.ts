import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const brandId = searchParams.get('brandId');
    
    const where: any = { isActive: true };
    if (brandId) where.brandId = brandId;
    
    const models = await prisma.model.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { brand: true }
    });
    
    return successResponse(models, 'Active models retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching active models:', error);
    return errorResponse('Failed to retrieve active models', 500);
  }
});
