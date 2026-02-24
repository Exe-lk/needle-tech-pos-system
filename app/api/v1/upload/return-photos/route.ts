import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import { uploadMultipleBase64Images, generateUniqueFileName, STORAGE_BUCKETS } from '@/lib/supabase-storage';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/upload/return-photos:
 *   post:
 *     summary: Upload return inspection photos
 *     description: Upload photos for return inspection with Supabase auth
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { returnId, photos, append = true } = body;

    // Validate required fields
    if (!returnId || !photos || !Array.isArray(photos) || photos.length === 0) {
      return validationErrorResponse('Missing required fields', {
        returnId: !returnId ? ['Return ID is required'] : [],
        photos: (!photos || !Array.isArray(photos) || photos.length === 0) 
          ? ['At least one photo is required'] 
          : [],
      });
    }

    // Check if return exists
    const returnRecord = await prisma.return.findUnique({ 
      where: { id: returnId } 
    });
    if (!returnRecord) {
      return errorResponse('Return record not found', 404);
    }

    // Prepare images for upload
    const imagesToUpload = photos.map((photo, index) => {
      const fileName = generateUniqueFileName(
        `return-${returnRecord.id}-photo-${index + 1}`,
        'jpg'
      );
      return {
        fileName: `returns/${fileName}`,
        base64Data: photo.imageData,
        contentType: photo.contentType || 'image/jpeg',
      };
    });

    // Upload to Supabase Storage
    const publicUrls = await uploadMultipleBase64Images(
      STORAGE_BUCKETS.RETURN_PHOTOS,
      imagesToUpload
    );

    // Update return record with photo URLs
    const existingPhotos = returnRecord.photos || [];
    const updatedPhotos = append 
      ? [...existingPhotos, ...publicUrls] 
      : publicUrls;

      await prisma.return.update({
        where: { id: returnId },
        data: { photos: updatedPhotos },
      });

    return successResponse(
      {
        uploadedUrls: publicUrls,
        totalPhotos: updatedPhotos.length,
        returnId,
      },
      `${publicUrls.length} photo(s) uploaded successfully`
    );
  } catch (error: any) {
    console.error('Error uploading return photos:', error);
    return errorResponse(error.message || 'Failed to upload return photos', 500);
  }
});
