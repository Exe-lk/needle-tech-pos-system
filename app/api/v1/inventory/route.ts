import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { RentalStatus } from '@prisma/client';

/**
 * @swagger
 * /api/v1/inventory:
 *   get:
 *     summary: List inventory with stock levels by brand/model
 *     description: Returns inventory items with stock levels per brand/model/type
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by brand or model
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by machine type
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Column to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER', 'Stock_Keeper'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const typeFilter = searchParams.get('type');
    
    // Build where clause for machines
    const machineWhere: any = {};
    
    if (search) {
      machineWhere.OR = [
        { brand: { name: { contains: search, mode: 'insensitive' } } },
        { model: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    
    if (typeFilter) {
      machineWhere.type = { name: { equals: typeFilter, mode: 'insensitive' } };
    }
    
    // Get all machines with their brand, model, and type
    const machines = await prisma.machine.findMany({
      where: machineWhere,
      include: {
        brand: true,
        model: true,
        type: true,
      },
    });

    // Machine IDs that are "reserved" (assigned to a PENDING rental – not yet dispatched)
    const reservedMachineIds = new Set<string>();
    const pendingRentalMachineIds = await prisma.rentalMachine.findMany({
      where: { rental: { status: 'PENDING' as any } },
      select: { machineId: true },
    });
    pendingRentalMachineIds.forEach((rm) => reservedMachineIds.add(rm.machineId));
    
    // Group machines by brand/model/type combination
    const inventoryMap = new Map<string, {
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
    }>();
    
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
    
    // Convert map to array
    let inventory = Array.from(inventoryMap.values());
    
    // Apply sorting
    const sortField = sortBy || 'brand';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    
    inventory.sort((a, b) => {
      let aVal: any = a[sortField as keyof typeof a];
      let bVal: any = b[sortField as keyof typeof b];
      
      if (sortField === 'lastUpdated') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (aVal < bVal) return -1 * sortDirection;
      if (aVal > bVal) return 1 * sortDirection;
      return 0;
    });
    
    // Apply pagination
    const totalItems = inventory.length;
    const skip = (page - 1) * limit;
    const paginatedInventory = inventory.slice(skip, skip + limit);
    
    // Format dates
    const formattedInventory = paginatedInventory.map(item => ({
      id: `${item.brand}-${item.model}-${item.type}`.replace(/\s+/g, '-').toLowerCase(),
      brand: item.brand,
      model: item.model,
      type: item.type,
      totalStock: item.totalStock,
      availableStock: item.availableStock,
      reservedStock: item.reservedStock,
      rentedStock: item.rentedStock,
      maintenanceStock: item.maintenanceStock,
      retiredStock: item.retiredStock,
      lastUpdated: item.lastUpdated.toISOString().split('T')[0],
    }));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      { inventory: formattedInventory } as any,
      pagination,
      'Inventory retrieved successfully',
      { sortBy: sortField, sortOrder },
      search || undefined,
      {
        ...(typeFilter && { type: typeFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching inventory:', error);
    return errorResponse('Failed to retrieve inventory', 500);
  }
});
