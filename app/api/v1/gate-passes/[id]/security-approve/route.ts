import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/gate-passes/{id}/security-approve:
 *   post:
 *     summary: Security approve gate pass
 *     description: Marks gate pass as security-approved after QR verification. Sets rental to ACTIVE, machines to RENTED, and creates bincard RENTAL_OUT entries for inventory.
 *     tags: [Gate Passes]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    
    const gatePass = await prisma.gatePass.findUnique({
      where: { id },
      include: {
        rental: true,
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
    
    if (!gatePass) {
      return notFoundResponse('Gate pass not found');
    }

    if (gatePass.status === 'DEPARTED') {
      return successResponse(
        { id: gatePass.id, gatepassNo: gatePass.gatePassNumber },
        'Gate pass was already approved'
      );
    }
    
    const rentalId = gatePass.rentalId;
    const machineIds = gatePass.machines.map((gm: any) => gm.machineId);
    const now = new Date();
    const reference = gatePass.gatePassNumber;

    await prisma.$transaction(async (tx) => {
      // 1. Update gate pass status to DEPARTED
      await tx.gatePass.update({
        where: { id },
        data: { status: 'DEPARTED' },
      });

      // 2. Set rental to ACTIVE if it was PENDING
      if ((gatePass.rental as { status: string } | null)?.status === 'PENDING') {
        await tx.rental.update({
          where: { id: rentalId },
          data: { status: 'ACTIVE' },
        });
      }

      // 3. Set all machines on this gate pass to RENTED
      if (machineIds.length > 0) {
        await tx.machine.updateMany({
          where: { id: { in: machineIds } },
          data: { status: 'RENTED' },
        });
      }

      // 4. Create bincard RENTAL_OUT entries for each machine (inventory update)
      for (const gm of gatePass.machines) {
        const m = (gm as any).machine;
        if (!m) continue;
        const brand = m.brand?.name ?? 'Unknown';
        const model = m.model?.name ?? 'Unknown';
        const machineType = m.type?.name ?? null;

        const lastEntry = await (tx as any).bincardEntry.findFirst({
          where: { brand, model },
          orderBy: { date: 'desc' },
          select: { balance: true },
        });
        const previousBalance = lastEntry?.balance ?? 0;
        const newBalance = Math.max(0, previousBalance - 1);

        await (tx as any).bincardEntry.create({
          data: {
            date: now,
            transactionType: 'RENTAL_OUT',
            brand,
            model,
            machineType,
            reference,
            quantityIn: 0,
            quantityOut: 1,
            balance: newBalance,
            performedBy: auth?.fullName ?? auth?.username ?? 'Security',
            notes: `Gate pass ${reference} approved – machine ${m.serialNumber} dispatched`,
          },
        });
      }
    });
    
    if (body.scannedPairs && Array.isArray(body.scannedPairs)) {
      console.log('Security approval scanned pairs:', body.scannedPairs);
    }
    
    const updatedGatePass = await prisma.gatePass.findUnique({
      where: { id },
      select: { id: true, gatePassNumber: true },
    });
    
    return successResponse(
      { id: updatedGatePass?.id, gatepassNo: updatedGatePass?.gatePassNumber },
      'Gate pass security approved. Rental activated and inventory updated.'
    );
  } catch (error: any) {
    console.error('Error approving gate pass:', error);
    return errorResponse('Failed to approve gate pass', 500);
  }
});
