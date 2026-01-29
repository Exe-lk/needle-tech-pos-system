import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth';
import { uploadBase64Image, STORAGE_BUCKETS } from '@/lib/supabase-storage';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * POST /api/v1/upload/qr-code
 * Upload QR code image to Supabase Storage and update machine record
 * 
 * Body:
 * - machineId: string (MongoDB ObjectId) OR serialNumber: string
 * - qrCodeValue: string (QR code value for filename)
 * - imageData: string (base64 encoded image with or without data URL prefix)
 */
export const POST = withAuth(async (request: NextRequest) => {
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

    const db = await getDatabase();

    // Find machine by ID or serial number
    let machine;
    if (serialNumber) {
      machine = await db.collection('machines').findOne({ serialNumber });
      if (!machine) {
        return errorResponse('Machine not found with serial number: ' + serialNumber, 404);
      }
    } else {
      // Validate ObjectId format
      if (!ObjectId.isValid(machineId)) {
        return validationErrorResponse('Invalid machine ID format');
      }
      machine = await db.collection('machines').findOne({ _id: new ObjectId(machineId) });
      if (!machine) {
        return errorResponse('Machine not found', 404);
      }
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
    await db.collection('machines').updateOne(
      { _id: machine._id },
      {
        $set: {
          'qrCode.imageUrl': publicUrl,
          updatedAt: new Date(),
        },
      }
    );

    return successResponse(
      {
        imageUrl: publicUrl,
        machineId: machine._id.toString(),
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
