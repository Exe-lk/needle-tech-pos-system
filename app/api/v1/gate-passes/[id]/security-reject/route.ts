import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/gate-passes/{id}/security-reject:
 *   post:
 *     summary: Security reject gate pass
 *     description: Marks gate pass as REJECTED when security officer rejects (e.g. incorrect QR scan)
 *     tags: [Gate Passes]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER', 'Security_Officer'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;

    const gatePass = await prisma.gatePass.findUnique({
      where: { id },
    });

    if (!gatePass) {
      return notFoundResponse('Gate pass not found');
    }

    await prisma.gatePass.update({
      where: { id },
      data: {
        status: 'REJECTED' as 'PENDING', // REJECTED added in schema; run `npx prisma generate` and migration for full types
      },
    });

    return successResponse(
      { id: gatePass.id, gatepassNo: gatePass.gatePassNumber },
      'Gate pass rejected by security'
    );
  } catch (error: any) {
    console.error('Error rejecting gate pass:', error);
    return errorResponse('Failed to reject gate pass', 500);
  }
});
