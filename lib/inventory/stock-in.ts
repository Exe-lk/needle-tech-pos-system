import type { Brand, MachineType, Model, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { toPrismaDecimalMoneyInput } from '@/lib/decimal-money';

const MACHINE_CHUNK_SIZE = 200;

export type StockInMachineUnitInput = {
  serialNumber: string;
  boxNo?: string | null;
  barcode?: string | null;
  qrCodeData?: string | null;
  notes?: string | null;
  purchaseDate?: string | Date | null;
  manufactureYear?: string | null;
  country?: string | null;
  voltage?: string | null;
  power?: string | null;
  stitchType?: string | null;
  maxSpeedSpm?: number | null;
  unitPrice?: unknown;
  monthlyRentalFee?: unknown;
  warrantyExpiry?: string | Date | null;
  condition?: string | null;
};

export type StockInLineInput = {
  brand: string;
  model: string;
  type: string;
  stockType?: string | null;
  quantity: number;
  unitPrice?: unknown;
  monthlyRentalFee?: unknown;
  warrantyExpiry?: string | Date | null;
  condition?: string | null;
  location: string;
  notes?: string | null;
  transactionDate?: string | Date | null;
  performedBy?: string | null;
  machines: StockInMachineUnitInput[];
};

export type PerformStockInOptions = {
  onboardedByUserId?: string | null;
  performedByFallback: string;
  skipDuplicates?: boolean;
  timeoutMs?: number;
};

export type SkippedSerial = {
  serialNumber: string;
  reason: string;
};

export type PerformStockInResult = {
  transactionIds: string[];
  totalUnits: number;
  skippedSerials: SkippedSerial[];
  createdCatalog: {
    brands: string[];
    models: string[];
    types: string[];
  };
};

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function catalogCodeFromName(name: string): string {
  const code = name.trim().toUpperCase().replace(/\s+/g, '_');
  return code || 'ITEM';
}

export function generateMachineQrCodeValue(
  brandName: string,
  modelName: string,
  serialNumber: string
): string {
  return `${brandName}-${modelName}-${serialNumber}`.replace(/\s+/g, '-').toUpperCase();
}

async function uniqueBrandCode(
  tx: Prisma.TransactionClient,
  baseCode: string,
  usedCodes: Set<string>
): Promise<string> {
  let code = baseCode;
  let suffix = 2;
  while (usedCodes.has(code.toLowerCase()) || (await tx.brand.findUnique({ where: { code } }))) {
    code = `${baseCode}_${suffix}`;
    suffix += 1;
  }
  usedCodes.add(code.toLowerCase());
  return code;
}

async function uniqueMachineTypeCode(
  tx: Prisma.TransactionClient,
  baseCode: string,
  usedCodes: Set<string>
): Promise<string> {
  let code = baseCode;
  let suffix = 2;
  while (
    usedCodes.has(code.toLowerCase()) ||
    (await tx.machineType.findUnique({ where: { code } }))
  ) {
    code = `${baseCode}_${suffix}`;
    suffix += 1;
  }
  usedCodes.add(code.toLowerCase());
  return code;
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

/**
 * Records stock-in: creates machine units, bincard STOCK_IN rows, and transaction logs.
 * Manual stock-in and bulk import share this writer so inventory, bincard, and logs stay in sync.
 */
export async function performStockIn(
  lines: StockInLineInput[],
  options: PerformStockInOptions
): Promise<PerformStockInResult> {
  const skipDuplicates = options.skipDuplicates === true;
  const skippedSerials: SkippedSerial[] = [];
  const createdCatalog = {
    brands: [] as string[],
    models: [] as string[],
    types: [] as string[],
  };

  const preparedLines = lines.map((line) => ({
    ...line,
    brand: String(line.brand || '').trim(),
    model: String(line.model || '').trim(),
    type: String(line.type || '').trim(),
    location: String(line.location || '').trim(),
    stockType: line.stockType ? String(line.stockType).trim() : null,
    machines: (line.machines || []).map((unit) => ({
      ...unit,
      serialNumber: String(unit.serialNumber || '').trim(),
    })),
  }));

  for (const line of preparedLines) {
    for (const unit of line.machines) {
      if (!unit.serialNumber) {
        if (skipDuplicates) {
          skippedSerials.push({ serialNumber: '', reason: 'Serial number is required for all machine units' });
        } else {
          throw new Error('Serial number is required for all machine units');
        }
      }
    }
    if (skipDuplicates) {
      line.machines = line.machines.filter((unit) => unit.serialNumber);
    }
  }

  const timeout = options.timeoutMs ?? 15_000;

  return prisma.$transaction(
    async (tx) => {
      const brandCache = new Map<string, Brand>();
      const modelCache = new Map<string, Model>();
      const typeCache = new Map<string, MachineType>();
      const usedBrandCodes = new Set<string>();
      const usedTypeCodes = new Set<string>();

      const getOrCreateBrand = async (name: string): Promise<Brand> => {
        const key = name.toLowerCase();
        const cached = brandCache.get(key);
        if (cached) return cached;

        let brand = await tx.brand.findFirst({
          where: { name: { equals: name, mode: 'insensitive' } },
        });
        if (!brand) {
          const code = await uniqueBrandCode(tx, catalogCodeFromName(name), usedBrandCodes);
          brand = await tx.brand.create({
            data: {
              name,
              code,
              isActive: true,
            },
          });
          createdCatalog.brands.push(brand.name);
        } else {
          usedBrandCodes.add(brand.code.toLowerCase());
        }
        brandCache.set(key, brand);
        return brand;
      };

      const getOrCreateModel = async (name: string, brand: Brand): Promise<Model> => {
        const key = `${brand.id}::${name.toLowerCase()}`;
        const cached = modelCache.get(key);
        if (cached) return cached;

        let model = await tx.model.findFirst({
          where: {
            brandId: brand.id,
            name: { equals: name, mode: 'insensitive' },
          },
        });
        if (!model) {
          model = await tx.model.create({
            data: {
              name,
              brandId: brand.id,
              code: catalogCodeFromName(name),
              isActive: true,
            },
          });
          createdCatalog.models.push(`${brand.name} / ${model.name}`);
        }
        modelCache.set(key, model);
        return model;
      };

      const getOrCreateType = async (name: string): Promise<MachineType> => {
        const key = name.toLowerCase();
        const cached = typeCache.get(key);
        if (cached) return cached;

        let machineType = await tx.machineType.findFirst({
          where: { name: { equals: name, mode: 'insensitive' } },
        });
        if (!machineType) {
          const code = await uniqueMachineTypeCode(tx, catalogCodeFromName(name), usedTypeCodes);
          machineType = await tx.machineType.create({
            data: {
              name,
              code,
              isActive: true,
            },
          });
          createdCatalog.types.push(machineType.name);
        } else {
          usedTypeCodes.add(machineType.code.toLowerCase());
        }
        typeCache.set(key, machineType);
        return machineType;
      };

      type ResolvedLine = {
        line: (typeof preparedLines)[number];
        brand: Brand;
        model: Model;
        machineType: MachineType;
        transactionDate: Date;
        performedByUser: string;
        units: Array<{
          unit: StockInMachineUnitInput;
          qrCodeValue: string;
        }>;
      };

      const candidateSerials = preparedLines.flatMap((line) =>
        line.machines.map((unit) => unit.serialNumber)
      );
      const existingBySerial =
        candidateSerials.length > 0
          ? await tx.machine.findMany({
              where: { serialNumber: { in: candidateSerials } },
              select: { serialNumber: true },
            })
          : [];
      const existingSerials = new Set(existingBySerial.map((machine) => machine.serialNumber));

      const resolved: ResolvedLine[] = [];
      const seenSerials = new Set<string>();
      const seenQrValues = new Set<string>();

      for (const line of preparedLines) {
        const serialFiltered: StockInMachineUnitInput[] = [];
        for (const unit of line.machines) {
          if (seenSerials.has(unit.serialNumber) || existingSerials.has(unit.serialNumber)) {
            const reason = `Machine with serial number ${unit.serialNumber} already exists`;
            if (skipDuplicates) {
              skippedSerials.push({ serialNumber: unit.serialNumber, reason });
              continue;
            }
            throw new Error(reason);
          }
          seenSerials.add(unit.serialNumber);
          serialFiltered.push(unit);
        }
        if (serialFiltered.length === 0) continue;

        const brand = await getOrCreateBrand(line.brand);
        const model = await getOrCreateModel(line.model, brand);
        const machineType = await getOrCreateType(line.type);
        const transactionDate = toDate(line.transactionDate) ?? new Date();
        const performedByUser = line.performedBy || options.performedByFallback;
        const units: ResolvedLine['units'] = [];

        for (const unit of serialFiltered) {
          const qrCodeValue =
            unit.qrCodeData ||
            unit.barcode ||
            generateMachineQrCodeValue(brand.name, model.name, unit.serialNumber);

          if (seenQrValues.has(qrCodeValue)) {
            const reason = `Machine with QR code ${qrCodeValue} already exists`;
            if (skipDuplicates) {
              skippedSerials.push({ serialNumber: unit.serialNumber, reason });
              continue;
            }
            throw new Error(reason);
          }

          seenQrValues.add(qrCodeValue);
          units.push({ unit, qrCodeValue });
        }

        if (units.length === 0) continue;

        resolved.push({
          line,
          brand,
          model,
          machineType,
          transactionDate,
          performedByUser,
          units,
        });
      }

      const allQrValues = resolved.flatMap((item) => item.units.map((u) => u.qrCodeValue));
      const existingByQr =
        allQrValues.length > 0
          ? await tx.machine.findMany({
              where: { qrCodeValue: { in: allQrValues } },
              select: { qrCodeValue: true },
            })
          : [];
      const existingQrValues = new Set(existingByQr.map((machine) => machine.qrCodeValue));

      const machineRows: Prisma.MachineCreateManyInput[] = [];
      const allTransactionIds: string[] = [];
      let allTotalUnits = 0;

      for (const item of resolved) {
        const kept: ResolvedLine['units'] = [];
        for (const unitWrap of item.units) {
          const { unit, qrCodeValue } = unitWrap;
          if (existingSerials.has(unit.serialNumber)) {
            const reason = `Machine with serial number ${unit.serialNumber} already exists`;
            if (skipDuplicates) {
              skippedSerials.push({ serialNumber: unit.serialNumber, reason });
              continue;
            }
            throw new Error(reason);
          }
          if (existingQrValues.has(qrCodeValue)) {
            const reason = `Machine with QR code ${qrCodeValue} already exists`;
            if (skipDuplicates) {
              skippedSerials.push({ serialNumber: unit.serialNumber, reason });
              continue;
            }
            throw new Error(reason);
          }
          kept.push(unitWrap);
        }
        item.units = kept;

        const lineUnitPrice = toPrismaDecimalMoneyInput(item.line.unitPrice);
        const lineRentalFee = toPrismaDecimalMoneyInput(item.line.monthlyRentalFee);
        const lineWarranty = toDate(item.line.warrantyExpiry);
        const linePurchaseDate = item.transactionDate;

        for (const { unit, qrCodeValue } of item.units) {
          const warrantyExpiryDate = toDate(unit.warrantyExpiry) ?? lineWarranty;
          const purchaseDate = toDate(unit.purchaseDate) ?? linePurchaseDate;
          const unitPrice = toPrismaDecimalMoneyInput(unit.unitPrice) ?? lineUnitPrice ?? null;
          const monthlyRentalFee =
            toPrismaDecimalMoneyInput(unit.monthlyRentalFee) ?? lineRentalFee ?? null;
          const condition = unit.condition || item.line.condition || item.line.stockType || null;
          const notes = unit.notes || item.line.notes || null;

          machineRows.push({
            brandId: item.brand.id,
            modelId: item.model.id,
            typeId: item.machineType.id,
            serialNumber: unit.serialNumber,
            boxNumber: unit.boxNo || null,
            qrCodeValue,
            status: 'AVAILABLE',
            currentLocationType: 'WAREHOUSE',
            currentLocationName: item.line.location,
            conditionOnArrival: condition,
            warrantyStatus: warrantyExpiryDate ? 'ACTIVE' : null,
            warrantyExpiryDate,
            purchaseDate,
            notes,
            onboardedByUserId: options.onboardedByUserId ?? null,
            unitPrice,
            monthlyRentalFee,
            manufactureYear: unit.manufactureYear || null,
            country: unit.country || null,
            voltage: unit.voltage || null,
            power: unit.power || null,
            stitchType: unit.stitchType || null,
            maxSpeedSpm: unit.maxSpeedSpm ?? null,
            photos: [],
            statusHistory: [],
          });
        }
      }

      for (const batch of chunk(machineRows, MACHINE_CHUNK_SIZE)) {
        if (batch.length === 0) continue;
        await tx.machine.createMany({ data: batch });
      }

      for (const item of resolved) {
        const quantity = item.units.length;
        if (quantity === 0) continue;

        const previousEntry = await tx.bincardEntry.findFirst({
          where: {
            brand: item.brand.name,
            model: item.model.name,
          },
          orderBy: { date: 'desc' },
        });
        const previousBalance = previousEntry?.balance ?? 0;
        const warrantyExpiryDate =
          toDate(item.units[0]?.unit.warrantyExpiry) ?? toDate(item.line.warrantyExpiry);
        const condition =
          item.units[0]?.unit.condition || item.line.condition || null;
        const notes = item.line.notes || item.units[0]?.unit.notes || null;

        const bincardEntry = await tx.bincardEntry.create({
          data: {
            date: item.transactionDate,
            transactionType: 'STOCK_IN',
            brand: item.brand.name,
            model: item.model.name,
            machineType: item.machineType.name,
            reference: `STOCK-IN-${Date.now()}`,
            quantityIn: quantity,
            quantityOut: 0,
            balance: previousBalance + quantity,
            location: item.line.location,
            stockType: item.line.stockType || null,
            warrantyExpiry: warrantyExpiryDate,
            condition,
            performedBy: item.performedByUser,
            notes,
          },
        });

        allTransactionIds.push(bincardEntry.id);

        await tx.transactionLog.create({
          data: {
            transactionDate: item.transactionDate,
            category: 'INVENTORY',
            transactionType: 'STOCK_IN',
            reference: bincardEntry.id,
            description: `Stock in: ${quantity} unit(s) of ${item.brand.name} ${item.model.name}${
              item.line.stockType ? ` (${item.line.stockType})` : ''
            }`,
            brand: item.brand.name,
            model: item.model.name,
            quantity,
            location: item.line.location,
            performedBy: item.performedByUser,
            status: 'SUCCESS',
            notes: notes || (item.line.stockType ? `Stock Type: ${item.line.stockType}` : null),
          },
        });

        allTotalUnits += quantity;
      }

      return {
        transactionIds: allTransactionIds,
        totalUnits: allTotalUnits,
        skippedSerials,
        createdCatalog,
      };
    },
    { timeout, maxWait: 15_000 }
  );
}
