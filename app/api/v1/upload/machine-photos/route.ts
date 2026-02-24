import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import { uploadMultipleBase64Images, generateUniqueFileName, STORAGE_BUCKETS } from '@/lib/supabase-storage';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/upload/machine-photos:
 *   post:
 *     summary: Upload machine photos
 *     description: Upload machine photos to Supabase Storage with Supabase auth
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - machineId
 *               - photos
 *             properties:
 *               machineId:
 *                 type: string
 *                 format: uuid
 *               photos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     imageData:
 *                       type: string
 *                       description: Base64 encoded image
 *                     contentType:
 *                       type: string
 *                       default: image/jpeg
 *               append:
 *                 type: boolean
 *                 default: true
 */
export const POST = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { machineId, photos, append = true } = body;

    if (!machineId || !photos || !Array.isArray(photos) || photos.length === 0) {
      return validationErrorResponse('Missing required fields', {
        machineId: !machineId ? ['Machine ID is required'] : [],
        photos: (!photos || !Array.isArray(photos) || photos.length === 0) 
          ? ['At least one photo is required'] 
          : [],
      });
    }

    // Find machine
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
    });

    if (!machine) {
      return errorResponse('Machine not found', 404);
    }

    // Prepare images for upload
    const imagesToUpload = photos.map((photo, index) => {
      const fileName = generateUniqueFileName(
        `machine-${machine.serialNumber}-photo-${index + 1}`,
        'jpg'
      );
      return {
        fileName: `machines/${fileName}`,
        base64Data: photo.imageData,
        contentType: photo.contentType || 'image/jpeg',
      };
    });

    // Upload to Supabase Storage
    const publicUrls = await uploadMultipleBase64Images(
      STORAGE_BUCKETS.MACHINE_PHOTOS,
      imagesToUpload
    );

    // Update machine record with photo URLs
    const existingPhotos = machine.photos || [];
    const updatedPhotos = append 
      ? [...existingPhotos, ...publicUrls] 
      : publicUrls;

    await prisma.machine.update({
      where: { id: machine.id },
      data: { photos: updatedPhotos },
    });

    return successResponse(
      { photoUrls: updatedPhotos },
      `${photos.length} photo(s) uploaded successfully`
    );
  } catch (error: any) {
    console.error('Error uploading machine photos:', error);
    return errorResponse('Failed to upload machine photos', 500);
  }
});