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

    const requestedLines = (rental as any).requestedMachineLines as { id?: string; brand?: string; model?: string; type?: string; quantity?: number }[] | null;
    let payload: any = rental;
    if (Array.isArray(requestedLines) && requestedLines.length > 0) {
      const expectedMachineCategories = requestedLines.map((m, i) => ({
        id: String(m.id ?? i),
        brand: String(m.brand ?? ''),
        model: String(m.model ?? ''),
        type: String(m.type ?? ''),
        quantity: typeof m.quantity === 'number' ? m.quantity : 1,
      }));
      const expectedMachineCount = expectedMachineCategories.reduce((s, c) => s + c.quantity, 0);
      payload = { ...rental, expectedMachineCount, expectedMachineCategories };
    }
    return successResponse(payload, 'Rental retrieved successfully');
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
      } as any,
    }) as any;
    if (!existingRental) {
      return notFoundResponse('Rental not found');
    }
    
    const statusMap: Record<string, 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'PENDING'> = {
      Active: 'ACTIVE',
      Completed: 'COMPLETED',
      Cancelled: 'CANCELLED',
      Pending: 'PENDING',
    };
    const mappedStatus = body.status && statusMap[body.status];
    
    // Expected machine count: from requestedMachineLines (PO-created) or from purchase order (for per-machine rate)
    let expectedCount = 0;
    const requestedLines = existingRental.requestedMachineLines as { quantity?: number }[] | null;
    if (Array.isArray(requestedLines) && requestedLines.length > 0) {
      expectedCount = requestedLines.reduce((sum, m) => sum + (typeof m.quantity === 'number' ? m.quantity : 1), 0);
    } else if (existingRental.purchaseOrder && Array.isArray(existingRental.purchaseOrder.machines)) {
      expectedCount = (existingRental.purchaseOrder.machines as any[]).reduce(
        (sum: number, m: any) => sum + (m.quantity || 0),
        0
      );
    }

    // Handle machine assignment from QR scans
    if (body.machines && Array.isArray(body.machines)) {
      const machinesToAdd: any[] = [];
      const subtotalNum = parseFloat(existingRental.subtotal.toString());
      // Per-machine monthly = subtotal / expected count (e.g. 15000/5 = 3000); dailyRate = that / 30
      const perMachineDailyRate =
        expectedCount > 0 ? subtotalNum / expectedCount / 30 : subtotalNum / 30;

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
        const existingAssignment = existingRental.machines.find(
          (rm: any) => rm.machineId === machine.id
        );
        
        if (existingAssignment) {
          continue; // Skip duplicate
        }

        // Reserved: machine cannot be assigned to another agreement if it is already in a PENDING or ACTIVE rental
        const otherRentalWithMachine = await prisma.rentalMachine.findFirst({
          where: {
            machineId: machine.id,
            rentalId: { not: id },
            rental: { status: { in: ['PENDING', 'ACTIVE'] as any } },
          },
          include: { rental: { select: { agreementNumber: true } } },
        });
        if (otherRentalWithMachine) {
          const otherAgreementNo = (otherRentalWithMachine as { rental?: { agreementNumber: string } }).rental?.agreementNumber;
          return validationErrorResponse('Machine is reserved for another agreement', {
            machines: [`Machine with serial ${serialNo} is already assigned to agreement ${otherAgreementNo ?? 'another'}. It cannot be assigned to a different agreement.`],
          });
        }
        
        // Use per-machine daily rate so agreement total = subtotal (e.g. 5 machines × 3000 = 15000)
        const dailyRate = perMachineDailyRate;
        
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
    
    const currentCount = existingRental.machines.length + (body.machines?.length || 0);
    const allMachinesAssigned = expectedCount > 0 && currentCount >= expectedCount;

    // When all expected machines are assigned and agreement is PENDING, set to ACTIVE (e.g. from machine-assign-page).
    let finalStatus = mappedStatus || existingRental.status;
    if (String(existingRental.status) === 'PENDING' && allMachinesAssigned && !mappedStatus) {
      finalStatus = 'ACTIVE';
    }
    
    const updateData: any = {};
    
    if (finalStatus) updateData.status = finalStatus;
    
    if (body.startDate != null && body.startDate !== '') {
      updateData.startDate = new Date(body.startDate);
    }
    
    if (body.monthlyRent != null) {
      updateData.subtotal = new Decimal(body.monthlyRent);
    }
    
    // Handle actualEndDate when agreement is closed
    if (body.actualEndDate !== undefined) {
      if (body.actualEndDate === null || body.actualEndDate === '') {
        updateData.actualEndDate = null;
      } else {
        updateData.actualEndDate = new Date(body.actualEndDate);
      }
    }
    
    const updatedRental = await prisma.rental.update({
      where: { id },
      data: updateData,
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
