import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole, AuthUser } from '@/lib/auth-middleware';
import { performStockIn } from '@/lib/inventory/stock-in';
import {
  IMPORT_MAX_FILE_BYTES,
  groupValidRowsIntoStockInLines,
  parseMachineImportWorkbook,
  type ImportRowError,
} from '@/lib/inventory/import-parse';

export const maxDuration = 120;

const ALLOWED_EXTENSIONS = new Set(['csv', 'xlsx', 'xls']);

/**
 * @swagger
 * /api/v1/inventory/import:
 *   post:
 *     summary: Bulk import machines from CSV or Excel
 *     description: Parses a template file, creates valid machine units as stock-in, and skips invalid or duplicate rows
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(
  ['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER', 'Stock_Keeper'],
  async (request: NextRequest, auth: AuthUser) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file');

      if (!(file instanceof File)) {
        return validationErrorResponse('Missing required fields', {
          file: ['A CSV or Excel file is required'],
        });
      }

      if (file.size === 0) {
        return validationErrorResponse('Invalid file', {
          file: ['The uploaded file is empty'],
        });
      }

      if (file.size > IMPORT_MAX_FILE_BYTES) {
        return validationErrorResponse('File too large', {
          file: [`Maximum file size is ${Math.round(IMPORT_MAX_FILE_BYTES / (1024 * 1024))}MB`],
        });
      }

      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        return validationErrorResponse('Invalid file type', {
          file: ['Upload a .csv, .xlsx, or .xls file'],
        });
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const parsed = parseMachineImportWorkbook(bytes);
      const errors: ImportRowError[] = [...parsed.errors];

      let imported = 0;
      let createdCatalog = { brands: [] as string[], models: [] as string[], types: [] as string[] };

      if (parsed.validRows.length > 0) {
        const lines = groupValidRowsIntoStockInLines(parsed.validRows);
        const result = await performStockIn(lines, {
          onboardedByUserId: auth.id,
          performedByFallback: auth.email || 'System',
          skipDuplicates: true,
          timeoutMs: 120_000,
        });

        imported = result.totalUnits;
        createdCatalog = result.createdCatalog;

        const rowBySerial = new Map(parsed.validRows.map((row) => [row.serialNumber, row.row]));
        for (const skipped of result.skippedSerials) {
          errors.push({
            row: rowBySerial.get(skipped.serialNumber) ?? 0,
            serialNumber: skipped.serialNumber,
            message: skipped.reason,
          });
        }
      }

      if (parsed.totalDataRows === 0 && errors.length > 0) {
        return validationErrorResponse(errors[0]?.message || 'No machine rows found', {
          file: errors.map((error) => error.message),
        });
      }

      if (imported === 0 && parsed.validRows.length === 0) {
        return validationErrorResponse('No valid machine rows to import', {
          rows: errors.map((error) => `Row ${error.row}: ${error.message}`),
        });
      }

      const skipped = errors.length;
      const message =
        skipped > 0
          ? `Imported ${imported} machine(s). ${skipped} row(s) skipped.`
          : `Imported ${imported} machine(s) successfully.`;

      return successResponse(
        {
          imported,
          skipped,
          createdCatalog,
          errors,
        },
        message,
        201
      );
    } catch (error: unknown) {
      console.error('Error importing machines:', error);
      const message = error instanceof Error ? error.message : 'Failed to import machines';
      return errorResponse(message, 500);
    }
  }
);
