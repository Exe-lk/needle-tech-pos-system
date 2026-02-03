import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { sanitizeObject } from '@/lib/utils';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = await getDatabase();
    const settings = await db.collection('settings').findOne({ _id: 'global' } as any);
    
    if (!settings) {
      // Return default settings structure
      const defaultSettings = {
        _id: 'global',
        company: {
          name: '',
          address: '',
          vatRegistrationNumber: '',
          currency: 'LKR',
          defaultCountry: 'LK',
        },
        tax: {
          defaultVatRate: 18,
          customerTypeTaxRules: [],
        },
        creditPolicy: {
          enableCreditLock: true,
          lockAfterDaysOverdue: 30,
          maxOutstandingForNewRentals: 0,
        },
        alertSchedule: {
          daysOfMonth: [1, 10, 15, 30],
          channels: ['EMAIL'],
        },
        invoiceSettings: {
          prefix: 'INV-',
          startNumber: 1000,
        },
        rentalSettings: {
          agreementPrefix: 'AGR-',
          startNumber: 1000,
        },
        gatePassSettings: {
          prefix: 'GP-',
          startNumber: 1000,
        },
        returnSettings: {
          returnPrefix: 'RET-',
          startNumber: 1000,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      return successResponse(sanitizeObject(defaultSettings), 'Settings retrieved successfully');
    }
    
    return successResponse(sanitizeObject(settings), 'Settings retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return errorResponse('Failed to retrieve settings', 500);
  }
});

export const PUT = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const db = await getDatabase();
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (body.company !== undefined) updateData.company = body.company;
    if (body.tax !== undefined) updateData.tax = body.tax;
    if (body.creditPolicy !== undefined) updateData.creditPolicy = body.creditPolicy;
    if (body.alertSchedule !== undefined) updateData.alertSchedule = body.alertSchedule;
    if (body.invoiceSettings !== undefined) updateData.invoiceSettings = body.invoiceSettings;
    if (body.rentalSettings !== undefined) updateData.rentalSettings = body.rentalSettings;
    if (body.gatePassSettings !== undefined) updateData.gatePassSettings = body.gatePassSettings;
    if (body.returnSettings !== undefined) updateData.returnSettings = body.returnSettings;
    
    const existingSettings = await db.collection('settings').findOne({ _id: 'global' } as any);
    
    if (existingSettings) {
      await db.collection('settings').updateOne(
        { _id: 'global' } as any,
        { $set: updateData }
      );
    } else {
      await db.collection('settings').insertOne({
        _id: 'global',
        ...updateData,
        createdAt: new Date(),
      });
    }
    
    const updatedSettings = await db.collection('settings').findOne({ _id: 'global' } as any);
    
    return successResponse(sanitizeObject(updatedSettings!), 'Settings updated successfully');
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return errorResponse('Failed to update settings', 500);
  }
});
