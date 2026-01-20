import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { toObjectId, isValidObjectId, sanitizeObject } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidObjectId(params.id)) {
      return validationErrorResponse('Invalid rental ID');
    }
    
    const db = await getDatabase();
    const rentalId = toObjectId(params.id);
    
    const rental = await db.collection('rentals').findOne({ _id: rentalId });
    
    if (!rental) {
      return notFoundResponse('Rental not found');
    }
    
    // Populate related data
    const customer = rental.customerId 
      ? await db.collection('customers').findOne({ _id: rental.customerId })
      : null;
    
    const machines = await Promise.all(
      (rental.machines || []).map(async (machine: any) => {
        const machineDoc = machine.machineId 
          ? await db.collection('machines').findOne({ _id: machine.machineId })
          : null;
        return {
          ...machine,
          machine: sanitizeObject(machineDoc),
        };
      })
    );
    
    const rentalData = {
      ...sanitizeObject(rental),
      customer: sanitizeObject(customer),
      machines,
    };
    
    return successResponse(rentalData, 'Rental retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching rental:', error);
    return errorResponse('Failed to retrieve rental', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidObjectId(params.id)) {
      return validationErrorResponse('Invalid rental ID');
    }
    
    const body = await request.json();
    const db = await getDatabase();
    const rentalId = toObjectId(params.id);
    
    const existingRental = await db.collection('rentals').findOne({ _id: rentalId });
    if (!existingRental) {
      return notFoundResponse('Rental not found');
    }
    
    const updateData: any = {
      updatedAt: new Date(),
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
}
