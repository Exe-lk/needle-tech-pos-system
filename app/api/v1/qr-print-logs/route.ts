import { NextRequest } from 'next/server';
import { successResponse, errorResponse, paginatedResponse, validationErrorResponse } from '@/lib/api-response';
import { parseQueryParams, buildPaginationMeta } from '@/lib/utils';
import { withAuthAndRole, AuthUser } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';

/**
 * @swagger
 * /api/v1/qr-print-logs:
 *   post:
 *     summary: Log QR code print
 *     description: Record a QR code print event for a machine with timestamp and print count
 *     tags: [QR Print Logs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - machineId
 *               - printCount
 *             properties:
 *               machineId:
 *                 type: string
 *                 format: uuid
 *               printCount:
 *                 type: integer
 *                 minimum: 1
 *                 default: 1
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: QR print log created successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Machine not found
 */
export const POST = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'USER'], async (request: NextRequest, auth: AuthUser) => {
  try {
    const body = await request.json();
    const { machineId, printCount = 1, notes } = body;

    // Validation
    const errors: Record<string, string[]> = {};

    if (!machineId) {
      errors.machineId = ['Machine ID is required'];
    }

    if (printCount && (typeof printCount !== 'number' || printCount < 1)) {
      errors.printCount = ['Print count must be a positive integer'];
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse('Validation failed', errors);
    }

    // Find machine
    const machine = await prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        brand: true,
        model: true,
      },
    });

    if (!machine) {
      return errorResponse('Machine not found', 404);
    }

    // Create QR print log
    const qrPrintLog = await prisma.qrPrintLog.create({
      data: {
        machineId: machine.id,
        printedByUserId: auth.id,
        serialNumber: machine.serialNumber,
        boxNumber: machine.boxNumber || null,
        qrCodeValue: machine.qrCodeValue,
        printCount: printCount || 1,
        notes: notes || null,
      },
      include: {
        machine: {
          include: {
            brand: true,
            model: true,
            type: true,
          },
        },
        printedBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return successResponse(
      {
        id: qrPrintLog.id,
        machineId: qrPrintLog.machineId,
        serialNumber: qrPrintLog.serialNumber,
        boxNumber: qrPrintLog.boxNumber,
        qrCodeValue: qrPrintLog.qrCodeValue,
        printCount: qrPrintLog.printCount,
        printedAt: qrPrintLog.printedAt,
        notes: qrPrintLog.notes,
        machine: {
          id: qrPrintLog.machine.id,
          serialNumber: qrPrintLog.machine.serialNumber,
          boxNumber: qrPrintLog.machine.boxNumber,
          brand: qrPrintLog.machine.brand?.name,
          model: qrPrintLog.machine.model?.name,
          type: qrPrintLog.machine.type?.name,
        },
        printedBy: {
          id: qrPrintLog.printedBy.id,
          username: qrPrintLog.printedBy.username,
          fullName: qrPrintLog.printedBy.fullName,
          email: qrPrintLog.printedBy.email,
        },
      },
      'QR print log created successfully',
      201
    );
  } catch (error: any) {
    console.error('Error creating QR print log:', error);
    
    if (error.code === 'P2003') {
      return validationErrorResponse('Invalid machine ID', {
        machineId: ['Machine not found'],
      });
    }
    
    return errorResponse('Failed to create QR print log: ' + error.message, 500);
  }
});

/**
 * @swagger
 * /api/v1/qr-print-logs:
 *   get:
 *     summary: Get QR print logs
 *     description: Retrieve paginated list of QR print logs with filtering and search
 *     tags: [QR Print Logs]
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
 *         name: machineId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: serialNumber
 *         schema:
 *           type: string
 *       - in: query
 *         name: printedByUserId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: QR print logs retrieved successfully
 */
export const GET = withAuthAndRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'], async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const { page, limit, sortBy, sortOrder, search } = parseQueryParams(searchParams);

    const machineId = searchParams.get('machineId');
    const serialNumber = searchParams.get('serialNumber');
    const printedByUserId = searchParams.get('printedByUserId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    // Search across multiple fields
    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { boxNumber: { contains: search, mode: 'insensitive' } },
        { qrCodeValue: { contains: search, mode: 'insensitive' } },
        { machine: { serialNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Filter by machine ID
    if (machineId) {
      where.machineId = machineId;
    }

    // Filter by serial number
    if (serialNumber) {
      where.serialNumber = { contains: serialNumber, mode: 'insensitive' };
    }

    // Filter by user who printed
    if (printedByUserId) {
      where.printedByUserId = printedByUserId;
    }

    // Filter by date range
    if (startDate || endDate) {
      where.printedAt = {};
      if (startDate) {
        where.printedAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.printedAt.lte = new Date(endDate);
      }
    }

    const totalItems = await prisma.qrPrintLog.count({ where });
    const skip = (page - 1) * limit;

    const sortOrder_ = sortOrder === 'asc' ? 'asc' : 'desc';
    const sortByField = sortBy || 'printedAt';

    const qrPrintLogs = await prisma.qrPrintLog.findMany({
      where,
      orderBy: {
        [sortByField]: sortOrder_,
      },
      skip,
      take: limit,
      include: {
        machine: {
          include: {
            brand: true,
            model: true,
            type: true,
          },
        },
        printedBy: {
          select: {
            id: true,
            username: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    const transformedLogs = qrPrintLogs.map((log) => ({
      id: log.id,
      machineId: log.machineId,
      serialNumber: log.serialNumber,
      boxNumber: log.boxNumber,
      qrCodeValue: log.qrCodeValue,
      printCount: log.printCount,
      printedAt: log.printedAt,
      notes: log.notes,
      createdAt: log.createdAt,
      machine: {
        id: log.machine.id,
        serialNumber: log.machine.serialNumber,
        boxNumber: log.machine.boxNumber,
        brand: log.machine.brand?.name,
        model: log.machine.model?.name,
        type: log.machine.type?.name,
      },
      printedBy: {
        id: log.printedBy.id,
        username: log.printedBy.username,
        fullName: log.printedBy.fullName,
        email: log.printedBy.email,
      },
    }));

    const pagination = buildPaginationMeta(totalItems, page, limit);

    return paginatedResponse(
      transformedLogs,
      pagination,
      'QR print logs retrieved successfully',
      { sortBy: sortByField, sortOrder: sortOrder_ },
      search || undefined,
      {
        ...(machineId && { machineId }),
        ...(serialNumber && { serialNumber }),
        ...(printedByUserId && { printedByUserId }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      }
    );
  } catch (error: any) {
    console.error('Error fetching QR print logs:', error);
    return errorResponse('Failed to retrieve QR print logs', 500);
  }
});
