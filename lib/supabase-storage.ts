import { supabaseAdmin } from './supabase';

/**
 * Supabase Storage Buckets Configuration
 * 
 * Bucket Names:
 * - machine-qr-codes: QR code images for machines
 * - machine-photos: Machine photos
 * - damage-report-photos: Photos for damage reports
 * - return-photos: Photos for return inspections
 */

export const STORAGE_BUCKETS = {
  MACHINE_QR_CODES: 'machine-qr-codes',
  MACHINE_PHOTOS: 'machine-photos',
  DAMAGE_REPORT_PHOTOS: 'damage-report-photos',
  RETURN_PHOTOS: 'return-photos',
} as const;

/**
 * Upload a base64 image to Supabase Storage
 * @param bucket - The storage bucket name
 * @param fileName - The file name/path in the bucket
 * @param base64Data - Base64 encoded image data (with or without data URL prefix)
 * @param contentType - MIME type of the image (default: image/png)
 * @returns Public URL of the uploaded image
 */
export async function uploadBase64Image(
  bucket: string,
  fileName: string,
  base64Data: string,
  contentType: string = 'image/png'
): Promise<string> {
  try {
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    const base64Content = base64Data.includes(',') 
      ? base64Data.split(',')[1] 
      : base64Data;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Content, 'base64');

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType,
        upsert: true, // Replace if exists
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error: any) {
    console.error('Error uploading image to Supabase Storage:', error);
    throw error;
  }
}

/**
 * Upload multiple base64 images to Supabase Storage
 * @param bucket - The storage bucket name
 * @param images - Array of {fileName, base64Data, contentType?}
 * @returns Array of public URLs
 */
export async function uploadMultipleBase64Images(
  bucket: string,
  images: Array<{ fileName: string; base64Data: string; contentType?: string }>
): Promise<string[]> {
  const uploadPromises = images.map(img =>
    uploadBase64Image(bucket, img.fileName, img.base64Data, img.contentType)
  );

  return Promise.all(uploadPromises);
}

/**
 * Delete an image from Supabase Storage
 * @param bucket - The storage bucket name
 * @param filePath - The file path in the bucket
 */
export async function deleteImage(bucket: string, filePath: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Supabase storage delete error:', error);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Error deleting image from Supabase Storage:', error);
    throw error;
  }
}

/**
 * Delete multiple images from Supabase Storage
 * @param bucket - The storage bucket name
 * @param filePaths - Array of file paths to delete
 */
export async function deleteMultipleImages(
  bucket: string,
  filePaths: string[]
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove(filePaths);

    if (error) {
      console.error('Supabase storage delete error:', error);
      throw new Error(`Failed to delete images: ${error.message}`);
    }
  } catch (error: any) {
    console.error('Error deleting images from Supabase Storage:', error);
    throw error;
  }
}

/**
 * Extract file path from Supabase Storage public URL
 * @param publicUrl - The public URL from Supabase Storage
 * @param bucket - The storage bucket name
 * @returns File path within the bucket
 */
export function extractFilePathFromUrl(publicUrl: string, bucket: string): string {
  try {
    const url = new URL(publicUrl);
    const pathSegments = url.pathname.split('/');
    const bucketIndex = pathSegments.indexOf(bucket);
    
    if (bucketIndex === -1) {
      throw new Error('Bucket name not found in URL');
    }
    
    // Return everything after the bucket name
    return pathSegments.slice(bucketIndex + 1).join('/');
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    throw error;
  }
}

/**
 * Generate a unique file name with timestamp
 * @param prefix - Prefix for the file name
 * @param extension - File extension (with or without dot)
 * @returns Unique file name
 */
export function generateUniqueFileName(prefix: string, extension: string = 'png'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  return `${prefix}-${timestamp}-${random}${ext}`;
}
