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
      return validationErrorResponse('Invalid customer ID');
    }
    
    const db = await getDatabase();
    const customerId = toObjectId(params.id);
    
    const customer = await db.collection('customers').findOne({ _id: customerId });
    
    if (!customer) {
      return notFoundResponse('Customer not found');
    }
    
    return successResponse(sanitizeObject(customer), 'Customer retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching customer:', error);
    return errorResponse('Failed to retrieve customer', 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidObjectId(params.id)) {
      return validationErrorResponse('Invalid customer ID');
    }
    
    const body = await request.json();
    const db = await getDatabase();
    const customerId = toObjectId(params.id);
    
    const existingCustomer = await db.collection('customers').findOne({ _id: customerId });
    if (!existingCustomer) {
      return notFoundResponse('Customer not found');
    }
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.contactPerson !== undefined) updateData.contactPerson = body.contactPerson;
    if (body.phones !== undefined) updateData.phones = body.phones;
    if (body.emails !== undefined) updateData.emails = body.emails;
    if (body.billingAddress !== undefined) updateData.billingAddress = body.billingAddress;
    if (body.shippingAddress !== undefined) updateData.shippingAddress = body.shippingAddress;
    if (body.taxProfile !== undefined) updateData.taxProfile = body.taxProfile;
    if (body.status !== undefined) updateData.status = body.status;
    
    await db.collection('customers').updateOne(
      { _id: customerId },
      { $set: updateData }
    );
    
    const updatedCustomer = await db.collection('customers').findOne({ _id: customerId });
    
    return successResponse(sanitizeObject(updatedCustomer!), 'Customer updated successfully');
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return errorResponse('Failed to update customer', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isValidObjectId(params.id)) {
      return validationErrorResponse('Invalid customer ID');
    }
    
    const db = await getDatabase();
    const customerId = toObjectId(params.id);
    
    const customer = await db.collection('customers').findOne({ _id: customerId });
    if (!customer) {
      return notFoundResponse('Customer not found');
    }
    
    // Soft delete
    await db.collection('customers').updateOne(
      { _id: customerId },
      { 
        $set: { 
          status: 'INACTIVE',
          updatedAt: new Date(),
        } 
      }
    );
    
    return successResponse(null, 'Customer deleted successfully', 200);
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return errorResponse('Failed to delete customer', 500);
  }
}
