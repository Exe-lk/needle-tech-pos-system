import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

// Helper function to transform machine data for frontend
const transformMachineForFrontend = (machine: any) => {
  // Generate barcode from brand-model-serialNumber if not present
  const barcode = machine.qrCodeValue || 
    `${machine.brand?.name || ''}-${machine.model?.name || ''}-${machine.serialNumber}`.replace(/\s+/g, '-').toUpperCase();
  
  // Map backend status to frontend status
  const statusMap: Record<string, string> = {
    'AVAILABLE': 'Available',
    'RENTED': 'Rented',
    'MAINTENANCE': 'Maintenance',
    'RETIRED': 'Retired',
    'DAMAGED': 'Maintenance'
  };

  return {
    id: machine.id,
    barcode,
    serialNumber: machine.serialNumber || '',
    boxNo: machine.boxNumber || '',
    brand: machine.brand?.name || '',
    model: machine.model?.name || '',
    type: machine.type?.name || 'Other',
    status: statusMap[machine.status] || 'Available',
    photos: machine.photos || [],
    manufactureYear: machine.manufactureYear || '',
    country: machine.country || '',
    conditionOnArrival: machine.conditionOnArrival || '',
    warrantyStatus: machine.warrantyStatus || '',
    warrantyExpiryDate: machine.warrantyExpiryDate || null,
    purchaseDate: machine.purchaseDate || null,
    location: machine.currentLocationName || '',
    notes: machine.notes || '',
    qrCodeValue: machine.qrCodeValue || '',
    qrCodeImageUrl: machine.qrCodeImageUrl || '',
    // Additional fields
    voltage: machine.voltage || '',
    power: machine.power || '',
    stitchType: machine.stitchType || '',
    maxSpeedSpm: machine.maxSpeedSpm || null,
    currentCustomer: machine.currentCustomer || null,
  };
};

/**
 * @swagger
 * /api/v1/machines:
 *   get:
 *     summary: Get all machines
 *     description: Retrieve paginated list of machines with Supabase auth
 *     tags: [Machines]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 */
export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const statusFilter = searchParams.get('status');
    const brandIdFilter = searchParams.get('brandId');
    const typeFilter = searchParams.get('type');
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { boxNumber: { contains: search, mode: 'insensitive' } },
        { qrCodeValue: { contains: search, mode: 'insensitive' } },
        { brand: { name: { contains: search, mode: 'insensitive' } } },
        { model: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    
    if (statusFilter) where.status = statusFilter.toUpperCase();
    if (brandIdFilter) where.brandId = brandIdFilter;
    if (typeFilter) {
      where.type = { name: { equals: typeFilter, mode: 'insensitive' } };
    }
    
    const totalItems = await prisma.machine.count({ where });
    const skip = (page - 1) * limit;
    const sortOrder_ = sortOrder === 1 ? 'asc' : 'desc';
    
    const machines = await prisma.machine.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder_ },
      include: { 
        brand: true, 
        model: true, 
        type: true 
      }
    });
    
    // Transform machines for frontend
    const transformedMachines = machines.map(transformMachineForFrontend);
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      transformedMachines,
      pagination,
      'Machines retrieved successfully',
      { sortBy, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(statusFilter && { status: statusFilter }),
        ...(brandIdFilter && { brandId: brandIdFilter }),
        ...(typeFilter && { type: typeFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching machines:', error);
    return errorResponse('Failed to retrieve machines', 500);
  }
});

/**
 * @swagger
 * /api/v1/machines:
 *   post:
 *     summary: Create a new machine
 *     description: Create a new machine with Supabase auth (Admin/Manager only)
 *     tags: [Machines]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - brand
 *               - model
 *               - type
 *             properties:
 *               brand:
 *                 type: string
 *               model:
 *                 type: string
 *               type:
 *                 type: string
 *               manufactureYear:
 *                 type: string
 *               country:
 *                 type: string
 *               conditionOnArrival:
 *                 type: string
 *               status:
 *                 type: string
 *               warrantyStatus:
 *                 type: string
 *               warrantyExpiryDate:
 *                 type: string
 *               referencePhoto:
 *                 type: array
 *               serialPlatePhoto:
 *                 type: array
 *               invoiceGrn:
 *                 type: array
 */
export const POST = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { 
      brand: brandName, 
      model: modelName, 
      type: typeName,
      manufactureYear,
      country,
      conditionOnArrival,
      status: frontendStatus,
      warrantyStatus,
      warrantyExpiryDate,
      referencePhoto,
      serialPlatePhoto,
      invoiceGrn,
      notes,
      voltage,
      power,
      stitchType,
      maxSpeedSpm,
      purchaseDate,
      location,
      // Legacy support
      serialNumber: providedSerialNumber,
      boxNumber: providedBoxNumber,
      brandId,
      modelId,
      machineTypeId
    } = body;
    
    // Validation
    const errors: Record<string, string[]> = {};
    
    if (!brandName && !brandId) {
      errors.brand = ['Brand is required'];
    }
    if (!modelName && !modelId) {
      errors.model = ['Model is required'];
    }
    if (!typeName && !machineTypeId) {
      errors.type = ['Type is required'];
    }
    
    if (Object.keys(errors).length > 0) {
      return validationErrorResponse('Missing required fields', errors);
    }
    
    // Find or create Brand
    let brand;
    if (brandId) {
      brand = await prisma.brand.findUnique({ where: { id: brandId } });
      if (!brand) {
        return validationErrorResponse('Invalid brand ID', {
          brandId: ['Brand not found'],
        });
      }
    } else {
      brand = await prisma.brand.findFirst({
        where: { name: { equals: brandName, mode: 'insensitive' } }
      });
      
      if (!brand) {
        // Create new brand
        brand = await prisma.brand.create({
          data: {
            name: brandName,
            code: brandName.toUpperCase().replace(/\s+/g, '_'),
            isActive: true
          }
        });
      }
    }
    
    // Find or create Model
    let model;
    if (modelId) {
      model = await prisma.model.findUnique({ where: { id: modelId } });
      if (!model) {
        return validationErrorResponse('Invalid model ID', {
          modelId: ['Model not found'],
        });
      }
    } else {
      model = await prisma.model.findFirst({
        where: { 
          name: { equals: modelName, mode: 'insensitive' },
          brandId: brand.id
        }
      });
      
      if (!model) {
        // Create new model
        model = await prisma.model.create({
          data: {
            name: modelName,
            brandId: brand.id,
            code: modelName.toUpperCase().replace(/\s+/g, '_'),
            isActive: true
          }
        });
      }
    }
    
    // Find or create MachineType
    let machineType;
    if (machineTypeId) {
      machineType = await prisma.machineType.findUnique({ where: { id: machineTypeId } });
    } else if (typeName) {
      machineType = await prisma.machineType.findFirst({
        where: { name: { equals: typeName, mode: 'insensitive' } }
      });
      
      if (!machineType) {
        // Create new machine type
        machineType = await prisma.machineType.create({
          data: {
            name: typeName,
            code: typeName.toUpperCase().replace(/\s+/g, '_'),
            isActive: true
          }
        });
      }
    }
    
    // Generate serial number and box number if not provided
    const serialNumber = providedSerialNumber || `SN-${Date.now().toString(36).toUpperCase()}`;
    const boxNumber = providedBoxNumber || `BOX-${Date.now().toString(36).toUpperCase()}`;
    
    // Check if serial number already exists
    const existingMachine = await prisma.machine.findFirst({
      where: { serialNumber }
    });
    
    if (existingMachine) {
      return validationErrorResponse('Serial number already exists', {
        serialNumber: ['This serial number is already in use'],
      });
    }
    
    // Generate QR code value (barcode)
    const qrCodeValue = `${brand.name}-${model.name}-${serialNumber}`.replace(/\s+/g, '-').toUpperCase();
    
    // Map frontend status to backend status
    const statusMap: Record<string, 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RETIRED' | 'DAMAGED'> = {
      'Available': 'AVAILABLE',
      'Rented': 'RENTED',
      'Maintenance': 'MAINTENANCE',
      'Retired': 'RETIRED'
    };
    const backendStatus = statusMap[frontendStatus || 'Available'] || 'AVAILABLE' as const;
    
    // Collect all photos - filter valid strings only
const allPhotos: string[] = [];

// Extract valid photo URLs (strings only, ignore objects/files)
const extractValidUrls = (data: any): string[] => {
  if (!data) return [];
  if (typeof data === 'string' && data.trim()) return [data];
  if (Array.isArray(data)) {
    return data.filter(item => typeof item === 'string' && item.trim() !== '');
  }
  return [];
};

allPhotos.push(...extractValidUrls(referencePhoto));
allPhotos.push(...extractValidUrls(serialPlatePhoto));

console.log('Photos to save:', allPhotos); // Debug log
    
    // Prepare machine data
    const machineData: any = {
      serialNumber,
      boxNumber,
      brandId: brand.id,
      modelId: model.id,
      typeId: machineType?.id,
      qrCodeValue,
      status: backendStatus,
      photos: allPhotos,
      voltage: voltage || null,
      power: power || null,
      stitchType: stitchType || null,
      maxSpeedSpm: maxSpeedSpm ? parseInt(maxSpeedSpm) : null,
      specsOther: null,
      currentLocationName: location || null,
    };

    // Add additional fields (these require Prisma schema update and regeneration)
    if (manufactureYear) machineData.manufactureYear = manufactureYear;
    if (country) machineData.country = country;
    if (conditionOnArrival) machineData.conditionOnArrival = conditionOnArrival;
    if (warrantyStatus) machineData.warrantyStatus = warrantyStatus;
    if (warrantyExpiryDate) machineData.warrantyExpiryDate = new Date(warrantyExpiryDate);
    if (purchaseDate) machineData.purchaseDate = new Date(purchaseDate);
    if (notes) machineData.notes = notes;

    // Create machine with all fields
    const newMachine = await prisma.machine.create({
      data: machineData,
      include: { 
        brand: true, 
        model: true, 
        type: true 
      }
    });
    
    // Transform for frontend
    const transformedMachine = transformMachineForFrontend(newMachine);
    
    return successResponse(transformedMachine, 'Machine created successfully', 201);
  } catch (error: any) {
    console.error('Error creating machine:', error);
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return validationErrorResponse('Duplicate entry', {
        [error.meta?.target?.[0] || 'field']: ['This value already exists'],
      });
    }
    
    // Handle missing fields error
    if (error.code === 'P2003') {
      return validationErrorResponse('Invalid reference', {
        field: ['Referenced record does not exist'],
      });
    }
    
    return errorResponse('Failed to create machine: ' + error.message, 500);
  }
});
