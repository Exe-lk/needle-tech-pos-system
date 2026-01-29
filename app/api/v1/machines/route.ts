import { NextRequest } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta, sanitizeObject, toObjectId, isValidObjectId } from '@/lib/utils';
import { withAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const db = await getDatabase();
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);
    
    const brandFilter = searchParams.get('brand');
    const statusFilter = searchParams.get('status');
    const categoryFilter = searchParams.get('category');
    
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { serialNumber: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { boxNumber: { $regex: search, $options: 'i' } },
        { 'qrCode.value': { $regex: search, $options: 'i' } },
      ];
    }
    
    if (brandFilter) filter.brand = brandFilter;
    if (statusFilter) filter.status = statusFilter;
    if (categoryFilter) filter.category = categoryFilter;
    
    const totalItems = await db.collection('machines').countDocuments(filter);
    const skip = (page - 1) * limit;
    const sortObj: Record<string, 1 | -1> = { [sortBy]: sortOrder as 1 | -1 };
    
    const machines = await db
      .collection('machines')
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    const sanitizedMachines = machines.map(machine => sanitizeObject(machine));
    
    const pagination = buildPaginationMeta(totalItems, page, limit);
    
    return paginatedResponse(
      sanitizedMachines,
      pagination,
      'Machines retrieved successfully',
      { sortBy, sortOrder: sortOrder === 1 ? 'asc' : 'desc' },
      search || undefined,
      {
        ...(brandFilter && { brand: brandFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching machines:', error);
    return errorResponse('Failed to retrieve machines', 500);
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { 
      brandId, brandName, brand, // Brand can be provided as ID, name, or string
      modelId, modelName, model, // Model can be provided as ID, name, or string
      typeId, typeName, category, // Type can be provided as ID, name, or string
      serialNumber, boxNumber, photos, specs, currentLocation 
    } = body;
    
    if (!serialNumber) {
      return validationErrorResponse('Missing required fields', {
        serialNumber: !serialNumber ? ['Serial number is required'] : [],
      });
    }
    
    const db = await getDatabase();
    
    // Check if serial number already exists
    const existingMachine = await db.collection('machines').findOne({ serialNumber });
    if (existingMachine) {
      return validationErrorResponse('Serial number already exists', {
        serialNumber: ['Serial number already exists'],
      });
    }
    
    const now = new Date();
    
    // Handle Brand: brandId > brandName > brand (string)
    let finalBrandName = '';
    if (brandId && isValidObjectId(brandId)) {
      const brandDoc = await db.collection('brands').findOne({ _id: toObjectId(brandId) });
      if (!brandDoc) {
        return validationErrorResponse('Brand not found', {
          brandId: ['Invalid brand ID'],
        });
      }
      finalBrandName = brandDoc.name;
    } else if (brandName) {
      // Check if brand exists, if not create it
      let brandDoc = await db.collection('brands').findOne({ 
        name: { $regex: new RegExp(`^${brandName}$`, 'i') } 
      });
      if (!brandDoc) {
        // Create new brand on-the-fly
        const brandCode = brandName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        const newBrand = {
          name: brandName.trim(),
          code: brandCode,
          description: '',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };
        const brandResult = await db.collection('brands').insertOne(newBrand);
        brandDoc = await db.collection('brands').findOne({ _id: brandResult.insertedId });
      }
      finalBrandName = brandDoc.name;
    } else if (brand) {
      // Legacy support: brand as string
      finalBrandName = brand;
    } else {
      return validationErrorResponse('Missing required fields', {
        brand: ['Brand is required (provide brandId, brandName, or brand)'],
      });
    }
    
    // Handle Model: modelId > modelName > model (string)
    let finalModelName = '';
    if (modelId && isValidObjectId(modelId)) {
      const modelDoc = await db.collection('models').findOne({ _id: toObjectId(modelId) });
      if (!modelDoc) {
        return validationErrorResponse('Model not found', {
          modelId: ['Invalid model ID'],
        });
      }
      finalModelName = modelDoc.name;
    } else if (modelName) {
      // Check if model exists for this brand, if not create it
      let modelDoc = await db.collection('models').findOne({ 
        name: { $regex: new RegExp(`^${modelName}$`, 'i') },
        brandName: finalBrandName,
      });
      if (!modelDoc) {
        // Create new model on-the-fly
        const modelCode = modelName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        const newModel = {
          name: modelName.trim(),
          brandName: finalBrandName,
          code: modelCode,
          description: '',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };
        const modelResult = await db.collection('models').insertOne(newModel);
        modelDoc = await db.collection('models').findOne({ _id: modelResult.insertedId });
      }
      finalModelName = modelDoc.name;
    } else if (model) {
      // Legacy support: model as string
      finalModelName = model;
    }
    
    // Handle Type/Category: typeId > typeName > category (string)
    let finalCategoryName = '';
    if (typeId && isValidObjectId(typeId)) {
      const typeDoc = await db.collection('machineTypes').findOne({ _id: toObjectId(typeId) });
      if (!typeDoc) {
        return validationErrorResponse('Machine type not found', {
          typeId: ['Invalid type ID'],
        });
      }
      finalCategoryName = typeDoc.name;
    } else if (typeName) {
      // Check if type exists, if not create it
      let typeDoc = await db.collection('machineTypes').findOne({ 
        name: { $regex: new RegExp(`^${typeName}$`, 'i') } 
      });
      if (!typeDoc) {
        // Create new type on-the-fly
        const typeCode = typeName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        const newType = {
          name: typeName.trim(),
          code: typeCode,
          description: '',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };
        const typeResult = await db.collection('machineTypes').insertOne(newType);
        typeDoc = await db.collection('machineTypes').findOne({ _id: typeResult.insertedId });
      }
      finalCategoryName = typeDoc.name;
    } else if (category) {
      // Legacy support: category as string
      finalCategoryName = category;
    }
    
    const qrCodeValue = `MCH-${finalBrandName}-${serialNumber}`;
    
    const newMachine = {
      brand: finalBrandName,
      model: finalModelName,
      category: finalCategoryName,
      serialNumber,
      boxNumber: boxNumber || '',
      qrCode: {
        value: qrCodeValue,
        imageUrl: '', // Will be generated by QR service
      },
      photos: photos || [],
      specs: specs || {},
      status: 'AVAILABLE',
      statusHistory: [
        {
          status: 'AVAILABLE',
          changedAt: now,
          changedByUserId: null, // TODO: Get from auth context
          note: 'Initial registration',
        },
      ],
      currentLocation: currentLocation || {
        type: 'WAREHOUSE',
        name: 'Main Warehouse',
        address: '',
      },
      lifecycle: {
        onboardedAt: now,
        onboardedByUserId: null, // TODO: Get from auth context
        lastRentalId: null,
        totalRentalDays: 0,
      },
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.collection('machines').insertOne(newMachine);
    const createdMachine = await db.collection('machines').findOne({ _id: result.insertedId });
    
    return successResponse(sanitizeObject(createdMachine), 'Machine created successfully', 201);
  } catch (error: any) {
    console.error('Error creating machine:', error);
    return errorResponse('Failed to create machine', 500);
  }
});
