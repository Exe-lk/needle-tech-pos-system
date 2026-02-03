import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { toObjectId, isValidObjectId, sanitizeObject } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!isValidObjectId(id)) {
      return validationErrorResponse('Invalid customer ID');
    }
    
    const db = await getDatabase();
    const customerId = toObjectId(id);
    
    // Verify customer exists
    const customer = await db.collection('customers').findOne({ _id: customerId });
    if (!customer) {
      return errorResponse('Customer not found', 404);
    }
    
    // Get all rentals for this customer
    const rentals = await db.collection('rentals')
      .find({ customerId })
      .sort({ createdAt: -1 })
      .toArray();
    
    // Populate machine and invoice data
    const rentalHistory = await Promise.all(
      rentals.map(async (rental) => {
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
        
        const invoices = await Promise.all(
          (rental.invoiceIds || []).map(async (invoiceId: any) => {
            return await db.collection('invoices').findOne({ _id: invoiceId });
          })
        );
        
        return {
          ...sanitizeObject(rental),
          machines,
          invoices: invoices.map(inv => sanitizeObject(inv)),
        };
      })
    );
    
    return successResponse(rentalHistory, 'Customer rental history retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching rental history:', error);
    return errorResponse('Failed to retrieve rental history', 500);
  }
}
