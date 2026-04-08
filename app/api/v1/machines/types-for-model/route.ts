import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * GET /api/v1/machines/types-for-model?brandId=&modelId=
 * Returns active machine types that already appear on at least one machine for this brand + model.
 */
export const GET = withAuthAndRole(
  [
    'SUPER_ADMIN',
    'ADMIN',
    'Operational_Officer',
    'MANAGER',
    'OPERATOR',
    'USER',
    'Stock_Keeper',
  ],
  async (request: NextRequest) => {
    try {
      const brandId = request.nextUrl.searchParams.get('brandId')?.trim();
      const modelId = request.nextUrl.searchParams.get('modelId')?.trim();

      if (!brandId || !modelId) {
        return validationErrorResponse('brandId and modelId are required', {
          query: ['Provide brandId and modelId as query parameters'],
        });
      }

      const types = await prisma.machineType.findMany({
        where: {
          isActive: true,
          machines: {
            some: {
              brandId,
              modelId,
            },
          },
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
        },
      });

      return successResponse(types, 'Machine types for brand/model retrieved successfully');
    } catch (error: unknown) {
      console.error('Error fetching machine types for brand/model:', error);
      return errorResponse('Failed to retrieve machine types for brand/model', 500);
    }
  }
);
