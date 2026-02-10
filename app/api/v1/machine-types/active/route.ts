import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const types = await prisma.machineType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    
    return successResponse(types, 'Active machine types retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching active machine types:', error);
    return errorResponse('Failed to retrieve active machine types', 500);
  }
});
