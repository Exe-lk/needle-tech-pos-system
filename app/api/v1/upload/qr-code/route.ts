import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import { uploadBase64Image, STORAGE_BUCKETS } from '@/lib/supabase-storage';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/upload/qr-code:
 *   post:
 *     summary: Upload QR code image
 *     description: Upload QR code to Supabase Storage with Supabase auth
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { machineId, serialNumber, qrCodeValue, imageData } = body;

    // Validate required fields
    if ((!machineId && !serialNumber) || !qrCodeValue || !imageData) {
      return validationErrorResponse('Missing required fields', {
        machineId: (!machineId && !serialNumber) ? ['Either machineId or serialNumber is required'] : [],
        qrCodeValue: !qrCodeValue ? ['QR code value is required'] : [],
        imageData: !imageData ? ['Image data is required'] : [],
      });
    }

    // Find machine by ID
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
    });

    if (!machine) {
      return errorResponse('Machine not found', 404);
    }

    // Generate file name: qr-codes/{sanitized-qr-value}.png
    const sanitizedQrValue = qrCodeValue.replace(/[^a-zA-Z0-9-_]/g, '-');
    const fileName = `qr-codes/${sanitizedQrValue}.png`;

    // Upload to Supabase Storage
    const publicUrl = await uploadBase64Image(
      STORAGE_BUCKETS.MACHINE_QR_CODES,
      fileName,
      imageData,
      'image/png'
    );

    // Update machine record with QR code image URL
    await prisma.machine.update(
      { where: { id: machine.id } },
      { data: { qrCodeImageUrl: publicUrl } }
    );

    return successResponse(
      {
        imageUrl: publicUrl,
        machineId: machine.id,
        serialNumber: machine.serialNumber,
        qrCodeValue,
      },
      'QR code image uploaded successfully'
    );
  } catch (error: any) {
    console.error('Error uploading QR code image:', error);
    return errorResponse(error.message || 'Failed to upload QR code image', 500);
  }
});
