import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { sanitizeObject } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  try {
    const { qrCode: qrCodeParam } = await params;
    const db = await getDatabase();
    const qrCode = decodeURIComponent(qrCodeParam);
    
    const machine = await db.collection('machines').findOne({ 'qrCode.value': qrCode });
    
    if (!machine) {
      return notFoundResponse('Machine not found');
    }
    
    return successResponse(sanitizeObject(machine), 'Machine retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching machine by QR code:', error);
    return errorResponse('Failed to retrieve machine', 500);
  }
}
