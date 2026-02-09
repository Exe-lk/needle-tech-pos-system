import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import prisma from '@/lib/prisma';

// Helper function to transform machine data for frontend
const transformMachineForFrontend = (machine: any) => {
  const barcode = machine.qrCodeValue || 
    `${machine.brand?.name || ''}-${machine.model?.name || ''}-${machine.serialNumber}`.replace(/\s+/g, '-').toUpperCase();
  
  const statusMap: Record<string, string> = {
    'AVAILABLE': 'Available',
    'RENTED': 'Rented',
    'MAINTENANCE': 'Maintenance',
    'RETIRED': 'Retired',
    'DAMAGED': 'Maintenance'
  };

  return {
    id: machine.id,
    barcode,
    serialNumber: machine.serialNumber || '',
    boxNo: machine.boxNumber || '',
    brand: machine.brand?.name || '',
    model: machine.model?.name || '',
    type: machine.type?.name || 'Other',
    status: statusMap[machine.status] || 'Available',
    photos: machine.photos || [],
    manufactureYear: machine.manufactureYear || '',
    country: machine.country || '',
    conditionOnArrival: machine.conditionOnArrival || '',
    warrantyStatus: machine.warrantyStatus || '',
    warrantyExpiryDate: machine.warrantyExpiryDate || null,
    purchaseDate: machine.purchaseDate || null,
    location: machine.currentLocationName || '',
    notes: machine.notes || '',
    qrCodeValue: machine.qrCodeValue || '',
    qrCodeImageUrl: machine.qrCodeImageUrl || '',
    voltage: machine.voltage || '',
    power: machine.power || '',
    stitchType: machine.stitchType || '',
    maxSpeedSpm: machine.maxSpeedSpm || null,
    currentCustomer: machine.currentCustomer || null,
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  try {
    const { qrCode: qrCodeParam } = await params;
    const qrCode = decodeURIComponent(qrCodeParam);
    
    const machine = await prisma.machine.findFirst({
      where: { qrCodeValue: qrCode },
      include: { 
        brand: true, 
        model: true, 
        type: true,
        rentalMachines: {
          include: {
            rental: {
              include: {
                customer: true
              }
            }
          },
          where: {
            rental: {
              status: 'ACTIVE'
            }
          },
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    if (!machine) {
      return notFoundResponse('Machine not found for QR code: ' + qrCode);
    }
    
    // Transform for frontend
    const transformedMachine = transformMachineForFrontend(machine);
    
    // Add current customer if machine is rented
    if (machine.status === 'RENTED' && machine.rentalMachines.length > 0) {
      transformedMachine.currentCustomer = machine.rentalMachines[0].rental.customer.name;
    }
    
    return successResponse(transformedMachine, 'Machine retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching machine by QR code:', error);
    return errorResponse('Failed to retrieve machine: ' + error.message, 500);
  }
}
