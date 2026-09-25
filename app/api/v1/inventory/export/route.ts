import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

/**
 * @swagger
 * /api/v1/inventory/export:
 *   get:
 *     summary: Export complete inventory as Excel
 *     description: Downloads full inventory as an .xlsx file with Summary and Machine Units sheets
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel file download
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
export const GET = withAuthAndRole(
  ['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER', 'OPERATOR', 'USER', 'Stock_Keeper'],
  async (_request: NextRequest) => {
    try {
      const machines = await prisma.machine.findMany({
        include: {
          brand: true,
          model: true,
          type: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
      });

      const reservedMachineIds = new Set<string>();
      const pendingRentalMachineIds = await prisma.rentalMachine.findMany({
        where: { rental: { status: 'PENDING' as any } },
        select: { machineId: true },
      });
      pendingRentalMachineIds.forEach((rm) => reservedMachineIds.add(rm.machineId));

      const inventoryMap = new Map<
        string,
        {
          brand: string;
          model: string;
          type: string;
          totalStock: number;
          availableStock: number;
          reservedStock: number;
          rentedStock: number;
          maintenanceStock: number;
          retiredStock: number;
          lastUpdated: Date;
        }
      >();

      for (const machine of machines) {
        const brandName = machine.brand.name;
        const modelName = machine.model?.name || 'N/A';
        const typeName = machine.type?.name || 'N/A';
        const key = `${brandName}|||${modelName}|||${typeName}`;

        if (!inventoryMap.has(key)) {
          inventoryMap.set(key, {
            brand: brandName,
            model: modelName,
            type: typeName,
            totalStock: 0,
            availableStock: 0,
            reservedStock: 0,
            rentedStock: 0,
            maintenanceStock: 0,
            retiredStock: 0,
            lastUpdated: machine.updatedAt,
          });
        }

        const item = inventoryMap.get(key)!;
        item.totalStock++;

        switch (machine.status) {
          case 'AVAILABLE':
            if (reservedMachineIds.has(machine.id)) {
              item.reservedStock++;
            } else {
              item.availableStock++;
            }
            break;
          case 'RENTED':
            item.rentedStock++;
            break;
          case 'MAINTENANCE':
            item.maintenanceStock++;
            break;
          case 'RETIRED':
            item.retiredStock++;
            break;
        }

        if (machine.updatedAt > item.lastUpdated) {
          item.lastUpdated = machine.updatedAt;
        }
      }

      const inventory = Array.from(inventoryMap.values()).sort((a, b) => {
        const brandCmp = a.brand.localeCompare(b.brand);
        if (brandCmp !== 0) return brandCmp;
        const modelCmp = a.model.localeCompare(b.model);
        if (modelCmp !== 0) return modelCmp;
        return a.type.localeCompare(b.type);
      });

      const summaryData: (string | number)[][] = [
        [
          'Brand',
          'Model',
          'Type',
          'Total Stock',
          'Available',
          'Reserved',
          'Rented',
          'Maintenance',
          'Retired',
          'Last Updated',
        ],
        ...inventory.map((item) => [
          item.brand,
          item.model,
          item.type,
          item.totalStock,
          item.availableStock,
          item.reservedStock,
          item.rentedStock,
          item.maintenanceStock,
          item.retiredStock,
          item.lastUpdated.toISOString().split('T')[0],
        ]),
      ];

      const unitsData: (string | number)[][] = [
        ['Brand', 'Model', 'Type', 'Serial Number', 'Box Number', 'Status', 'Last Updated'],
        ...machines.map((machine) => {
          let statusLabel = machine.status;
          if (machine.status === 'AVAILABLE' && reservedMachineIds.has(machine.id)) {
            statusLabel = 'RESERVED';
          }
          return [
            machine.brand.name,
            machine.model?.name || 'N/A',
            machine.type?.name || 'N/A',
            machine.serialNumber || '',
            machine.boxNumber || '',
            statusLabel,
            machine.updatedAt.toISOString().split('T')[0],
          ];
        }),
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(unitsData), 'Machine Units');

      const date = new Date().toISOString().split('T')[0];
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      return new Response(buffer, {
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Inventory_Export_${date}.xlsx"`,
        },
      });
    } catch (error: unknown) {
      console.error('Error exporting inventory:', error);
      return errorResponse('Failed to export inventory', 500);
    }
  }
);
