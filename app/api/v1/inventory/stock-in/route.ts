import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole, AuthUser } from '@/lib/auth-middleware';
import { performStockIn, type StockInLineInput } from '@/lib/inventory/stock-in';

/**
 * @swagger
 * /api/v1/inventory/stock-in:
 *   post:
 *     summary: Create stock-in transactions
 *     description: Records one or more stock-in transactions with machine units
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER', 'Stock_Keeper'], async (request: NextRequest, auth: AuthUser) => {
  try {
    const body = await request.json();
    const { transactions } = body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return validationErrorResponse('Missing required fields', {
        transactions: ['At least one transaction is required'],
      });
    }

    const errors: Record<string, string[]> = {};

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const {
        brand: brandName,
        model: modelName,
        type: typeName,
        quantity,
        location,
        machines: machineUnits = [],
      } = transaction;

      if (!brandName) {
        errors[`transactions[${i}].brand`] = ['Brand is required'];
      }
      if (!modelName) {
        errors[`transactions[${i}].model`] = ['Model is required'];
      }
      if (!typeName) {
        errors[`transactions[${i}].type`] = ['Type is required'];
      }
      if (!quantity || quantity <= 0) {
        errors[`transactions[${i}].quantity`] = ['Quantity must be greater than 0'];
      }
      if (!location) {
        errors[`transactions[${i}].location`] = ['Location is required'];
      }
      if (machineUnits.length !== quantity) {
        errors[`transactions[${i}].machines`] = [`Number of machine units (${machineUnits.length}) must match quantity (${quantity})`];
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse('Validation failed', errors);
    }

    const result = await performStockIn(transactions as StockInLineInput[], {
      onboardedByUserId: auth.id,
      performedByFallback: auth.email || 'System',
      skipDuplicates: false,
    });

    return successResponse(
      {
        transactionIds: result.transactionIds,
        totalUnits: result.totalUnits,
      },
      'Stock in recorded successfully',
      201
    );
  } catch (error: unknown) {
    console.error('Error creating stock-in transactions:', error);
    const message = error instanceof Error ? error.message : 'Failed to create stock-in transactions';
    return errorResponse(message, 500);
  }
});
