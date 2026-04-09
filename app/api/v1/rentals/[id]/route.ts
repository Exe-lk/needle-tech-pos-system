import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/client';
import { getReturnedMachineIdsForRental } from '@/lib/rental-returns';

export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'Operational_Officer', 'MANAGER', 'OPERATOR', 'USER'], async (
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

    const returnedIds = await getReturnedMachineIdsForRental(prisma, id);
    const allMachines = Array.isArray((rental as any).machines) ? (rental as any).machines : [];
    const activeMachines = returnedIds.size > 0
      ? allMachines.filter((rm: any) => !returnedIds.has(rm.machineId))
      : allMachines;

    let payload: any = rental;
    if (returnedIds.size > 0) {
      const start = (rental as any).startDate ? new Date((rental as any).startDate) : new Date();
      const end = (rental as any).expectedEndDate ? new Date((rental as any).expectedEndDate) : null;
      const diffMonths = end
        ? Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)))
        : 1;
      const monthlySubtotal = activeMachines.reduce(
        (sum: number, rm: any) => sum + (Number(rm.dailyRate) || 0) * 30,
        0
      );
      const newSubtotal = monthlySubtotal * diffMonths;
      const origSubtotal = Number((rental as any).subtotal) || 0;
      const origVat = Number((rental as any).vatAmount) || 0;
      const newVatAmount = origSubtotal > 0 ? newSubtotal * (origVat / origSubtotal) : 0;
      const newTotal = newSubtotal + newVatAmount;
      payload = {
        ...rental,
        machines: activeMachines,
        subtotal: new Decimal(newSubtotal),
        vatAmount: new Decimal(newVatAmount),
        total: new Decimal(newTotal),
        balance: new Decimal(Math.max(0, newTotal - Number((rental as any).paidAmount || 0))),
      };
    } else {
      payload = { ...rental, machines: allMachines };
    }

    const requestedLines = (rental as any).requestedMachineLines as { id?: string; brand?: string; model?: string; type?: string; quantity?: number }[] | null;
    if (Array.isArray(requestedLines) && requestedLines.length > 0) {
      const expectedMachineCategories = requestedLines.map((m, i) => ({
        id: String(m.id ?? i),
        brand: String(m.brand ?? ''),
        model: String(m.model ?? ''),
        type: String(m.type ?? ''),
        quantity: typeof m.quantity === 'number' ? m.quantity : 1,
      }));
      const expectedMachineCount = expectedMachineCategories.reduce((s, c) => s + c.quantity, 0);
      payload = { ...payload, expectedMachineCount, expectedMachineCategories };
    }
    return successResponse(payload, 'Rental retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching rental:', error);
    return errorResponse('Failed to retrieve rental', 500);
  }
});

export const PUT = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER', 'Stock_Keeper'], async (
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

    // Expected machine categories (brand/model/type + quantity). Used to validate scan-time assignment.
    type ExpectedCategory = { id: string; brand: string; model: string; type: string; quantity: number };
    const expectedMachineCategories: ExpectedCategory[] = (() => {
      const req = existingRental.requestedMachineLines as any[] | null;
      if (Array.isArray(req) && req.length > 0) {
        return req.map((m: any, i: number) => ({
          id: String(m.id ?? i),
          brand: String(m.brand ?? ''),
          model: String(m.model ?? ''),
          type: String(m.type ?? ''),
          quantity: typeof m.quantity === 'number' ? m.quantity : 1,
        }));
      }
      const poMachines = existingRental.purchaseOrder?.machines as any[] | undefined;
      if (Array.isArray(poMachines) && poMachines.length > 0) {
        const map = new Map<string, ExpectedCategory>();
        for (const m of poMachines) {
          const brand = String(m.brand ?? '');
          const model = String(m.model ?? '');
          const type = String(m.type ?? '');
          const qty = typeof m.quantity === 'number' ? m.quantity : Number(m.quantity) || 0;
          const key = `${brand}||${model}||${type}`.toUpperCase().trim();
          if (!map.has(key)) {
            map.set(key, { id: String(m.id ?? key), brand, model, type, quantity: 0 });
          }
          map.get(key)!.quantity += qty;
        }
        return Array.from(map.values()).filter((c) => c.quantity > 0);
      }
      return [];
    })();

    const norm = (s: unknown) => String(s ?? '').trim().toUpperCase();
    const machineToKey = (m: any) => `${norm(m?.brand?.name)}||${norm(m?.model?.name)}||${norm(m?.type?.name)}`;
    const catToKey = (c: ExpectedCategory) => `${norm(c.brand)}||${norm(c.model)}||${norm(c.type)}`;

    const expectedByKey = new Map<string, ExpectedCategory>();
    for (const c of expectedMachineCategories) expectedByKey.set(catToKey(c), c);

    const currentAssignedCountsByKey = new Map<string, number>();
    const existingAssigned = Array.isArray(existingRental.machines) ? existingRental.machines : [];
    for (const rm of existingAssigned) {
      const m = rm.machine;
      if (!m) continue;
      const key = machineToKey(m);
      currentAssignedCountsByKey.set(key, (currentAssignedCountsByKey.get(key) ?? 0) + 1);
    }

    // Handle machine assignment from QR scans
    if (body.machines && Array.isArray(body.machines)) {
      const machinesToAdd: any[] = [];
      const subtotalNum = parseFloat(existingRental.subtotal.toString());
      // Per-machine monthly = subtotal / expected count (e.g. 15000/5 = 3000); dailyRate = that / 30
      const perMachineDailyRate =
        expectedCount > 0 ? subtotalNum / expectedCount / 30 : subtotalNum / 30;

      // Track counts while processing this request so we can enforce per-category quantities.
      const nextCountsByKey = new Map(currentAssignedCountsByKey);

      for (const machineData of body.machines) {
        const serialNo = machineData.serialNo || machineData.serialNumber;
        const motorBoxNo = machineData.motorBoxNo || machineData.boxNumber || machineData.boxNo;
        
        if (!serialNo) continue;
        
        // Find machine by serial number
        const machine = await prisma.machine.findUnique({
          where: { serialNumber: serialNo },
          include: { brand: true, model: true, type: true },
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

        // Validate machine belongs to the expected agreement categories, and enforce per-category quantities.
        if (expectedMachineCategories.length > 0) {
          const key = machineToKey(machine);
          const expectedCat = expectedByKey.get(key);
          if (!expectedCat) {
            const readable = [machine.brand?.name, machine.model?.name, machine.type?.name].filter(Boolean).join(' ');
            return validationErrorResponse('Machine is not part of this agreement', {
              machines: [
                `Machine ${serialNo} (${readable || 'Unknown category'}) is not included in this agreement's machine plan.`,
              ],
            });
          }
          const nextCount = (nextCountsByKey.get(key) ?? 0) + 1;
          if (nextCount > expectedCat.quantity) {
            const readableExpected = [expectedCat.brand, expectedCat.model, expectedCat.type].filter(Boolean).join(' ');
            return validationErrorResponse('Category is already complete', {
              machines: [
                `Cannot add ${serialNo}. Category "${readableExpected || 'Machine'}" already has ${expectedCat.quantity} machine(s) assigned for this agreement.`,
              ],
            });
          }
          nextCountsByKey.set(key, nextCount);
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
    
    const returnedIdsPut = await getReturnedMachineIdsForRental(prisma, id);
    const activeExistingCount = (existingRental.machines as any[]).filter(
      (rm: any) => !returnedIdsPut.has(rm.machineId)
    ).length;
    const currentCount = activeExistingCount + (body.machines?.length || 0);
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

    const returnedIdsAfterPut = await getReturnedMachineIdsForRental(prisma, id);
    const activeMachineCount = (updatedRental.machines as any[]).filter(
      (rm: any) => !returnedIdsAfterPut.has(rm.machineId)
    ).length;
    
    return successResponse({
      id: updatedRental.id,
      agreementNo: updatedRental.agreementNumber,
      status: updatedRental.status,
      addedMachines: activeMachineCount,
    }, 'Rental agreement updated successfully');
  } catch (error: any) {
    console.error('Error updating rental:', error);
    return errorResponse('Failed to update rental', 500);
  }
});

export const DELETE = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'Operational_Officer'], async (
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
