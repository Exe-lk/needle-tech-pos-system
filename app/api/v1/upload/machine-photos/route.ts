import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth';
import { uploadMultipleBase64Images, generateUniqueFileName, STORAGE_BUCKETS } from '@/lib/supabase-storage';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * POST /api/v1/upload/machine-photos
 * Upload machine photos to Supabase Storage and update machine record
 * 
 * Body:
 * - machineId: string (MongoDB ObjectId) OR serialNumber: string
 * - photos: Array<{ imageData: string, contentType?: string }> (base64 encoded images)
 * - append?: boolean (default: true) - Whether to append to existing photos or replace
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { machineId, serialNumber, photos, append = true } = body;

    // Validate required fields
    if ((!machineId && !serialNumber) || !photos || !Array.isArray(photos) || photos.length === 0) {
      return validationErrorResponse('Missing required fields', {
        machineId: (!machineId && !serialNumber) ? ['Either machineId or serialNumber is required'] : [],
        photos: (!photos || !Array.isArray(photos) || photos.length === 0) 
          ? ['At least one photo is required'] 
          : [],
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

    await db.collection('machines').updateOne(
      { _id: machine._id },
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
        machineId: machine._id.toString(),
        serialNumber: machine.serialNumber,
      },
      `${publicUrls.length} photo(s) uploaded successfully`
    );
  } catch (error: any) {
    console.error('Error uploading machine photos:', error);
    return errorResponse(error.message || 'Failed to upload machine photos', 500);
  }
});
