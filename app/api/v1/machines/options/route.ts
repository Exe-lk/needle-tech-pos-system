import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * GET /api/v1/machines/options
 * Query params:
 * - kind=brands|models|types
 * - brand=<brandName> (required for models/types)
 * - model=<modelName> (required for types)
 *
 * Used by Hiring Machine Agreement create form cascading dropdowns.
 */
export const GET = withAuthAndRole(
  ['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER', 'OPERATOR', 'USER', 'Stock_Keeper'],
  async (request: NextRequest) => {
    try {
      const sp = request.nextUrl.searchParams;
      const kind = (sp.get('kind') || '').trim();
      const brand = (sp.get('brand') || '').trim();
      const model = (sp.get('model') || '').trim();

      if (kind === 'brands') {
        const brands = await prisma.brand.findMany({
          where: { isActive: true },
          select: { name: true },
          orderBy: { name: 'asc' },
        });
        return successResponse(
          { brands: brands.map((b) => b.name).filter((n): n is string => Boolean(n && n.trim())) },
          'Machine brands retrieved successfully'
        );
      }

      if (kind === 'models') {
        if (!brand) return errorResponse('brand is required', 400);
        const brandRow = await prisma.brand.findFirst({
          where: { name: { equals: brand, mode: 'insensitive' } },
          select: { id: true },
        });
        if (!brandRow) return successResponse({ models: [] }, 'Machine models retrieved successfully');

        const models = await prisma.model.findMany({
          where: { brandId: brandRow.id, isActive: true },
          select: { name: true },
          orderBy: { name: 'asc' },
        });
        return successResponse(
          { models: models.map((m) => m.name).filter((n): n is string => Boolean(n && n.trim())) },
          'Machine models retrieved successfully'
        );
      }

      if (kind === 'types') {
        if (!brand) return errorResponse('brand is required', 400);
        if (!model) return errorResponse('model is required', 400);

        // Types are derived from machines that exist for the given brand+model
        // (so the agreement form only offers valid combinations).
        const rows = await prisma.machine.findMany({
          where: {
            status: { not: 'RETIRED' },
            brand: { name: { equals: brand, mode: 'insensitive' } },
            model: { name: { equals: model, mode: 'insensitive' } },
          },
          distinct: ['typeId'],
          select: { type: { select: { name: true } } },
        });

        const types = rows
          .map((r) => r.type?.name ?? null)
          .filter((n): n is string => Boolean(n && n.trim()))
          .sort((a, b) => a.localeCompare(b));

        return successResponse({ types }, 'Machine types retrieved successfully');
      }

      return errorResponse('Invalid kind. Use kind=brands|models|types', 400);
    } catch (error: unknown) {
      console.error('Error fetching machine options:', error);
      return errorResponse('Failed to retrieve machine options', 500);
    }
  }
);

