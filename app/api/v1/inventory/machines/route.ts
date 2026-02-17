import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * GET /api/v1/inventory/machines
 * Returns a flat list of all machines with serialNumber and boxNumber exactly as stored in the database.
 * Used by the inventory page view modal and QR codes so displayed/encoded values match the DB.
 */
export const GET = withAuthAndRole(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'],
  async (request: NextRequest) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const search = searchParams.get('search')?.trim();
      const typeFilter = searchParams.get('type');

      const where: Record<string, unknown> = {};

      if (search) {
        where.OR = [
          { brand: { name: { contains: search, mode: 'insensitive' } } },
          { model: { name: { contains: search, mode: 'insensitive' } } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { boxNumber: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (typeFilter) {
        where.type = { name: { equals: typeFilter, mode: 'insensitive' } };
      }

      const machines = await prisma.machine.findMany({
        where,
        orderBy: [{ brand: { name: 'asc' } }, { model: { name: 'asc' } }, { serialNumber: 'asc' }],
        select: {
          id: true,
          serialNumber: true,
          boxNumber: true,
          brand: { select: { name: true } },
          model: { select: { name: true } },
          type: { select: { name: true } },
        },
      });

      const machinesForFrontend = machines.map((m) => ({
        id: m.id,
        brand: m.brand.name,
        model: m.model?.name ?? 'N/A',
        type: m.type?.name ?? 'Other',
        serialNumber: m.serialNumber ?? '',
        boxNumber: m.boxNumber ?? '',
      }));

      return successResponse(
        { machines: machinesForFrontend },
        'Machines retrieved successfully'
      );
    } catch (error: unknown) {
      console.error('Error fetching inventory machines:', error);
      return errorResponse('Failed to retrieve machines', 500);
    }
  }
);
