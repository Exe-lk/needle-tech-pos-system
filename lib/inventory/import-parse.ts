import * as XLSX from 'xlsx';
import { validateBoxNumber, validateSerialNumber } from '@/src/utils/validation';
import type { StockInLineInput } from '@/lib/inventory/stock-in';

function parseMoneyNumber(value: string): number | null {
  const normalized = value.trim().replace(/[\s,']/g, '');
  if (!normalized || !/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

export const IMPORT_MAX_ROWS = 2000;
export const IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;

export const MACHINE_IMPORT_HEADERS = [
  'serialNumber',
  'brand',
  'model',
  'type',
  'stockType',
  'unitPrice',
  'monthlyRentalFee',
  'location',
  'warrantyExpiry',
  'condition',
  'boxNumber',
  'notes',
  'purchaseDate',
  'manufactureYear',
  'country',
  'voltage',
  'power',
  'stitchType',
  'maxSpeedSpm',
] as const;

export type MachineImportHeader = (typeof MACHINE_IMPORT_HEADERS)[number];

const HEADER_ALIASES: Record<string, MachineImportHeader> = {
  serialnumber: 'serialNumber',
  serial: 'serialNumber',
  serialno: 'serialNumber',
  brand: 'brand',
  model: 'model',
  type: 'type',
  machinetype: 'type',
  stocktype: 'stockType',
  unitprice: 'unitPrice',
  price: 'unitPrice',
  monthlyrentalfee: 'monthlyRentalFee',
  rentalfee: 'monthlyRentalFee',
  location: 'location',
  storagelocation: 'location',
  warrantyexpiry: 'warrantyExpiry',
  warrantyexpirydate: 'warrantyExpiry',
  condition: 'condition',
  conditiononarrival: 'condition',
  boxnumber: 'boxNumber',
  boxno: 'boxNumber',
  notes: 'notes',
  purchasedate: 'purchaseDate',
  manufactureyear: 'manufactureYear',
  year: 'manufactureYear',
  country: 'country',
  voltage: 'voltage',
  power: 'power',
  stitchtype: 'stitchType',
  maxspeedspm: 'maxSpeedSpm',
  maxspeed: 'maxSpeedSpm',
};

const STOCK_TYPES = new Set(['new', 'used']);
const CONDITIONS = new Set(['excellent', 'good', 'fair', 'poor']);

const CONDITION_CANONICAL: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export type ParsedMachineRow = {
  row: number;
  serialNumber: string;
  brand: string;
  model: string;
  type: string;
  stockType: 'New' | 'Used';
  unitPrice: string;
  monthlyRentalFee: string;
  location: string;
  warrantyExpiry: Date | null;
  condition: string | null;
  boxNumber: string | null;
  notes: string | null;
  purchaseDate: Date | null;
  manufactureYear: string | null;
  country: string | null;
  voltage: string | null;
  power: string | null;
  stitchType: string | null;
  maxSpeedSpm: number | null;
};

export type ImportRowError = {
  row: number;
  serialNumber: string;
  message: string;
};

export type ImportParseResult = {
  validRows: ParsedMachineRow[];
  errors: ImportRowError[];
  totalDataRows: number;
};

function normalizeHeaderKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function cellToString(value: unknown): string {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).trim();
}

function parseDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    }
  }
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function optionalText(value: unknown): string | null {
  const text = cellToString(value);
  return text ? text : null;
}

function isRowEmpty(record: Record<string, unknown>): boolean {
  return Object.values(record).every((value) => cellToString(value) === '');
}

function mapHeaders(rawHeaders: unknown[]): Map<number, MachineImportHeader> {
  const map = new Map<number, MachineImportHeader>();
  rawHeaders.forEach((header, index) => {
    const alias = HEADER_ALIASES[normalizeHeaderKey(cellToString(header))];
    if (alias) {
      map.set(index, alias);
    }
  });
  return map;
}

export function parseMachineImportWorkbook(data: Uint8Array): ImportParseResult {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames.includes('Machines')
    ? 'Machines'
    : workbook.SheetNames[0];
  if (!sheetName) {
    return {
      validRows: [],
      errors: [{ row: 0, serialNumber: '', message: 'The file does not contain any sheets' }],
      totalDataRows: 0,
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(unknown | undefined)[]>(sheet, {
    header: 1,
    defval: '',
    raw: true,
  });

  if (rows.length < 2) {
    return {
      validRows: [],
      errors: [{ row: 1, serialNumber: '', message: 'File must include a header row and at least one machine row' }],
      totalDataRows: 0,
    };
  }

  const headerMap = mapHeaders(rows[0] || []);
  const requiredHeaders: MachineImportHeader[] = [
    'serialNumber',
    'brand',
    'model',
    'type',
    'stockType',
    'unitPrice',
    'monthlyRentalFee',
    'location',
  ];
  const missingHeaders = requiredHeaders.filter(
    (header) => ![...headerMap.values()].includes(header)
  );
  if (missingHeaders.length > 0) {
    return {
      validRows: [],
      errors: [
        {
          row: 1,
          serialNumber: '',
          message: `Missing required columns: ${missingHeaders.join(', ')}`,
        },
      ],
      totalDataRows: 0,
    };
  }

  const dataRows = rows.slice(1).map((cells, index) => {
    const record: Record<string, unknown> = {};
    headerMap.forEach((header, colIndex) => {
      record[header] = cells?.[colIndex];
    });
    return { row: index + 2, record };
  });

  const nonEmpty = dataRows.filter((item) => !isRowEmpty(item.record));
  if (nonEmpty.length > IMPORT_MAX_ROWS) {
    return {
      validRows: [],
      errors: [
        {
          row: 0,
          serialNumber: '',
          message: `File has ${nonEmpty.length} machine rows. Maximum allowed is ${IMPORT_MAX_ROWS}.`,
        },
      ],
      totalDataRows: nonEmpty.length,
    };
  }

  const validRows: ParsedMachineRow[] = [];
  const errors: ImportRowError[] = [];
  const seenSerials = new Set<string>();

  for (const { row, record } of nonEmpty) {
    const messages: string[] = [];
    const serialNumber = cellToString(record.serialNumber);
    const brand = cellToString(record.brand);
    const model = cellToString(record.model);
    const type = cellToString(record.type);
    const stockTypeRaw = cellToString(record.stockType);
    const unitPrice = cellToString(record.unitPrice);
    const monthlyRentalFee = cellToString(record.monthlyRentalFee);
    const location = cellToString(record.location);
    const conditionRaw = cellToString(record.condition);
    const boxNumber = optionalText(record.boxNumber);

    const serialError = validateSerialNumber(serialNumber);
    if (serialError) messages.push(serialError);

    if (serialNumber) {
      if (seenSerials.has(serialNumber)) {
        messages.push(`Duplicate serial number in file: ${serialNumber}`);
      } else {
        seenSerials.add(serialNumber);
      }
    }

    if (!brand) messages.push('Brand is required');
    if (!model) messages.push('Model is required');
    if (!type) messages.push('Type is required');
    if (!location) messages.push('Location is required');

    const stockTypeKey = stockTypeRaw.toLowerCase();
    if (!STOCK_TYPES.has(stockTypeKey)) {
      messages.push('Stock type must be New or Used');
    }

    const parsedUnitPrice = parseMoneyNumber(unitPrice);
    if (parsedUnitPrice == null) {
      messages.push('Unit price is required and must be a valid number');
    } else if (parsedUnitPrice < 0) {
      messages.push('Unit price must be 0 or greater');
    }

    const parsedRentalFee = parseMoneyNumber(monthlyRentalFee);
    if (parsedRentalFee == null) {
      messages.push('Monthly rental fee is required and must be a valid number');
    } else if (parsedRentalFee < 0) {
      messages.push('Monthly rental fee must be 0 or greater');
    }

    const warrantyExpiry = parseDate(record.warrantyExpiry);
    if (stockTypeKey === 'new' && !warrantyExpiry) {
      messages.push('Warranty expiry is required for New machines (YYYY-MM-DD)');
    } else if (record.warrantyExpiry != null && cellToString(record.warrantyExpiry) && !warrantyExpiry) {
      messages.push('Warranty expiry must be a valid date (YYYY-MM-DD)');
    }

    let condition: string | null = null;
    if (stockTypeKey === 'used') {
      if (!conditionRaw || !CONDITIONS.has(conditionRaw.toLowerCase())) {
        messages.push('Condition is required for Used machines (Excellent, Good, Fair, or Poor)');
      } else {
        condition = CONDITION_CANONICAL[conditionRaw.toLowerCase()];
      }
    } else if (conditionRaw) {
      if (!CONDITIONS.has(conditionRaw.toLowerCase())) {
        messages.push('Condition must be Excellent, Good, Fair, or Poor');
      } else {
        condition = CONDITION_CANONICAL[conditionRaw.toLowerCase()];
      }
    }

    if (boxNumber) {
      const boxError = validateBoxNumber(boxNumber);
      if (boxError) messages.push(boxError);
    }

    const purchaseDate = parseDate(record.purchaseDate);
    if (record.purchaseDate != null && cellToString(record.purchaseDate) && !purchaseDate) {
      messages.push('Purchase date must be a valid date (YYYY-MM-DD)');
    }

    let maxSpeedSpm: number | null = null;
    const maxSpeedRaw = cellToString(record.maxSpeedSpm);
    if (maxSpeedRaw) {
      const parsedSpeed = Number(maxSpeedRaw);
      if (!Number.isInteger(parsedSpeed) || parsedSpeed < 0) {
        messages.push('Max speed (SPM) must be a whole number 0 or greater');
      } else {
        maxSpeedSpm = parsedSpeed;
      }
    }

    if (messages.length > 0) {
      errors.push({
        row,
        serialNumber,
        message: messages.join('; '),
      });
      continue;
    }

    validRows.push({
      row,
      serialNumber,
      brand,
      model,
      type,
      stockType: stockTypeKey === 'used' ? 'Used' : 'New',
      unitPrice,
      monthlyRentalFee,
      location,
      warrantyExpiry,
      condition,
      boxNumber,
      notes: optionalText(record.notes),
      purchaseDate,
      manufactureYear: optionalText(record.manufactureYear),
      country: optionalText(record.country),
      voltage: optionalText(record.voltage),
      power: optionalText(record.power),
      stitchType: optionalText(record.stitchType),
      maxSpeedSpm,
    });
  }

  return {
    validRows,
    errors,
    totalDataRows: nonEmpty.length,
  };
}

export function groupValidRowsIntoStockInLines(rows: ParsedMachineRow[]): StockInLineInput[] {
  const groups = new Map<string, ParsedMachineRow[]>();

  for (const row of rows) {
    const key = [
      row.brand.toLowerCase(),
      row.model.toLowerCase(),
      row.type.toLowerCase(),
      row.location,
      row.stockType.toLowerCase(),
    ].join('|||');
    const list = groups.get(key);
    if (list) {
      list.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  const lines: StockInLineInput[] = [];
  for (const groupRows of groups.values()) {
    const first = groupRows[0];
    if (!first) continue;
    lines.push({
      brand: first.brand,
      model: first.model,
      type: first.type,
      stockType: first.stockType,
      quantity: groupRows.length,
      unitPrice: first.unitPrice,
      monthlyRentalFee: first.monthlyRentalFee,
      warrantyExpiry: first.warrantyExpiry,
      condition: first.condition,
      location: first.location,
      notes: 'Bulk import',
      transactionDate: new Date(),
      machines: groupRows.map((row) => ({
        serialNumber: row.serialNumber,
        boxNo: row.boxNumber,
        notes: row.notes,
        purchaseDate: row.purchaseDate,
        manufactureYear: row.manufactureYear,
        country: row.country,
        voltage: row.voltage,
        power: row.power,
        stitchType: row.stitchType,
        maxSpeedSpm: row.maxSpeedSpm,
        unitPrice: row.unitPrice,
        monthlyRentalFee: row.monthlyRentalFee,
        warrantyExpiry: row.warrantyExpiry,
        condition: row.condition,
      })),
    });
  }

  return lines;
}

const SAMPLE_ROWS: Array<Record<MachineImportHeader, string | number>> = [
  {
    serialNumber: 'SN-SAMPLE-001',
    brand: 'Brother',
    model: 'S-7200C',
    type: 'Industrial',
    stockType: 'New',
    unitPrice: 125000,
    monthlyRentalFee: 8500,
    location: 'Main Warehouse',
    warrantyExpiry: '2027-12-31',
    condition: '',
    boxNumber: 'BOX-001',
    notes: 'Sample new machine — delete this row before import',
    purchaseDate: '2026-10-20',
    manufactureYear: '2024',
    country: 'Japan',
    voltage: '220V',
    power: '550W',
    stitchType: 'Lockstitch',
    maxSpeedSpm: 5000,
  },
  {
    serialNumber: 'SN-SAMPLE-002',
    brand: 'Juki',
    model: 'DDL-8700',
    type: 'Industrial',
    stockType: 'Used',
    unitPrice: 80000,
    monthlyRentalFee: 6000,
    location: 'Main Warehouse',
    warrantyExpiry: '',
    condition: 'Good',
    boxNumber: 'BOX-002',
    notes: 'Sample used machine — delete this row before import',
    purchaseDate: '2026-10-20',
    manufactureYear: '2020',
    country: 'Japan',
    voltage: '220V',
    power: '550W',
    stitchType: 'Lockstitch',
    maxSpeedSpm: 4500,
  },
];

const INSTRUCTION_ROWS: (string | number)[][] = [
  ['Field', 'Required', 'Description'],
  ['serialNumber', 'Yes', 'Unique per machine. 3-50 characters. Letters, numbers, spaces, hyphens, underscores.'],
  ['brand', 'Yes', 'Brand name. Matched case-insensitively; created if it does not exist.'],
  ['model', 'Yes', 'Model name for that brand. Created if it does not exist.'],
  ['type', 'Yes', 'Machine type name, e.g. Industrial, Domestic, Overlock.'],
  ['stockType', 'Yes', 'New or Used.'],
  ['unitPrice', 'Yes', 'Purchase / unit price. Number, 0 or greater.'],
  ['monthlyRentalFee', 'Yes', 'Monthly rental fee. Number, 0 or greater.'],
  ['location', 'Yes', 'Storage location. Examples: Main Warehouse, Branch Office 1, Branch Office 2, Storage Facility.'],
  ['warrantyExpiry', 'If New', 'Required when stockType is New. Use YYYY-MM-DD.'],
  ['condition', 'If Used', 'Required when stockType is Used: Excellent, Good, Fair, or Poor.'],
  ['boxNumber', 'No', 'Optional. Same character rules as serial number if provided.'],
  ['notes', 'No', 'Optional notes for this machine.'],
  ['purchaseDate', 'No', 'Optional. YYYY-MM-DD.'],
  ['manufactureYear', 'No', 'Optional, e.g. 2024.'],
  ['country', 'No', 'Optional country of origin.'],
  ['voltage', 'No', 'Optional, e.g. 220V.'],
  ['power', 'No', 'Optional, e.g. 550W.'],
  ['stitchType', 'No', 'Optional, e.g. Lockstitch.'],
  ['maxSpeedSpm', 'No', 'Optional whole number (stitches per minute).'],
  ['', '', ''],
  ['Rules', '', ''],
  ['One row = one physical machine. Do not import the sample rows.', '', ''],
  ['Serial numbers must be unique in this file and not already in inventory.', '', ''],
  ['Maximum 2000 machines per import.', '', ''],
  ['Existing machines are never updated; duplicate serials are skipped.', '', ''],
];

export function buildMachineImportTemplate(format: 'csv' | 'xlsx'): Buffer {
  const headerRow = [...MACHINE_IMPORT_HEADERS];
  const machineRows: (string | number)[][] = [
    headerRow,
    ...SAMPLE_ROWS.map((row) => headerRow.map((header) => row[header])),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(machineRows), 'Machines');

  if (format === 'xlsx') {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(INSTRUCTION_ROWS), 'Instructions');
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }

  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'csv' }));
}

export function buildImportErrorCsv(errors: ImportRowError[]): Buffer {
  const rows: (string | number)[][] = [
    ['row', 'serialNumber', 'message'],
    ...errors.map((error) => [error.row, error.serialNumber, error.message]),
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Errors');
  return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'csv' }));
}
