import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  try {
    const { qrCode: qrCodeParam } = await params;
    const qrCode = decodeURIComponent(qrCodeParam);
    
    const machine = await prisma.machine.findFirst({
      where: { qrCode },
      include: { brand: true, model: true, machineType: true }
    });
    
    if (!machine) {
      return notFoundResponse('Machine not found');
    }
    
    return successResponse(machine, 'Machine retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching machine by QR code:', error);
    return errorResponse('Failed to retrieve machine', 500);
  }
}
