import { NextRequest } from 'next/server';
import { errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import { buildMachineImportTemplate } from '@/lib/inventory/import-parse';

/**
 * @swagger
 * /api/v1/inventory/import/template:
 *   get:
 *     summary: Download machine import template
 *     description: CSV or XLSX template for bulk machine stock-in
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(
  ['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER', 'Stock_Keeper'],
  async (request: NextRequest) => {
    try {
      const formatParam = request.nextUrl.searchParams.get('format')?.toLowerCase();
      const format = formatParam === 'xlsx' ? 'xlsx' : formatParam === 'csv' ? 'csv' : null;
      if (formatParam && !format) {
        return validationErrorResponse('Invalid format', {
          format: ['Use csv or xlsx'],
        });
      }

      const resolvedFormat = format ?? 'csv';
      const buffer = buildMachineImportTemplate(resolvedFormat);
      const body = new Uint8Array(buffer);
      const date = new Date().toISOString().split('T')[0];

      if (resolvedFormat === 'xlsx') {
        return new Response(body, {
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="machine-import-template_${date}.xlsx"`,
          },
        });
      }

      return new Response(body, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="machine-import-template_${date}.csv"`,
        },
      });
    } catch (error: unknown) {
      console.error('Error generating import template:', error);
      return errorResponse('Failed to generate import template', 500);
    }
  }
);
