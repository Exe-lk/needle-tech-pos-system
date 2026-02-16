import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/gate-passes/{id}/security-approve:
 *   post:
 *     summary: Security approve gate pass
 *     description: Marks gate pass as security-approved after QR verification
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
        machines: {
          include: {
            machine: true,
          },
        },
      },
    });
    
    if (!gatePass) {
      return notFoundResponse('Gate pass not found');
    }
    
    // Update gate pass status to DEPARTED (security approved)
    const updatedGatePass = await prisma.gatePass.update({
      where: { id },
      data: {
        status: 'DEPARTED',
      },
      include: {
        rental: {
          include: {
            customer: true,
          },
        },
        customer: true,
        machines: {
          include: {
            machine: true,
          },
        },
      },
    });
    
    // Optional: Store scanned pairs for audit (if provided in request body)
    // This could be stored in a separate audit table or as metadata
    if (body.scannedPairs && Array.isArray(body.scannedPairs)) {
      // Log the scanned pairs (could be stored in a transaction log or audit table)
      console.log('Security approval scanned pairs:', body.scannedPairs);
    }
    
    return successResponse(
      { id: updatedGatePass.id, gatepassNo: updatedGatePass.gatePassNumber },
      'Gate pass security approved'
    );
  } catch (error: any) {
    console.error('Error approving gate pass:', error);
    return errorResponse('Failed to approve gate pass', 500);
  }
});
