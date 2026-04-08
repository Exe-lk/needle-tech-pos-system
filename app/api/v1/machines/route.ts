import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole, AuthUser } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { Prisma, MachineStatus } from '@prisma/client';
import { toPrismaDecimalMoneyInput } from '@/lib/decimal-money';

// Helper function to transform machine data for frontend
type MachineWithRelations = {
  id: string;
  serialNumber?: string | null;
  boxNumber?: string | null;
  status?: string;
  photos?: string[] | null;
  manufactureYear?: string | null;
  country?: string | null;
  conditionOnArrival?: string | null;
  warrantyStatus?: string | null;
  warrantyExpiryDate?: Date | string | null;
  purchaseDate?: Date | string | null;
  currentLocationName?: string | null;
  notes?: string | null;
  qrCodeValue?: string | null;
  qrCodeImageUrl?: string | null;
  voltage?: string | null;
  power?: string | null;
  stitchType?: string | null;
  maxSpeedSpm?: number | null;
  currentCustomer?: string | null;
  unitPrice: unknown;
  monthlyRentalFee: unknown;
  brand?: { name: string | null } | null;
  model?: { name: string | null } | null;
  type?: { name: string | null } | null;
};

const toNumberOrNull = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  // Prisma Decimal sometimes serializes to string-ish objects; be defensive
  if (typeof v === 'object' && v && 'toString' in v && typeof (v as { toString: () => string }).toString === 'function') {
    const s = (v as { toString: () => string }).toString();
    if (s.trim() !== '' && !Number.isNaN(Number(s))) return Number(s);
  }
  return null;
};

const transformMachineForFrontend = (machine: MachineWithRelations) => {
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

  const backendStatus = machine.status || 'AVAILABLE';

  return {
    id: machine.id,
    barcode,
    serialNumber: machine.serialNumber || '',
    boxNo: machine.boxNumber || '',
    brand: machine.brand?.name || '',
    model: machine.model?.name || '',
    type: machine.type?.name || 'Other',
    status: statusMap[backendStatus] || 'Available',
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
    unitPrice: toNumberOrNull(machine.unitPrice),
    monthlyRentalFee: toNumberOrNull(machine.monthlyRentalFee),
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
export const GET = withAuthAndRole(['SUPER_ADMIN','ADMIN', 'Operational_Officer', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);

    const statusFilter = searchParams.get('status');
    const brandIdFilter = searchParams.get('brandId');
    const modelIdFilter = searchParams.get('modelId');
    const typeFilter = searchParams.get('type');

    const where: Prisma.MachineWhereInput = {};

    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { boxNumber: { contains: search, mode: 'insensitive' } },
        { qrCodeValue: { contains: search, mode: 'insensitive' } },
        { brand: { name: { contains: search, mode: 'insensitive' } } },
        { model: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (statusFilter) {
      const statusUpper = statusFilter.toUpperCase();
      const allowed: MachineStatus[] = ['AVAILABLE', 'RENTED', 'DAMAGED', 'MAINTENANCE', 'RETIRED'];
      if (allowed.includes(statusUpper as MachineStatus)) {
        where.status = statusUpper as MachineStatus;
      }
    }
    if (brandIdFilter) where.brandId = brandIdFilter;
    if (modelIdFilter) where.modelId = modelIdFilter;
    if (typeFilter) {
      where.type = { name: { equals: typeFilter, mode: 'insensitive' } };
    }

    const sortOrder_ = sortOrder === 'asc' ? 'asc' : 'desc';

    // Fetch all matching machines (no pagination yet — we paginate over groups)
    const machines = await prisma.machine.findMany({
      where,
      orderBy: { createdAt: 'asc' }, // stable order within DB
      include: {
        brand: true,
        model: true,
        type: true,
      },
    });

    // Group by (brandId, modelId, typeId); handle nulls for model/type
    const groupKey = (m: { brandId: string; modelId: string | null; typeId: string | null }) =>
      `${m.brandId}|${m.modelId ?? ''}|${m.typeId ?? ''}`;

    const groupMap = new Map<string, typeof machines>();
    for (const m of machines) {
      const key = groupKey(m);
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(m);
    }

    type Group = { machines: typeof machines; first: (typeof machines)[0] };
    const groups: Group[] = Array.from(groupMap.values()).map((arr) => ({
      machines: arr,
      first: arr[0],
    }));

    // Sort groups by brand name, then model name, then type name (nulls last)
    const sortByField = sortBy === 'brand' || sortBy === 'model' || sortBy === 'type' ? sortBy : 'brand';
    groups.sort((a, b) => {
      const aBrand = a.first.brand?.name ?? '';
      const aModel = a.first.model?.name ?? '';
      const aType = a.first.type?.name ?? '';
      const bBrand = b.first.brand?.name ?? '';
      const bModel = b.first.model?.name ?? '';
      const bType = b.first.type?.name ?? '';
      let cmp = 0;
      if (sortByField === 'brand') cmp = aBrand.localeCompare(bBrand) || aModel.localeCompare(bModel) || aType.localeCompare(bType);
      else if (sortByField === 'model') cmp = aModel.localeCompare(bModel) || aBrand.localeCompare(bBrand) || aType.localeCompare(bType);
      else cmp = aType.localeCompare(bType) || aBrand.localeCompare(bBrand) || aModel.localeCompare(bModel);
      return sortOrder_ === 'asc' ? cmp : -cmp;
    });

    const totalItems = groups.length;
    const skip = (page - 1) * limit;
    const paginatedGroups = groups.slice(skip, skip + limit);

    // Map each group to one row for the list; keep same shape as before + count
    const transformedMachines = paginatedGroups.map(({ machines: groupMachines, first }) => {
      const count = groupMachines.length;
      const single = count === 1;
      const transformed = transformMachineForFrontend(first);
      return {
        ...transformed,
        id: first.id,
        barcode: single ? transformed.barcode : '—',
        serialNumber: single ? transformed.serialNumber : `${count} units`,
        boxNo: single ? transformed.boxNo : '—',
        brand: transformed.brand,
        model: transformed.model,
        type: transformed.type,
        count,
      };
    });

    const pagination = buildPaginationMeta(totalItems, page, limit);

    return paginatedResponse(
      transformedMachines,
      pagination,
      'Machines retrieved successfully',
      { sortBy: sortByField, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(statusFilter && { status: statusFilter }),
        ...(brandIdFilter && { brandId: brandIdFilter }),
        ...(modelIdFilter && { modelId: modelIdFilter }),
        ...(typeFilter && { type: typeFilter }),
      }
    );
  } catch (error: unknown) {
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
export const POST = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'Operational_Officer', 'MANAGER'], async (request: NextRequest, auth: AuthUser) => {
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
      notes,
      voltage,
      power,
      stitchType,
      maxSpeedSpm,
      purchaseDate,
      location,
      unitPrice,
      monthlyRentalFee,
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

    const performedByUser = auth?.email || 'System';
    const transactionDateObj = purchaseDate ? new Date(purchaseDate) : new Date();

    type TxResult = { newMachine: MachineWithRelations } | { error: Response };

    const result: TxResult = await prisma.$transaction(async (tx): Promise<TxResult> => {
      // Find or create Brand
      let brand;
      if (brandId) {
        brand = await tx.brand.findUnique({ where: { id: brandId } });
        if (!brand) {
          return { error: validationErrorResponse('Invalid brand ID', { brandId: ['Brand not found'] }) };
        }
      } else {
        brand = await tx.brand.findFirst({
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
      }

      // Find or create Model
      let model;
      if (modelId) {
        model = await tx.model.findUnique({ where: { id: modelId } });
        if (!model) {
          return { error: validationErrorResponse('Invalid model ID', { modelId: ['Model not found'] }) };
        }
      } else {
        model = await tx.model.findFirst({
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
      }

      // Find or create MachineType
      let machineType;
      if (machineTypeId) {
        machineType = await tx.machineType.findUnique({ where: { id: machineTypeId } });
      } else if (typeName) {
        machineType = await tx.machineType.findFirst({
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
      }

      // Generate serial number and box number if not provided
      const serialNumber = providedSerialNumber || `SN-${Date.now().toString(36).toUpperCase()}`;
      const boxNumber = providedBoxNumber || `BOX-${Date.now().toString(36).toUpperCase()}`;

      // Check if serial number already exists
      const existingMachine = await tx.machine.findFirst({
        where: { serialNumber },
      });
      if (existingMachine) {
        return {
          error: validationErrorResponse('Serial number already exists', {
            serialNumber: ['This serial number is already in use'],
          }),
        };
      }

      // Generate QR code value (barcode)
      const qrCodeValue = `${brand.name}-${model.name}-${serialNumber}`.replace(/\s+/g, '-').toUpperCase();

      // Map frontend status to backend status
      const statusMap: Record<string, 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RETIRED' | 'DAMAGED'> = {
        Available: 'AVAILABLE',
        Rented: 'RENTED',
        Maintenance: 'MAINTENANCE',
        Retired: 'RETIRED',
      };
      const backendStatus = statusMap[frontendStatus || 'Available'] || ('AVAILABLE' as const);

      // Collect all photos - filter valid strings only
      const allPhotos: string[] = [];
      const extractValidUrls = (data: unknown): string[] => {
        if (!data) return [];
        if (typeof data === 'string' && data.trim()) return [data];
        if (Array.isArray(data)) return data.filter((item) => typeof item === 'string' && item.trim() !== '');
        return [];
      };
      allPhotos.push(...extractValidUrls(referencePhoto));
      allPhotos.push(...extractValidUrls(serialPlatePhoto));

      const resolvedLocation = (location && String(location).trim()) || 'Main Warehouse';

      // Prepare machine data
      const machineData: Prisma.MachineUncheckedCreateInput = {
        serialNumber,
        boxNumber,
        brandId: brand.id,
        modelId: model.id,
        typeId: machineType?.id ?? null,
        qrCodeValue,
        status: backendStatus,
        photos: allPhotos,
        voltage: voltage || null,
        power: power || null,
        stitchType: stitchType || null,
        maxSpeedSpm: maxSpeedSpm ? parseInt(maxSpeedSpm) : null,
        specsOther: null,
        currentLocationName: resolvedLocation,
        onboardedByUserId: auth.id,
      };

      if (manufactureYear) machineData.manufactureYear = manufactureYear;
      if (country) machineData.country = country;
      if (conditionOnArrival) machineData.conditionOnArrival = conditionOnArrival;
      if (warrantyStatus) machineData.warrantyStatus = warrantyStatus;
      if (warrantyExpiryDate) machineData.warrantyExpiryDate = new Date(warrantyExpiryDate);
      if (purchaseDate) machineData.purchaseDate = new Date(purchaseDate);
      if (notes) machineData.notes = notes;
      if (unitPrice != null && unitPrice !== '') {
        const d = toPrismaDecimalMoneyInput(unitPrice);
        if (d !== undefined) machineData.unitPrice = d;
      }
      if (monthlyRentalFee != null && monthlyRentalFee !== '') {
        const d = toPrismaDecimalMoneyInput(monthlyRentalFee);
        if (d !== undefined) machineData.monthlyRentalFee = d;
      }

      const newMachine = await tx.machine.create({
        data: machineData,
        include: { brand: true, model: true, type: true },
      });

      // ---- Inventory accounting for initial onboarding (bincard + transaction log)
      const previousEntries = await tx.bincardEntry.findMany({
        where: { brand: brand.name, model: model.name },
        orderBy: { date: 'desc' },
        take: 1,
      });
      const previousBalance = previousEntries.length > 0 ? previousEntries[0].balance : 0;
      const newBalance = previousBalance + 1;

      const warrantyExpiryDateObj = warrantyExpiryDate ? new Date(warrantyExpiryDate) : null;

      const bincardEntry = await tx.bincardEntry.create({
        data: {
          date: transactionDateObj,
          transactionType: 'STOCK_IN',
          brand: brand.name,
          model: model.name,
          machineType: machineType?.name || null,
          reference: `MACHINE-REG-${serialNumber}`,
          quantityIn: 1,
          quantityOut: 0,
          balance: newBalance,
          location: resolvedLocation,
          stockType: conditionOnArrival || null,
          warrantyExpiry: warrantyExpiryDateObj,
          condition: conditionOnArrival || null,
          performedBy: performedByUser,
          notes: notes || null,
        },
      });

      await tx.transactionLog.create({
        data: {
          transactionDate: transactionDateObj,
          category: 'INVENTORY',
          transactionType: 'STOCK_IN',
          reference: bincardEntry.id,
          description: `Machine registration (stock in): 1 unit of ${brand.name} ${model.name} (SN: ${serialNumber})`,
          brand: brand.name,
          model: model.name,
          quantity: 1,
          location: resolvedLocation,
          performedBy: performedByUser,
          status: 'SUCCESS',
          notes: notes || null,
        },
      });

      return { newMachine: newMachine as unknown as MachineWithRelations };
    });

    if ('error' in result) {
      return result.error;
    }

    const newMachine = result.newMachine;
    
    // Transform for frontend
    const transformedMachine = transformMachineForFrontend(newMachine);
    
    return successResponse(transformedMachine, 'Machine created successfully', 201);
  } catch (error: unknown) {
    console.error('Error creating machine:', error);
    
    // Handle Prisma errors
    const e = error as { code?: string; meta?: { target?: string[] }; message?: string };
    if (e.code === 'P2002') {
      return validationErrorResponse('Duplicate entry', {
        [e.meta?.target?.[0] || 'field']: ['This value already exists'],
      });
    }
    
    // Handle missing fields error
    if (e.code === 'P2003') {
      return validationErrorResponse('Invalid reference', {
        field: ['Referenced record does not exist'],
      });
    }
    
    return errorResponse('Failed to create machine: ' + (e.message || 'Unknown error'), 500);
  }
});
