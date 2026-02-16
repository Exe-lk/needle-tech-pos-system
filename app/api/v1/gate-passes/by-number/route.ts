import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/gate-passes/by-number:
 *   get:
 *     summary: Get gate pass by number
 *     description: Lookup gate pass by gate pass number for security verification
 *     tags: [Gate Passes]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gatePassNumber = searchParams.get('number');
    
    if (!gatePassNumber) {
      return validationErrorResponse('Missing required parameter', {
        number: ['Gate pass number is required'],
      });
    }
    
    // Normalize gate pass number (remove leading zeros padding, then pad to 6 digits)
    const normalizedNumber = gatePassNumber.replace(/^0+/, '').padStart(6, '0');
    
    const gatePass = await prisma.gatePass.findFirst({
      where: {
        OR: [
          { gatePassNumber: { contains: gatePassNumber, mode: 'insensitive' } },
          { gatePassNumber: normalizedNumber },
        ],
      },
      include: {
        rental: {
          include: {
            customer: true,
          },
        },
        customer: true,
        issuedBy: true,
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
    
    // Transform for frontend
    const items = gatePass.machines.map((gm: any) => ({
      id: gm.machineId,
      description: `${gm.machine.brand?.name || ''} ${gm.machine.model?.name || ''} - ${gm.machine.type?.name || ''}`.trim(),
      status: 'GOOD',
      serialNo: gm.machine.serialNumber,
      motorBoxNo: gm.machine.boxNumber || '',
    }));
    
    const transformed = {
      id: gatePass.id,
      gatepassNo: gatePass.gatePassNumber,
      agreementReference: gatePass.rental?.agreementNumber || '',
      dateOfIssue: gatePass.departureTime,
      returnable: true,
      entry: gatePass.status === 'DEPARTED' ? 'OUT' : 'IN',
      from: 'Needle Technologies',
      to: gatePass.rental?.customer?.name || gatePass.customer?.name || '',
      toAddress: gatePass.rental?.customer?.billingAddressLine1 || '',
      vehicleNumber: gatePass.vehicleNumber || '',
      driverName: gatePass.driverName || '',
      items,
      issuedBy: gatePass.issuedBy?.name || 'System',
      receivedBy: gatePass.driverName || '',
    };
    
    return successResponse(transformed, 'Gate pass retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching gate pass by number:', error);
    return errorResponse('Failed to retrieve gate pass', 500);
  }
});
