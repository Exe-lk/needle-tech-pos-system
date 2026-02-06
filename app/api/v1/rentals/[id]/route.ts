import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

export const GET = withAuthAndRole(['ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const rental = await prisma.rental.findUnique({
      where: { id },
      include: { customer: true, machines: true }
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

export const PUT = withAuthAndRole(['ADMIN', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingRental = await prisma.rental.findUnique({ where: { id } });
    if (!existingRental) {
      return notFoundResponse('Rental not found');
    }
    
    const updatedRental = await prisma.rental.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.endDate && { endDate: new Date(body.endDate) }),
        ...(body.notes && { notes: body.notes }),
      },
      include: { customer: true, machines: true }
    });
    
    return successResponse(updatedRental, 'Rental updated successfully');
  } catch (error: any) {
    console.error('Error updating rental:', error);
    return errorResponse('Failed to update rental', 500);
  }
});

export const DELETE = withAuthAndRole(['ADMIN'], async (
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
    };
    
    if (body.status !== undefined) updateData.status = body.status;
    if (body.expectedEndDate !== undefined) updateData.expectedEndDate = new Date(body.expectedEndDate);
    if (body.actualEndDate !== undefined) updateData.actualEndDate = new Date(body.actualEndDate);
    
    await db.collection('rentals').updateOne(
      { _id: rentalId },
      { $set: updateData }
    );
    
    const updatedRental = await db.collection('rentals').findOne({ _id: rentalId });
    
    return successResponse(sanitizeObject(updatedRental!), 'Rental updated successfully');
  } catch (error: any) {
    console.error('Error updating rental:', error);
    return errorResponse('Failed to update rental', 500);
  }
});
