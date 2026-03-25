import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/client';

/**
 * @swagger
 * /api/v1/settings:
 *   get:
 *     summary: Get global settings
 *     description: Retrieve system-wide settings with Supabase auth
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 */
export const GET = withAuthAndRole(['ADMIN', 'Operational_Officer', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: 'global' }
    });

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.settings.create({
        data: {
          id: 'global',
          companyName: 'Needle Tech',
          companyAddress: '123 Business Street',
          currency: 'USD',
          defaultVatRate: new Decimal(15),
        }
      });
    }

    return successResponse(settings, 'Settings retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return errorResponse('Failed to retrieve settings', 500);
  }
});

/**
 * @swagger
 * /api/v1/settings:
 *   put:
 *     summary: Update global settings
 *     description: Update system-wide settings (Admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               companyName:
 *                 type: string
 *               companyAddress:
 *                 type: string
 *               currency:
 *                 type: string
 *               defaultVatRate:
 *                 type: number
 */
export const PUT = withAuthAndRole(['ADMIN', 'Operational_Officer'], async (request: NextRequest) => {
    try {
    const body = await request.json();
      const { companyName, companyAddress, currency, defaultVatRate, ...otherFields } = body;

      const updated = await prisma.settings.update({
        where: { id: 'global' },
        data: {
          ...(companyName !== undefined && { companyName }),
          ...(companyAddress !== undefined && { companyAddress }),
          ...(currency !== undefined && { currency }),
          ...(defaultVatRate !== undefined && { defaultVatRate: new Decimal(defaultVatRate) }),
          ...otherFields,
        }
      });

      return successResponse(updated, 'Settings updated successfully');
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return errorResponse('Failed to update settings', 500);
  }
});
