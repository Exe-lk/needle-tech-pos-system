import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/rentals/{id}/gate-passes:
 *   get:
 *     summary: Get gate passes for a rental agreement
 *     description: Retrieve all gate passes linked to a rental agreement
 *     tags: [Rentals]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const rental = await prisma.rental.findUnique({ where: { id } });
    if (!rental) {
      return notFoundResponse('Rental agreement not found');
    }
    
    const gatePasses = await prisma.gatePass.findMany({
      where: { rentalId: id },
      include: {
        machines: {
          include: {
            machine: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Transform for frontend
    const transformed = gatePasses.map((gp: any) => ({
      id: gp.id,
      gatepassNo: gp.gatePassNumber,
      agreementReference: rental.agreementNumber,
      dateOfIssue: gp.departureTime,
      returnable: true,
      entry: gp.status === 'DEPARTED' ? 'OUT' : 'IN',
      items: gp.machines.map((m: any) => ({
        machineId: m.machineId,
        serialNumber: m.machine.serialNumber,
        quantity: m.quantity,
      })),
    }));
    
    return successResponse(
      { gatePasses: transformed },
      'Gate passes retrieved successfully'
    );
  } catch (error: any) {
    console.error('Error fetching gate passes:', error);
    return errorResponse('Failed to retrieve gate passes', 500);
  }
});
