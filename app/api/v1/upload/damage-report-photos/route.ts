import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import { uploadMultipleBase64Images, generateUniqueFileName, STORAGE_BUCKETS } from '@/lib/supabase-storage';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/upload/damage-report-photos:
 *   post:
 *     summary: Upload damage report photos
 *     description: Upload photos to damage report using Supabase auth
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { damageReportId, photos, append = true } = body;

    // Validate required fields
    if (!damageReportId || !photos || !Array.isArray(photos) || photos.length === 0) {
      return validationErrorResponse('Missing required fields', {
        damageReportId: !damageReportId ? ['Damage report ID is required'] : [],
        photos: (!photos || !Array.isArray(photos) || photos.length === 0) 
          ? ['At least one photo is required'] 
          : [],
      });
    }

    // Check if damage report exists
    const damageReport = await prisma.damageReport.findUnique({ 
      where: { id: damageReportId } 
    });
    if (!damageReport) {
      return errorResponse('Damage report not found', 404);
    }

    // Prepare images for upload
    const imagesToUpload = photos.map((photo, index) => {
      const fileName = generateUniqueFileName(
        `damage-report-${damageReportId}-photo-${index + 1}`,
        'jpg'
      );
      return {
        fileName: `damage-reports/${fileName}`,
        base64Data: photo.imageData,
        contentType: photo.contentType || 'image/jpeg',
      };
    });

    // Upload to Supabase Storage
    const publicUrls = await uploadMultipleBase64Images(
      STORAGE_BUCKETS.DAMAGE_REPORT_PHOTOS,
      imagesToUpload
    );

    // Update damage report record with photo URLs
    const existingPhotos = damageReport.photos || [];
    const updatedPhotos = append 
      ? [...existingPhotos, ...publicUrls] 
      : publicUrls;

      await prisma.damageReport.update({
        where: { id: damageReportId },
        data: { photos: updatedPhotos },
      });

    return successResponse(
      {
        uploadedUrls: publicUrls,
        totalPhotos: updatedPhotos.length,
        damageReportId,
      },
      `${publicUrls.length} photo(s) uploaded successfully`
    );
  } catch (error: any) {
    console.error('Error uploading damage report photos:', error);
    return errorResponse(error.message || 'Failed to upload damage report photos', 500);
  }
});
