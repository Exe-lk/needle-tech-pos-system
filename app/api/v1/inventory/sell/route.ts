import { NextRequest } from 'next/server';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole, AuthUser } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

function normalizeBox(value: string | null | undefined): string {
  return (value ?? '').trim();
}

/**
 * POST /api/v1/inventory/sell
 * Records a machine sale: verifies serial/box, blocks if on PENDING/ACTIVE rental,
 * sets machine to RETIRED, creates bincard STOCK_OUT + transaction log entry.
 */
export const POST = withAuthAndRole(
  ['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER', 'Stock_Keeper'],
  async (request: NextRequest, auth: AuthUser) => {
    try {
      const body = await request.json().catch(() => ({}));
      const machineId = typeof body.machineId === 'string' ? body.machineId.trim() : '';
      const serialNumber = typeof body.serialNumber === 'string' ? body.serialNumber.trim() : '';
      const boxNumber = typeof body.boxNumber === 'string' ? body.boxNumber.trim() : '';

      if (!machineId) {
        return validationErrorResponse('Validation failed', { machineId: ['Machine id is required'] });
      }
      if (!serialNumber) {
        return validationErrorResponse('Validation failed', { serialNumber: ['Serial number is required'] });
      }

      const performedBy = auth.fullName || auth.username || 'System';

      const result = await prisma.$transaction(async (tx) => {
        const machine = await tx.machine.findUnique({
          where: { id: machineId },
          include: {
            brand: true,
            model: true,
            type: true,
          },
        });

        if (!machine) {
          return { error: 'not_found' as const };
        }

        if (machine.status === 'RETIRED') {
          return { error: 'already_retired' as const };
        }

        if (machine.serialNumber.trim() !== serialNumber) {
          return { error: 'serial_mismatch' as const };
        }

        if (normalizeBox(machine.boxNumber) !== normalizeBox(boxNumber)) {
          return { error: 'box_mismatch' as const };
        }

        const blockingRental = await tx.rentalMachine.findFirst({
          where: {
            machineId: machine.id,
            rental: { status: { in: ['PENDING', 'ACTIVE'] } },
          },
          include: { rental: { select: { agreementNumber: true, status: true } } },
        });

        if (blockingRental) {
          return {
            error: 'on_rental' as const,
            agreementNumber: blockingRental.rental.agreementNumber,
          };
        }

        const brandName = machine.brand.name;
        const modelName = machine.model?.name ?? 'N/A';
        const typeName = machine.type?.name ?? null;
        const now = new Date();
        const saleRef = `SALE-${Date.now()}`;

        const previousEntries = await tx.bincardEntry.findMany({
          where: { brand: brandName, model: modelName },
          orderBy: { date: 'desc' },
          take: 1,
        });
        const previousBalance = previousEntries.length > 0 ? previousEntries[0].balance : 0;
        const newBalance = Math.max(0, previousBalance - 1);

        const bincardEntry = await tx.bincardEntry.create({
          data: {
            date: now,
            transactionType: 'STOCK_OUT',
            brand: brandName,
            model: modelName,
            machineType: typeName,
            reference: saleRef,
            quantityIn: 0,
            quantityOut: 1,
            balance: newBalance,
            location: machine.currentLocationName ?? machine.currentLocationType ?? undefined,
            performedBy,
            notes: `Sale — S/N ${machine.serialNumber}, Box ${normalizeBox(machine.boxNumber) || 'N/A'}`,
          },
        });

        const saleNote = `Sold via inventory (${saleRef})`;
        const existingNotes = machine.notes?.trim();
        const mergedNotes = existingNotes ? `${existingNotes} | ${saleNote}` : saleNote;

        await tx.machine.update({
          where: { id: machine.id },
          data: {
            status: 'RETIRED',
            notes: mergedNotes,
            currentLocationType: null,
            currentLocationName: null,
            currentLocationAddress: null,
          },
        });

        const unitPrice = machine.unitPrice != null ? Number(machine.unitPrice) : null;

        await tx.transactionLog.create({
          data: {
            transactionDate: now,
            category: 'INVENTORY',
            transactionType: 'STOCK_OUT',
            reference: bincardEntry.id,
            description: `Sale: 1 unit — ${brandName} ${modelName} (S/N ${machine.serialNumber})`,
            brand: brandName,
            model: modelName,
            quantity: 1,
            location: machine.currentLocationName ?? machine.currentLocationType ?? undefined,
            performedBy,
            status: 'SUCCESS',
            amount: unitPrice != null && !Number.isNaN(unitPrice) ? unitPrice : null,
            notes: `Machine sale. Box: ${normalizeBox(machine.boxNumber) || 'N/A'}`,
          },
        });

        return {
          machineId: machine.id,
          bincardEntryId: bincardEntry.id,
        };
      });

      if ('error' in result) {
        if (result.error === 'not_found') {
          return errorResponse('Machine not found', 404);
        }
        if (result.error === 'already_retired') {
          return errorResponse('This machine is already retired and not in active inventory', 400);
        }
        if (result.error === 'serial_mismatch') {
          return errorResponse('Serial number does not match this machine', 400);
        }
        if (result.error === 'box_mismatch') {
          return errorResponse('Box number does not match this machine', 400);
        }
        if (result.error === 'on_rental') {
          return errorResponse(
            `Cannot sell: machine is on hiring agreement ${result.agreementNumber} (pending or active).`,
            409
          );
        }
        return errorResponse('Unable to process sale', 500);
      }

      return successResponse(
        {
          machineId: result.machineId,
          bincardEntryId: result.bincardEntryId,
        },
        'Machine recorded as sold and removed from active inventory',
        200
      );
    } catch (e: unknown) {
      console.error('Inventory sell error:', e);
      return errorResponse(e instanceof Error ? e.message : 'Failed to record sale', 500);
    }
  }
);
