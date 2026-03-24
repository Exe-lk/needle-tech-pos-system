import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole, AuthUser } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/inventory/stock-in:
 *   post:
 *     summary: Create stock-in transactions
 *     description: Records one or more stock-in transactions with machine units
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 */
export const POST = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'Stock_Keeper'], async (request: NextRequest, auth: AuthUser) => {
  try {
    const body = await request.json();
    const { transactions } = body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return validationErrorResponse('Missing required fields', {
        transactions: ['At least one transaction is required'],
      });
    }

    const transactionIds: string[] = [];
    let totalUnits = 0;
    const errors: Record<string, string[]> = {};

    // Process each transaction
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      const {
        brand: brandName,
        model: modelName,
        type: typeName,
        stockType,
        quantity,
        warrantyExpiry,
        condition,
        location,
        notes,
        transactionDate,
        performedBy,
        machines: machineUnits = [],
      } = transaction;

      // Validation
      if (!brandName) {
        errors[`transactions[${i}].brand`] = ['Brand is required'];
      }
      if (!modelName) {
        errors[`transactions[${i}].model`] = ['Model is required'];
      }
      if (!typeName) {
        errors[`transactions[${i}].type`] = ['Type is required'];
      }
      if (!quantity || quantity <= 0) {
        errors[`transactions[${i}].quantity`] = ['Quantity must be greater than 0'];
      }
      if (!location) {
        errors[`transactions[${i}].location`] = ['Location is required'];
      }
      if (machineUnits.length !== quantity) {
        errors[`transactions[${i}].machines`] = [`Number of machine units (${machineUnits.length}) must match quantity (${quantity})`];
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse('Validation failed', errors);
    }

    // Process all transactions in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const allTransactionIds: string[] = [];
      let allTotalUnits = 0;

      for (const transaction of transactions) {
        const {
          brand: brandName,
          model: modelName,
          type: typeName,
          stockType,
          quantity,
          warrantyExpiry,
          condition,
          location,
          notes,
          transactionDate,
          performedBy,
          machines: machineUnits = [],
        } = transaction;

        // Find or create Brand
        let brand = await tx.brand.findFirst({
          where: { name: { equals: brandName, mode: 'insensitive' } },
        });

        if (!brand) {
          brand = await tx.brand.create({
            data: {
              name: brandName,
              code: brandName.toUpperCase().replace(/\s+/g, '_'),
              isActive: true,
            },
          });
        }

        // Find or create Model
        let model = await tx.model.findFirst({
          where: {
            name: { equals: modelName, mode: 'insensitive' },
            brandId: brand.id,
          },
        });

        if (!model) {
          model = await tx.model.create({
            data: {
              name: modelName,
              brandId: brand.id,
              code: modelName.toUpperCase().replace(/\s+/g, '_'),
              isActive: true,
            },
          });
        }

        // Find or create MachineType
        let machineType = await tx.machineType.findFirst({
          where: { name: { equals: typeName, mode: 'insensitive' } },
        });

        if (!machineType) {
          machineType = await tx.machineType.create({
            data: {
              name: typeName,
              code: typeName.toUpperCase().replace(/\s+/g, '_'),
              isActive: true,
            },
          });
        }

        // Create machines for each unit
        const createdMachines = [];
        const transactionDateObj = transactionDate ? new Date(transactionDate) : new Date();
        const warrantyExpiryDate = warrantyExpiry ? new Date(warrantyExpiry) : null;
        const performedByUser = performedBy || auth.email || 'System';

        for (const unit of machineUnits) {
          const { serialNumber, boxNo, barcode, qrCodeData } = unit;

          if (!serialNumber) {
            throw new Error(`Serial number is required for all machine units`);
          }

          // Generate QR code value if not provided
          let qrCodeValue = qrCodeData || barcode;
          if (!qrCodeValue) {
            qrCodeValue = `${brand.name}-${model.name}-${serialNumber}`.replace(/\s+/g, '-').toUpperCase();
          }

          // Check if machine with this serial number already exists
          const existingMachine = await tx.machine.findUnique({
            where: { serialNumber },
          });

          if (existingMachine) {
            throw new Error(`Machine with serial number ${serialNumber} already exists`);
          }

          // Check if QR code already exists
          const existingQrCode = await tx.machine.findUnique({
            where: { qrCodeValue },
          });

          if (existingQrCode) {
            throw new Error(`Machine with QR code ${qrCodeValue} already exists`);
          }

          // Create machine
          const machine = await tx.machine.create({
            data: {
              brandId: brand.id,
              modelId: model.id,
              typeId: machineType.id,
              serialNumber,
              boxNumber: boxNo || null,
              qrCodeValue,
              status: 'AVAILABLE',
              currentLocationType: 'WAREHOUSE',
              currentLocationName: location,
              conditionOnArrival: condition || stockType || null,
              warrantyStatus: warrantyExpiryDate ? 'ACTIVE' : null,
              warrantyExpiryDate,
              purchaseDate: transactionDateObj,
              notes: notes || null,
              onboardedByUserId: auth.id,
            },
          });

          createdMachines.push(machine);
        }

        // Get previous balance for this brand/model combination
        const previousEntries = await tx.bincardEntry.findMany({
          where: {
            brand: brand.name,
            model: model.name,
          },
          orderBy: { date: 'desc' },
          take: 1,
        });

        const previousBalance = previousEntries.length > 0 ? previousEntries[0].balance : 0;
        const newBalance = previousBalance + quantity;

        // Create bincard entry
        const bincardEntry = await tx.bincardEntry.create({
          data: {
            date: transactionDateObj,
            transactionType: 'STOCK_IN',
            brand: brand.name,
            model: model.name,
            machineType: machineType.name,
            reference: `STOCK-IN-${Date.now()}`,
            quantityIn: quantity,
            quantityOut: 0,
            balance: newBalance,
            location,
            stockType: stockType || null,
            warrantyExpiry: warrantyExpiryDate,
            condition: condition || null,
            performedBy: performedByUser,
            notes: notes || null,
          },
        });

        allTransactionIds.push(bincardEntry.id);

        // Create transaction log entry
        await tx.transactionLog.create({
          data: {
            transactionDate: transactionDateObj,
            category: 'INVENTORY',
            transactionType: 'STOCK_IN',
            reference: bincardEntry.id,
            description: `Stock in: ${quantity} unit(s) of ${brand.name} ${model.name}${stockType ? ` (${stockType})` : ''}`,
            brand: brand.name,
            model: model.name,
            quantity,
            location,
            performedBy: performedByUser,
            status: 'SUCCESS',
            notes: notes || (stockType ? `Stock Type: ${stockType}` : null),
          },
        });

        allTotalUnits += quantity;
      }

      return { transactionIds: allTransactionIds, totalUnits: allTotalUnits };
    });

    return successResponse(
      {
        transactionIds: result.transactionIds,
        totalUnits: result.totalUnits,
      },
      'Stock in recorded successfully',
      201
    );
  } catch (error: any) {
    console.error('Error creating stock-in transactions:', error);
    return errorResponse(error.message || 'Failed to create stock-in transactions', 500);
  }
});
