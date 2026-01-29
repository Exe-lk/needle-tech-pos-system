import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth';
import { uploadMultipleBase64Images, generateUniqueFileName, STORAGE_BUCKETS } from '@/lib/supabase-storage';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * POST /api/v1/upload/damage-report-photos
 * Upload damage report photos to Supabase Storage and update damage report record
 * 
 * Body:
 * - damageReportId: string (MongoDB ObjectId)
 * - photos: Array<{ imageData: string, contentType?: string }> (base64 encoded images)
 * - append?: boolean (default: true) - Whether to append to existing photos or replace
 */
export const POST = withAuth(async (request: NextRequest) => {
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

    // Validate ObjectId format
    if (!ObjectId.isValid(damageReportId)) {
      return validationErrorResponse('Invalid damage report ID format');
    }

    const db = await getDatabase();

    // Check if damage report exists
    const damageReport = await db.collection('damageReports').findOne({ 
      _id: new ObjectId(damageReportId) 
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

    await db.collection('damageReports').updateOne(
      { _id: new ObjectId(damageReportId) },
      {
        $set: {
          photos: updatedPhotos,
          updatedAt: new Date(),
        },
      }
    );

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
