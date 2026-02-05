import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth';
import { uploadMultipleBase64Images, generateUniqueFileName, STORAGE_BUCKETS } from '@/lib/supabase-storage';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * POST /api/v1/upload/return-photos
 * Upload return inspection photos to Supabase Storage and update return record
 * 
 * Body:
 * - returnId: string (MongoDB ObjectId)
 * - photos: Array<{ imageData: string, contentType?: string }> (base64 encoded images)
 * - append?: boolean (default: true) - Whether to append to existing photos or replace
 */
export const POST = withAuth(async (request: NextRequest) => {
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

    // Validate ObjectId format
    if (!ObjectId.isValid(returnId)) {
      return validationErrorResponse('Invalid return ID format');
    }

    const db = await getDatabase();

    // Check if return exists
    const returnRecord = await db.collection('returns').findOne({ 
      _id: new ObjectId(returnId) 
    });
    if (!returnRecord) {
      return errorResponse('Return record not found', 404);
    }

    // Prepare images for upload
    const imagesToUpload = photos.map((photo, index) => {
      const fileName = generateUniqueFileName(
        `return-${returnRecord.returnNumber || returnId}-photo-${index + 1}`,
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

    await db.collection('returns').updateOne(
      { _id: new ObjectId(returnId) },
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
        returnId,
      },
      `${publicUrls.length} photo(s) uploaded successfully`
    );
  } catch (error: any) {
    console.error('Error uploading return photos:', error);
    return errorResponse(error.message || 'Failed to upload return photos', 500);
  }
});
