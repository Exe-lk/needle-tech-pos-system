import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/client';

export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const rental = await prisma.rental.findUnique({
      where: { id },
      include: {
        customer: true,
        machines: {
          include: {
            machine: {
              include: {
                brand: true,
                model: true,
                type: true,
              },
            },
          },
        },
      },
    });
    
    if (!rental) {
      return notFoundResponse('Rental not found');
    }
    
    return successResponse(rental, 'Rental retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching rental:', error);
    return errorResponse('Failed to retrieve rental', 500);
  }
});

export const PUT = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingRental = await prisma.rental.findUnique({
      where: { id },
      include: {
        purchaseOrder: true,
        machines: true,
      },
    } as any);
    if (!existingRental) {
      return notFoundResponse('Rental not found');
    }
    const existing = existingRental as any;

    const statusMap: Record<string, 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'> = {
      Active: 'ACTIVE',
      Completed: 'COMPLETED',
      Cancelled: 'CANCELLED',
      Pending: 'PENDING',
    };
    const mappedStatus = body.status && statusMap[body.status];
    
    // Handle machine assignment from QR scans
    if (body.machines && Array.isArray(body.machines)) {
      const machinesToAdd: any[] = [];
      
      for (const machineData of body.machines) {
        const serialNo = machineData.serialNo || machineData.serialNumber;
        const motorBoxNo = machineData.motorBoxNo || machineData.boxNumber || machineData.boxNo;
        
        if (!serialNo) continue;
        
        // Find machine by serial number
        const machine = await prisma.machine.findUnique({
          where: { serialNumber: serialNo },
        });
        
        if (!machine) {
          return validationErrorResponse('Machine not found', {
            machines: [`Machine with serial number ${serialNo} not found`],
          });
        }
        
        // Check if machine is already assigned to this rental
        const existingAssignment = existing.machines.find(
          (rm: any) => rm.machineId === machine.id
        );
        
        if (existingAssignment) {
          continue; // Skip duplicate
        }
        
        // Get machine pricing from the machine or use defaults
        const dailyRate = (machine as any).monthlyRentalFee
          ? parseFloat((machine as any).monthlyRentalFee.toString()) / 30
          : parseFloat(existingRental.subtotal.toString()) / 30;
        
        machinesToAdd.push({
          machineId: machine.id,
          dailyRate: new Decimal(dailyRate),
          securityDeposit: new Decimal(0),
          quantity: 1,
        });
      }
      
      if (machinesToAdd.length > 0) {
        await prisma.rentalMachine.createMany({
          data: machinesToAdd.map(m => ({
            ...m,
            rentalId: id,
          })),
        });
      }
    }
    
    // Determine if all expected machines are added
    let finalStatus = mappedStatus || existingRental.status;
    if (existing.purchaseOrder && Array.isArray(existing.purchaseOrder.machines)) {
      const expectedCount = existing.purchaseOrder.machines.reduce(
        (sum: number, m: any) => sum + (m.quantity || 0),
        0
      );
      const currentCount = existing.machines.length + (body.machines?.length || 0);

      // When machines are assigned from machine-assign-page and all expected are added, move PENDING -> ACTIVE
      if (currentCount >= expectedCount && String(existingRental.status) === 'PENDING' && !mappedStatus) {
        finalStatus = 'ACTIVE';
      }
    }
    
    const updatedRental = await prisma.rental.update({
      where: { id },
      data: {
        ...(finalStatus && { status: finalStatus }),
        ...(body.endDate != null && body.endDate !== '' && { expectedEndDate: new Date(body.endDate) }),
        ...(body.startDate != null && body.startDate !== '' && { startDate: new Date(body.startDate) }),
        ...(body.monthlyRent != null && { subtotal: new Decimal(body.monthlyRent) }),
      },
      include: {
        customer: true,
        machines: {
          include: {
            machine: {
              include: {
                brand: true,
                model: true,
                type: true,
              },
            },
          },
        },
      },
    });
    
    return successResponse({
      id: updatedRental.id,
      agreementNo: updatedRental.agreementNumber,
      status: updatedRental.status,
      addedMachines: updatedRental.machines.length,
    }, 'Rental agreement updated successfully');
  } catch (error: any) {
    console.error('Error updating rental:', error);
    return errorResponse('Failed to update rental', 500);
  }
});

export const DELETE = withAuthAndRole(['SUPER_ADMIN','ADMIN'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const rental = await prisma.rental.findUnique({ where: { id } });
    if (!rental) {
      return notFoundResponse('Rental not found');
    }
    
    await prisma.rental.delete({ where: { id } });
    
    return successResponse({ id }, 'Rental deleted successfully');
  } catch (error: any) {
    console.error('Error deleting rental:', error);
    return errorResponse('Failed to delete rental', 500);
  }
});
