import { NextRequest } from 'next/server';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuthAndRole } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

// Helper function to transform machine data for frontend
const transformMachineForFrontend = (machine: any) => {
  const barcode = machine.qrCodeValue || 
    `${machine.brand?.name || ''}-${machine.model?.name || ''}-${machine.serialNumber}`.replace(/\s+/g, '-').toUpperCase();
  
  const statusMap: Record<string, string> = {
    'AVAILABLE': 'Available',
    'RENTED': 'Rented',
    'MAINTENANCE': 'Maintenance',
    'RETIRED': 'Retired',
    'DAMAGED': 'Damaged',
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
    currentLocationType: machine.currentLocationType || '',
    currentLocationAddress: machine.currentLocationAddress || '',
    notes: machine.notes || '',
    qrCodeValue: machine.qrCodeValue || '',
    qrCodeImageUrl: machine.qrCodeImageUrl || '',
    voltage: machine.voltage || '',
    power: machine.power || '',
    stitchType: machine.stitchType || '',
    maxSpeedSpm: machine.maxSpeedSpm || null,
    specsOther: machine.specsOther || '',
    currentCustomer: machine.currentCustomer || null,
    unitPrice: machine.unitPrice != null ? Number(machine.unitPrice) : null,
    monthlyRentalFee: machine.monthlyRentalFee != null ? Number(machine.monthlyRentalFee) : null,
  };
};

/**
 * @swagger
 * /api/v1/machines/{id}:
 *   get:
 *     summary: Get machine by ID
 *     tags: [Machines]
 *     security:
 *       - bearerAuth: []
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const machine = await prisma.machine.findUnique({
      where: { id },
      include: { 
        brand: true, 
        model: true, 
        type: true,
        rentalMachines: {
          include: {
            rental: {
              include: {
                customer: true
              }
            }
          },
          where: {
            rental: {
              status: 'ACTIVE'
            }
          },
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
    
    if (!machine) {
      return notFoundResponse('Machine not found');
    }
    
    // Add current customer if machine is rented
    const transformedMachine = transformMachineForFrontend(machine);
    if (machine.status === 'RENTED' && machine.rentalMachines.length > 0) {
      transformedMachine.currentCustomer = machine.rentalMachines[0].rental.customer.name;
    }
    
    return successResponse(transformedMachine, 'Machine retrieved successfully');
  } catch (error: any) {
    console.error('Error fetching machine:', error);
    return errorResponse('Failed to retrieve machine', 500);
  }
});

/**
 * @swagger
 * /api/v1/machines/{id}:
 *   put:
 *     summary: Update machine
 *     tags: [Machines]
 *     security:
 *       - bearerAuth: []
 */
export const PUT = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const existingMachine = await prisma.machine.findUnique({ 
      where: { id },
      include: { brand: true, model: true, type: true }
    });
    
    if (!existingMachine) {
      return notFoundResponse('Machine not found');
    }
    
    // Prepare update data
    const updateData: any = {};
    
    // Handle brand update (by name or ID)
    if (body.brand || body.brandId) {
      if (body.brandId) {
        updateData.brandId = body.brandId;
      } else if (body.brand) {
        const brand = await prisma.brand.findFirst({
          where: { name: { equals: body.brand, mode: 'insensitive' } }
        });
        if (brand) {
          updateData.brandId = brand.id;
        } else {
          // Create new brand
          const newBrand = await prisma.brand.create({
            data: {
              name: body.brand,
              code: body.brand.toUpperCase().replace(/\s+/g, '_'),
              isActive: true
            }
          });
          updateData.brandId = newBrand.id;
        }
      }
    }
    
    // Handle model update (by name or ID)
    if (body.model || body.modelId) {
      if (body.modelId) {
        updateData.modelId = body.modelId;
      } else if (body.model) {
        const brandId = updateData.brandId || existingMachine.brandId;
        const model = await prisma.model.findFirst({
          where: { 
            name: { equals: body.model, mode: 'insensitive' },
            brandId
          }
        });
        if (model) {
          updateData.modelId = model.id;
        } else {
          // Create new model
          const newModel = await prisma.model.create({
            data: {
              name: body.model,
              brandId,
              code: body.model.toUpperCase().replace(/\s+/g, '_'),
              isActive: true
            }
          });
          updateData.modelId = newModel.id;
        }
      }
    }
    
    // Handle type update (by name or ID)
    if (body.type || body.machineTypeId) {
      if (body.machineTypeId) {
        updateData.typeId = body.machineTypeId;
      } else if (body.type) {
        const machineType = await prisma.machineType.findFirst({
          where: { name: { equals: body.type, mode: 'insensitive' } }
        });
        if (machineType) {
          updateData.typeId = machineType.id;
        } else {
          // Create new machine type
          const newType = await prisma.machineType.create({
            data: {
              name: body.type,
              code: body.type.toUpperCase().replace(/\s+/g, '_'),
              isActive: true
            }
          });
          updateData.typeId = newType.id;
        }
      }
    }
    
    // Handle status update
    if (body.status) {
      const statusMap: Record<string, string> = {
        'Available': 'AVAILABLE',
        'Rented': 'RENTED',
        'Maintenance': 'MAINTENANCE',
        'Retired': 'RETIRED',
        'Damaged': 'DAMAGED',
      };
      updateData.status = statusMap[body.status] || body.status.toUpperCase();
    }
    
    // Handle other fields
    if (body.serialNumber) updateData.serialNumber = body.serialNumber;
    if (body.boxNo !== undefined) updateData.boxNumber = body.boxNo;
    if (body.boxNumber !== undefined) updateData.boxNumber = body.boxNumber;
    if (body.manufactureYear !== undefined) updateData.manufactureYear = body.manufactureYear;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.conditionOnArrival !== undefined) updateData.conditionOnArrival = body.conditionOnArrival;
    if (body.warrantyStatus !== undefined) updateData.warrantyStatus = body.warrantyStatus;
    if (body.warrantyExpiryDate !== undefined) {
      updateData.warrantyExpiryDate = body.warrantyExpiryDate ? new Date(body.warrantyExpiryDate) : null;
    }
    if (body.purchaseDate !== undefined) {
      updateData.purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : null;
    }
    if (body.location !== undefined) updateData.currentLocationName = body.location;
    if (body.currentLocationName !== undefined) updateData.currentLocationName = body.currentLocationName;
    if (body.currentLocationType !== undefined) updateData.currentLocationType = body.currentLocationType;
    if (body.currentLocationAddress !== undefined) updateData.currentLocationAddress = body.currentLocationAddress;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.voltage !== undefined) updateData.voltage = body.voltage;
    if (body.specsOther !== undefined) updateData.specsOther = body.specsOther;
    if (body.power !== undefined) updateData.power = body.power;
    if (body.stitchType !== undefined) updateData.stitchType = body.stitchType;
    if (body.maxSpeedSpm !== undefined) updateData.maxSpeedSpm = body.maxSpeedSpm ? parseInt(body.maxSpeedSpm) : null;
    if (body.unitPrice !== undefined) updateData.unitPrice = body.unitPrice != null && body.unitPrice !== '' ? parseFloat(body.unitPrice) : null;
    if (body.monthlyRentalFee !== undefined) updateData.monthlyRentalFee = body.monthlyRentalFee != null && body.monthlyRentalFee !== '' ? parseFloat(body.monthlyRentalFee) : null;
    
    // Handle photos update
    if (body.referencePhoto || body.serialPlatePhoto) {
      const allPhotos: string[] = [...(existingMachine.photos || [])];
      if (body.referencePhoto && Array.isArray(body.referencePhoto)) {
        allPhotos.push(...body.referencePhoto);
      }
      if (body.serialPlatePhoto && Array.isArray(body.serialPlatePhoto)) {
        allPhotos.push(...body.serialPlatePhoto);
      }
      updateData.photos = allPhotos;
    } else if (body.photos !== undefined) {
      updateData.photos = body.photos;
    }
    
    // Update QR code if brand/model/serial changed
    if (updateData.brandId || updateData.modelId || updateData.serialNumber) {
      const updatedBrand = updateData.brandId ? 
        await prisma.brand.findUnique({ where: { id: updateData.brandId } }) : 
        existingMachine.brand;
      const updatedModel = updateData.modelId ? 
        await prisma.model.findUnique({ where: { id: updateData.modelId } }) : 
        existingMachine.model;
      const updatedSerial = updateData.serialNumber || existingMachine.serialNumber;
      
      updateData.qrCodeValue = `${updatedBrand?.name || ''}-${updatedModel?.name || ''}-${updatedSerial}`.replace(/\s+/g, '-').toUpperCase();
    }
    
    const updatedMachine = await prisma.machine.update({
      where: { id },
      data: updateData,
      include: { 
        brand: true, 
        model: true, 
        type: true 
      }
    });
    
    // Transform for frontend
    const transformedMachine = transformMachineForFrontend(updatedMachine);
    
    return successResponse(transformedMachine, 'Machine updated successfully');
  } catch (error: any) {
    console.error('Error updating machine:', error);
    
    // Handle Prisma errors
    if (error.code === 'P2002') {
      return validationErrorResponse('Duplicate entry', {
        [error.meta?.target?.[0] || 'field']: ['This value already exists'],
      });
    }
    
    if (error.code === 'P2003') {
      return validationErrorResponse('Invalid reference', {
        field: ['Referenced record does not exist'],
      });
    }
    
    return errorResponse('Failed to update machine: ' + error.message, 500);
  }
});

/**
 * @swagger
 * /api/v1/machines/{id}:
 *   delete:
 *     summary: Delete machine
 *     tags: [Machines]
 *     security:
 *       - bearerAuth: []
 */
export const DELETE = withAuthAndRole(['SUPER_ADMIN','ADMIN'], async (
  request: NextRequest,
  auth,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    const machine = await prisma.machine.findUnique({ 
      where: { id },
      include: {
        rentalMachines: true,
        gatePassMachines: true,
        returns: true,
        damageReports: true
      }
    });
    
    if (!machine) {
      return notFoundResponse('Machine not found');
    }
    
    // Check if machine has active rentals
    const activeRental = await prisma.rentalMachine.findFirst({
      where: {
        machineId: id,
        rental: {
          status: 'ACTIVE'
        }
      }
    });
    
    if (activeRental) {
      return validationErrorResponse('Cannot delete machine with active rentals', {
        machine: ['This machine has active rentals and cannot be deleted. Please complete or cancel the rentals first.'],
      });
    }
    
    // Soft delete by marking as RETIRED instead of hard delete if there's rental history
    if (machine.rentalMachines.length > 0 || machine.returns.length > 0) {
      const updatedMachine = await prisma.machine.update({
        where: { id },
        data: {
          status: 'RETIRED',
        },
        include: {
          brand: true,
          model: true,
          type: true
        }
      });
      
      const transformedMachine = transformMachineForFrontend(updatedMachine);
      
      return successResponse(
        transformedMachine, 
        'Machine has rental history and has been marked as RETIRED instead of deleted'
      );
    }
    
    // Hard delete if no history
    await prisma.machine.delete({ where: { id } });
    
    return successResponse({ id }, 'Machine deleted successfully');
  } catch (error: any) {
    console.error('Error deleting machine:', error);
    
    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
      return validationErrorResponse('Cannot delete machine', {
        machine: ['This machine is referenced by other records and cannot be deleted.'],
      });
    }
    
    return errorResponse('Failed to delete machine: ' + error.message, 500);
  }
});
