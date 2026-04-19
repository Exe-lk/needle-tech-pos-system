import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** ESM has no `__dirname`; seed runs as `ts-node --esm` so resolve from this file. */
const seedFileDir = path.dirname(fileURLToPath(import.meta.url))
import { Prisma, PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

// Initialize Prisma with pg adapter (required for Prisma 7 with PostgreSQL in ESM mode)
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

/** Legacy `users.id` values from exports (`public/csv/users_rows.csv`) → remap to current Supabase-linked ids. */
const LEGACY_USER_ID_BY_EMAIL: Record<string, string> = {
  'admin@needletech.com': 'a7283837-99b7-42b0-b44d-8bac0e62b5bd',
  'stock@gmail.com': '3c492f46-29ea-4dc0-ac61-6a98ba460078',
  'security@gmail.com': '4539e7b6-4cfd-46cf-81ba-ae60c8c8633b',
  'operation@gmail.com': '7de87774-508a-460b-9fd2-2138c0286c8f'
}

function csvDir() {
  return path.join(seedFileDir, '..', 'public', 'csv')
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < content.length; i++) {
    const c = content[i]
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          field += '"'
          i++
          continue
        }
        inQuotes = false
        continue
      }
      field += c
      continue
    }
    if (c === '"') {
      inQuotes = true
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      continue
    }
    if (c === '\n' || (c === '\r' && content[i + 1] === '\n')) {
      row.push(field)
      if (row.some(cell => cell !== '')) rows.push(row)
      row = []
      field = ''
      if (c === '\r') i++
      continue
    }
    if (c === '\r') {
      row.push(field)
      if (row.some(cell => cell !== '')) rows.push(row)
      row = []
      field = ''
      continue
    }
    field += c
  }
  row.push(field)
  if (row.some(cell => cell !== '')) rows.push(row)
  return rows
}

function parseCsvFile(name: string): Record<string, string>[] {
  const full = path.join(csvDir(), name)
  if (!fs.existsSync(full)) {
    console.warn(`⚠️  Missing CSV (skipped): ${name}`)
    return []
  }
  const table = parseCsv(fs.readFileSync(full, 'utf8'))
  if (table.length < 2) return []
  const headers = table[0]
  return table.slice(1).map(cells => {
    const o: Record<string, string> = {}
    headers.forEach((h, idx) => {
      o[h] = cells[idx] ?? ''
    })
    return o
  })
}

/**
 * Postgres exports often use a short UTC offset (`...+00`) without minutes.
 * `new Date(...)` in JavaScript rejects that form; it expects `...+00:00` or `Z`.
 */
function normalizePgTimestamp(raw: string): string {
  let s = raw.trim()
  if (!s) return s
  if (!s.includes('T')) {
    s = s.replace(' ', 'T')
  }
  // Only matches `...+00` / `...-00`; does not match `...+00:00` (offset already has minutes).
  return s.replace(/([+-])(\d{2})$/, (_, sign: string, hh: string) => `${sign}${hh}:00`)
}

function pgDate(s: string): Date {
  const d = new Date(normalizePgTimestamp(s))
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Seed: unparseable date: "${s}"`)
  }
  return d
}

function optPgDate(s: string): Date | null {
  const v = s?.trim()
  if (!v) return null
  const d = new Date(normalizePgTimestamp(v))
  if (Number.isNaN(d.getTime())) return null
  return d
}

function dec(s: string, fallback = '0'): string {
  const v = s?.trim()
  return v || fallback
}

function optDec(s: string): string | undefined {
  const v = s?.trim()
  return v || undefined
}

function bool(s: string): boolean {
  return (s ?? '').trim().toLowerCase() === 'true'
}

function parseJson<T>(s: string, fallback: T): T {
  const v = s?.trim()
  if (!v) return fallback
  try {
    return JSON.parse(v) as T
  } catch {
    return fallback
  }
}

/** CSV `machines` / `lineItems` style JSON arrays → Prisma `Json[]`. */
function jsonArr(s: string): Prisma.InputJsonValue[] {
  const v = s?.trim()
  if (!v) return []
  try {
    const p = JSON.parse(v)
    return Array.isArray(p) ? (p as Prisma.InputJsonValue[]) : []
  } catch {
    return []
  }
}

async function buildLegacyUserIdRemap(): Promise<Map<string, string>> {
  const m = new Map<string, string>()
  for (const [email, legacyId] of Object.entries(LEGACY_USER_ID_BY_EMAIL)) {
    const u = await prisma.user.findUnique({ where: { email } })
    if (u) m.set(legacyId, u.id)
  }
  return m
}

function remapUserId(remap: Map<string, string>, raw: string): string | null {
  const v = raw?.trim()
  if (!v) return null
  return remap.get(v) ?? null
}

function requireUserId(remap: Map<string, string>, raw: string, ctx: string): string {
  const v = remapUserId(remap, raw)
  if (!v) throw new Error(`Seed: no DB user for ${ctx} (legacy id ${raw}). Check users seed + LEGACY_USER_ID_BY_EMAIL.`)
  return v
}

async function seedDomainFromPublicCsv(userRemap: Map<string, string>) {
  // --- settings_rows.csv ---
  for (const r of parseCsvFile('settings_rows.csv')) {
    const id = r.id?.trim() || 'global'
    const alertDays = parseJson<number[]>(r.alertDaysOfMonth, [])
    const alertCh = parseJson<string[]>(r.alertChannels, [])
    const customerTypeTaxRules: Prisma.InputJsonValue | typeof Prisma.DbNull =
      r.customerTypeTaxRules?.trim()
        ? (JSON.parse(r.customerTypeTaxRules) as Prisma.InputJsonValue)
        : Prisma.DbNull

    await prisma.settings.upsert({
      where: { id },
      create: {
        id,
        companyName: r.companyName || null,
        companyAddress: r.companyAddress || null,
        vatRegistrationNumber: r.vatRegistrationNumber || null,
        currency: dec(r.currency, 'USD'),
        defaultCountry: r.defaultCountry || null,
        defaultVatRate: new Prisma.Decimal(dec(r.defaultVatRate, '0')),
        customerTypeTaxRules,
        enableCreditLock: bool(r.enableCreditLock),
        lockAfterDaysOverdue: parseInt(dec(r.lockAfterDaysOverdue, '30'), 10),
        maxOutstandingForNewRentals: new Prisma.Decimal(dec(r.maxOutstandingForNewRentals, '0')),
        alertDaysOfMonth: alertDays,
        alertChannels: alertCh,
        invoicePrefix: dec(r.invoicePrefix, 'INV'),
        invoiceStartNumber: parseInt(dec(r.invoiceStartNumber, '1000'), 10),
        agreementPrefix: dec(r.agreementPrefix, 'RNT'),
        agreementStartNumber: parseInt(dec(r.agreementStartNumber, '1000'), 10),
        gatePassPrefix: dec(r.gatePassPrefix, 'GP'),
        gatePassStartNumber: parseInt(dec(r.gatePassStartNumber, '1000'), 10),
        returnPrefix: dec(r.returnPrefix, 'RET'),
        returnStartNumber: parseInt(dec(r.returnStartNumber, '1000'), 10)
      },
      update: {
        companyName: r.companyName || null,
        companyAddress: r.companyAddress || null,
        vatRegistrationNumber: r.vatRegistrationNumber || null,
        currency: dec(r.currency, 'USD'),
        defaultCountry: r.defaultCountry || null,
        defaultVatRate: new Prisma.Decimal(dec(r.defaultVatRate, '0')),
        customerTypeTaxRules,
        enableCreditLock: bool(r.enableCreditLock),
        lockAfterDaysOverdue: parseInt(dec(r.lockAfterDaysOverdue, '30'), 10),
        maxOutstandingForNewRentals: new Prisma.Decimal(dec(r.maxOutstandingForNewRentals, '0')),
        alertDaysOfMonth: alertDays,
        alertChannels: alertCh,
        invoicePrefix: dec(r.invoicePrefix, 'INV'),
        invoiceStartNumber: parseInt(dec(r.invoiceStartNumber, '1000'), 10),
        agreementPrefix: dec(r.agreementPrefix, 'RNT'),
        agreementStartNumber: parseInt(dec(r.agreementStartNumber, '1000'), 10),
        gatePassPrefix: dec(r.gatePassPrefix, 'GP'),
        gatePassStartNumber: parseInt(dec(r.gatePassStartNumber, '1000'), 10),
        returnPrefix: dec(r.returnPrefix, 'RET'),
        returnStartNumber: parseInt(dec(r.returnStartNumber, '1000'), 10)
      }
    })
  }
  console.log('✅ Settings (CSV)')

  // --- brands_rows.csv ---
  for (const r of parseCsvFile('brands_rows.csv')) {
    await prisma.brand.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        name: r.name,
        code: r.code,
        description: r.description || null,
        isActive: r.isActive?.trim() === '' ? true : bool(r.isActive)
      },
      update: {
        name: r.name,
        code: r.code,
        description: r.description || null,
        isActive: r.isActive?.trim() === '' ? true : bool(r.isActive)
      }
    })
  }
  console.log(`✅ Brands (CSV): ${parseCsvFile('brands_rows.csv').length}`)

  // --- machine_types_rows.csv ---
  for (const r of parseCsvFile('machine_types_rows.csv')) {
    await prisma.machineType.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        name: r.name,
        code: r.code,
        description: r.description || null,
        isActive: r.isActive?.trim() === '' ? true : bool(r.isActive)
      },
      update: {
        name: r.name,
        code: r.code,
        description: r.description || null,
        isActive: r.isActive?.trim() === '' ? true : bool(r.isActive)
      }
    })
  }
  console.log(`✅ Machine types (CSV): ${parseCsvFile('machine_types_rows.csv').length}`)

  // --- models_rows.csv ---
  for (const r of parseCsvFile('models_rows.csv')) {
    await prisma.model.upsert({
      where: { name_brandId: { name: r.name, brandId: r.brandId } },
      create: {
        id: r.id,
        name: r.name,
        brandId: r.brandId,
        code: r.code || null,
        description: r.description || null,
        isActive: r.isActive?.trim() === '' ? true : bool(r.isActive)
      },
      update: {
        code: r.code || null,
        description: r.description || null,
        isActive: r.isActive?.trim() === '' ? true : bool(r.isActive)
      }
    })
  }
  console.log(`✅ Models (CSV): ${parseCsvFile('models_rows.csv').length}`)

  // --- machines_rows.csv ---
  for (const r of parseCsvFile('machines_rows.csv')) {
    const onboardedBy = remapUserId(userRemap, r.onboardedByUserId)
    const unitP = optDec(r.unitPrice)
    const monthlyP = optDec(r.monthlyRentalFee)
    await prisma.machine.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        brandId: r.brandId,
        modelId: r.modelId?.trim() || null,
        typeId: r.typeId?.trim() || null,
        serialNumber: r.serialNumber,
        boxNumber: r.boxNumber || null,
        qrCodeValue: r.qrCodeValue,
        qrCodeImageUrl: r.qrCodeImageUrl || null,
        photos: parseJson<string[]>(r.photos, []),
        voltage: r.voltage || null,
        power: r.power || null,
        stitchType: r.stitchType || null,
        maxSpeedSpm: r.maxSpeedSpm?.trim() ? parseInt(r.maxSpeedSpm, 10) : null,
        specsOther: r.specsOther || null,
        status: r.status as
          | 'AVAILABLE'
          | 'RENTED'
          | 'DAMAGED'
          | 'MAINTENANCE'
          | 'RETIRED',
        statusHistory: jsonArr(r.statusHistory),
        currentLocationType: r.currentLocationType || null,
        currentLocationName: r.currentLocationName || null,
        currentLocationAddress: r.currentLocationAddress || null,
        manufactureYear: r.manufactureYear || null,
        country: r.country || null,
        conditionOnArrival: r.conditionOnArrival || null,
        warrantyStatus: r.warrantyStatus || null,
        warrantyExpiryDate: optPgDate(r.warrantyExpiryDate),
        purchaseDate: optPgDate(r.purchaseDate),
        notes: r.notes || null,
        onboardedAt: optPgDate(r.onboardedAt) ?? new Date(),
        onboardedByUserId: onboardedBy,
        lastRentalId: r.lastRentalId?.trim() || null,
        totalRentalDays: parseInt(dec(r.totalRentalDays, '0'), 10),
        unitPrice: unitP ? new Prisma.Decimal(unitP) : null,
        monthlyRentalFee: monthlyP ? new Prisma.Decimal(monthlyP) : null
      },
      update: {
        brandId: r.brandId,
        modelId: r.modelId?.trim() || null,
        typeId: r.typeId?.trim() || null,
        serialNumber: r.serialNumber,
        boxNumber: r.boxNumber || null,
        qrCodeValue: r.qrCodeValue,
        qrCodeImageUrl: r.qrCodeImageUrl || null,
        photos: parseJson<string[]>(r.photos, []),
        voltage: r.voltage || null,
        power: r.power || null,
        stitchType: r.stitchType || null,
        maxSpeedSpm: r.maxSpeedSpm?.trim() ? parseInt(r.maxSpeedSpm, 10) : null,
        specsOther: r.specsOther || null,
        status: r.status as
          | 'AVAILABLE'
          | 'RENTED'
          | 'DAMAGED'
          | 'MAINTENANCE'
          | 'RETIRED',
        statusHistory: jsonArr(r.statusHistory),
        currentLocationType: r.currentLocationType || null,
        currentLocationName: r.currentLocationName || null,
        currentLocationAddress: r.currentLocationAddress || null,
        manufactureYear: r.manufactureYear || null,
        country: r.country || null,
        conditionOnArrival: r.conditionOnArrival || null,
        warrantyStatus: r.warrantyStatus || null,
        warrantyExpiryDate: optPgDate(r.warrantyExpiryDate),
        purchaseDate: optPgDate(r.purchaseDate),
        notes: r.notes || null,
        onboardedByUserId: onboardedBy,
        lastRentalId: r.lastRentalId?.trim() || null,
        totalRentalDays: parseInt(dec(r.totalRentalDays, '0'), 10),
        unitPrice: unitP ? new Prisma.Decimal(unitP) : null,
        monthlyRentalFee: monthlyP ? new Prisma.Decimal(monthlyP) : null
      }
    })
  }
  console.log(`✅ Machines (CSV): ${parseCsvFile('machines_rows.csv').length}`)

  // --- customers_rows.csv ---
  for (const r of parseCsvFile('customers_rows.csv')) {
    const phones = parseJson<string[]>(r.phones, [])
    const emails = parseJson<string[]>(r.emails, [])
    const alertCh = r.alertChannels?.trim() ? parseJson<string[]>(r.alertChannels, []) : []
    await prisma.customer.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        code: r.code,
        type: r.type as 'GARMENT_FACTORY' | 'INDIVIDUAL',
        name: r.name,
        contactPerson: r.contactPerson || null,
        phones,
        emails,
        billingAddressLine1: r.billingAddressLine1 || null,
        billingAddressLine2: r.billingAddressLine2 || null,
        billingCity: r.billingCity || null,
        billingRegion: r.billingRegion || null,
        billingPostalCode: r.billingPostalCode || null,
        billingCountry: r.billingCountry || null,
        shippingAddressLine1: r.shippingAddressLine1 || null,
        shippingAddressLine2: r.shippingAddressLine2 || null,
        shippingCity: r.shippingCity || null,
        shippingRegion: r.shippingRegion || null,
        shippingPostalCode: r.shippingPostalCode || null,
        shippingCountry: r.shippingCountry || null,
        vatApplicable: bool(r.vatApplicable),
        vatRegistrationNumber: r.vatRegistrationNumber || null,
        taxCategory: r.taxCategory as 'VAT' | 'NON_VAT',
        creditLimit: new Prisma.Decimal(dec(r.creditLimit, '0')),
        paymentTermsDays: parseInt(dec(r.paymentTermsDays, '30'), 10),
        currentBalance: new Prisma.Decimal(dec(r.currentBalance, '0')),
        oldestOutstandingInvoiceDate: optPgDate(r.oldestOutstandingInvoiceDate),
        isCreditLocked: bool(r.isCreditLocked),
        creditLockReason: r.creditLockReason || null,
        alertChannels: alertCh,
        alertLanguage: dec(r.alertLanguage, 'en'),
        status: r.status as 'ACTIVE' | 'INACTIVE'
      },
      update: {
        code: r.code,
        type: r.type as 'GARMENT_FACTORY' | 'INDIVIDUAL',
        name: r.name,
        contactPerson: r.contactPerson || null,
        phones,
        emails,
        billingAddressLine1: r.billingAddressLine1 || null,
        billingAddressLine2: r.billingAddressLine2 || null,
        billingCity: r.billingCity || null,
        billingRegion: r.billingRegion || null,
        billingPostalCode: r.billingPostalCode || null,
        billingCountry: r.billingCountry || null,
        shippingAddressLine1: r.shippingAddressLine1 || null,
        shippingAddressLine2: r.shippingAddressLine2 || null,
        shippingCity: r.shippingCity || null,
        shippingRegion: r.shippingRegion || null,
        shippingPostalCode: r.shippingPostalCode || null,
        shippingCountry: r.shippingCountry || null,
        vatApplicable: bool(r.vatApplicable),
        vatRegistrationNumber: r.vatRegistrationNumber || null,
        taxCategory: r.taxCategory as 'VAT' | 'NON_VAT',
        creditLimit: new Prisma.Decimal(dec(r.creditLimit, '0')),
        paymentTermsDays: parseInt(dec(r.paymentTermsDays, '30'), 10),
        currentBalance: new Prisma.Decimal(dec(r.currentBalance, '0')),
        oldestOutstandingInvoiceDate: optPgDate(r.oldestOutstandingInvoiceDate),
        isCreditLocked: bool(r.isCreditLocked),
        creditLockReason: r.creditLockReason || null,
        alertChannels: alertCh,
        alertLanguage: dec(r.alertLanguage, 'en'),
        status: r.status as 'ACTIVE' | 'INACTIVE'
      }
    })
  }
  console.log(`✅ Customers (CSV): ${parseCsvFile('customers_rows.csv').length}`)

  // --- customer_locations_rows.csv ---
  for (const r of parseCsvFile('customer_locations_rows.csv')) {
    await prisma.customerLocation.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        customerId: r.customerId,
        name: r.name,
        addressLine1: r.addressLine1 || null,
        addressLine2: r.addressLine2 || null,
        city: r.city || null,
        region: r.region || null,
        postalCode: r.postalCode || null,
        country: r.country || null,
        isDefault: bool(r.isDefault)
      },
      update: {
        customerId: r.customerId,
        name: r.name,
        addressLine1: r.addressLine1 || null,
        addressLine2: r.addressLine2 || null,
        city: r.city || null,
        region: r.region || null,
        postalCode: r.postalCode || null,
        country: r.country || null,
        isDefault: bool(r.isDefault)
      }
    })
  }
  console.log(`✅ Customer locations (CSV): ${parseCsvFile('customer_locations_rows.csv').length}`)

  // --- purchase_orders_rows.csv ---
  for (const r of parseCsvFile('purchase_orders_rows.csv')) {
    const machinesCol = jsonArr(r.machines)
    await prisma.purchaseOrder.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        requestNumber: r.requestNumber,
        customerId: r.customerId,
        requestDate: pgDate(r.requestDate),
        totalAmount: new Prisma.Decimal(dec(r.totalAmount, '0')),
        status: r.status as
          | 'PENDING'
          | 'APPROVED'
          | 'REJECTED'
          | 'ACTIVE'
          | 'COMPLETED'
          | 'CANCELLED'
          | 'PARTIALLY_FULFILLED',
        startDate: optPgDate(r.startDate),
        endDate: optPgDate(r.endDate),
        customerLocationId: r.customerLocationId?.trim() || null,
        machines: machinesCol,
        notes: r.notes || null
      },
      update: {
        requestNumber: r.requestNumber,
        customerId: r.customerId,
        requestDate: pgDate(r.requestDate),
        totalAmount: new Prisma.Decimal(dec(r.totalAmount, '0')),
        status: r.status as
          | 'PENDING'
          | 'APPROVED'
          | 'REJECTED'
          | 'ACTIVE'
          | 'COMPLETED'
          | 'CANCELLED'
          | 'PARTIALLY_FULFILLED',
        startDate: optPgDate(r.startDate),
        endDate: optPgDate(r.endDate),
        customerLocationId: r.customerLocationId?.trim() || null,
        machines: machinesCol,
        notes: r.notes || null
      }
    })
  }
  console.log(`✅ Purchase orders (CSV): ${parseCsvFile('purchase_orders_rows.csv').length}`)

  // --- rentals_rows.csv ---
  for (const r of parseCsvFile('rentals_rows.csv')) {
    const requestedMachineLines: Prisma.InputJsonValue | typeof Prisma.DbNull =
      r.requestedMachineLines?.trim()
        ? (JSON.parse(r.requestedMachineLines) as Prisma.InputJsonValue)
        : Prisma.DbNull
    const createdBy = requireUserId(userRemap, r.createdByUserId, 'rental.createdByUserId')
    await prisma.rental.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        agreementNumber: r.agreementNumber,
        customerId: r.customerId,
        purchaseOrderId: r.purchaseOrderId?.trim() || null,
        status: r.status as 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
        agreementType: dec(r.agreementType, 'RENTAL'),
        startDate: pgDate(r.startDate),
        expectedEndDate: optPgDate(r.expectedEndDate),
        actualEndDate: optPgDate(r.actualEndDate),
        paymentBasis: r.paymentBasis as 'MONTHLY' | 'DAILY',
        firstMonthProrated: bool(r.firstMonthProrated),
        subtotal: new Prisma.Decimal(dec(r.subtotal, '0')),
        vatAmount: new Prisma.Decimal(dec(r.vatAmount, '0')),
        total: new Prisma.Decimal(dec(r.total, '0')),
        depositTotal: new Prisma.Decimal(dec(r.depositTotal, '0')),
        paidAmount: new Prisma.Decimal(dec(r.paidAmount, '0')),
        balance: new Prisma.Decimal(dec(r.balance, '0')),
        currency: dec(r.currency, 'USD'),
        securityDepositInvoiceId: r.securityDepositInvoiceId?.trim() || null,
        isLockedForNewTransactions: bool(r.isLockedForNewTransactions),
        lockedReason: r.lockedReason || null,
        createdByUserId: createdBy,
        requestedMachineLines
      },
      update: {
        agreementNumber: r.agreementNumber,
        customerId: r.customerId,
        purchaseOrderId: r.purchaseOrderId?.trim() || null,
        status: r.status as 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
        agreementType: dec(r.agreementType, 'RENTAL'),
        startDate: pgDate(r.startDate),
        expectedEndDate: optPgDate(r.expectedEndDate),
        actualEndDate: optPgDate(r.actualEndDate),
        paymentBasis: r.paymentBasis as 'MONTHLY' | 'DAILY',
        firstMonthProrated: bool(r.firstMonthProrated),
        subtotal: new Prisma.Decimal(dec(r.subtotal, '0')),
        vatAmount: new Prisma.Decimal(dec(r.vatAmount, '0')),
        total: new Prisma.Decimal(dec(r.total, '0')),
        depositTotal: new Prisma.Decimal(dec(r.depositTotal, '0')),
        paidAmount: new Prisma.Decimal(dec(r.paidAmount, '0')),
        balance: new Prisma.Decimal(dec(r.balance, '0')),
        currency: dec(r.currency, 'USD'),
        securityDepositInvoiceId: r.securityDepositInvoiceId?.trim() || null,
        isLockedForNewTransactions: bool(r.isLockedForNewTransactions),
        lockedReason: r.lockedReason || null,
        createdByUserId: createdBy,
        requestedMachineLines
      }
    })
  }
  console.log(`✅ Rentals (CSV): ${parseCsvFile('rentals_rows.csv').length}`)

  // --- rental_machines_rows.csv ---
  for (const r of parseCsvFile('rental_machines_rows.csv')) {
    await prisma.rentalMachine.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        rentalId: r.rentalId,
        machineId: r.machineId,
        dailyRate: new Prisma.Decimal(dec(r.dailyRate, '0')),
        securityDeposit: new Prisma.Decimal(dec(r.securityDeposit, '0')),
        quantity: parseInt(dec(r.quantity, '1'), 10),
        lastBilledToDate: optPgDate(r.lastBilledToDate)
      },
      update: {
        rentalId: r.rentalId,
        machineId: r.machineId,
        dailyRate: new Prisma.Decimal(dec(r.dailyRate, '0')),
        securityDeposit: new Prisma.Decimal(dec(r.securityDeposit, '0')),
        quantity: parseInt(dec(r.quantity, '1'), 10),
        lastBilledToDate: optPgDate(r.lastBilledToDate)
      }
    })
  }
  console.log(`✅ Rental machines (CSV): ${parseCsvFile('rental_machines_rows.csv').length}`)

  // --- invoices_rows.csv ---
  for (const r of parseCsvFile('invoices_rows.csv')) {
    const createdBy = requireUserId(userRemap, r.createdByUserId, 'invoice.createdByUserId')
    const lineItems = jsonArr(r.lineItems)
    await prisma.invoice.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        customerId: r.customerId,
        rentalId: r.rentalId?.trim() || null,
        type: r.type as 'RENTAL' | 'DEPOSIT' | 'DAMAGE' | 'OTHER',
        taxCategory: r.taxCategory as 'VAT' | 'NON_VAT',
        status: r.status as 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED',
        issueDate: pgDate(r.issueDate),
        dueDate: pgDate(r.dueDate),
        lineItems,
        subtotal: new Prisma.Decimal(dec(r.subtotal, '0')),
        vatAmount: new Prisma.Decimal(dec(r.vatAmount, '0')),
        grandTotal: new Prisma.Decimal(dec(r.grandTotal, '0')),
        currency: dec(r.currency, 'USD'),
        paymentStatus: r.paymentStatus as 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE',
        paidAmount: new Prisma.Decimal(dec(r.paidAmount, '0')),
        balance: new Prisma.Decimal(dec(r.balance, '0')),
        createdByUserId: createdBy
      },
      update: {
        invoiceNumber: r.invoiceNumber,
        customerId: r.customerId,
        rentalId: r.rentalId?.trim() || null,
        type: r.type as 'RENTAL' | 'DEPOSIT' | 'DAMAGE' | 'OTHER',
        taxCategory: r.taxCategory as 'VAT' | 'NON_VAT',
        status: r.status as 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'CANCELLED',
        issueDate: pgDate(r.issueDate),
        dueDate: pgDate(r.dueDate),
        lineItems,
        subtotal: new Prisma.Decimal(dec(r.subtotal, '0')),
        vatAmount: new Prisma.Decimal(dec(r.vatAmount, '0')),
        grandTotal: new Prisma.Decimal(dec(r.grandTotal, '0')),
        currency: dec(r.currency, 'USD'),
        paymentStatus: r.paymentStatus as 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE',
        paidAmount: new Prisma.Decimal(dec(r.paidAmount, '0')),
        balance: new Prisma.Decimal(dec(r.balance, '0')),
        createdByUserId: createdBy
      }
    })
  }
  console.log(`✅ Invoices (CSV): ${parseCsvFile('invoices_rows.csv').length}`)

  // --- gate_passes_rows.csv ---
  for (const r of parseCsvFile('gate_passes_rows.csv')) {
    const issuedBy = requireUserId(userRemap, r.issuedByUserId, 'gatePass.issuedByUserId')
    await prisma.gatePass.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        gatePassNumber: r.gatePassNumber,
        rentalId: r.rentalId,
        customerId: r.customerId,
        driverName: r.driverName || null,
        vehicleNumber: r.vehicleNumber || null,
        departureTime: pgDate(r.departureTime),
        arrivalTime: optPgDate(r.arrivalTime),
        issuedByUserId: issuedBy,
        status: r.status as 'PENDING' | 'DEPARTED' | 'RETURNED' | 'REJECTED',
        printedAt: optPgDate(r.printedAt)
      },
      update: {
        gatePassNumber: r.gatePassNumber,
        rentalId: r.rentalId,
        customerId: r.customerId,
        driverName: r.driverName || null,
        vehicleNumber: r.vehicleNumber || null,
        departureTime: pgDate(r.departureTime),
        arrivalTime: optPgDate(r.arrivalTime),
        issuedByUserId: issuedBy,
        status: r.status as 'PENDING' | 'DEPARTED' | 'RETURNED' | 'REJECTED',
        printedAt: optPgDate(r.printedAt)
      }
    })
  }
  console.log(`✅ Gate passes (CSV): ${parseCsvFile('gate_passes_rows.csv').length}`)

  // --- gate_pass_machines_rows.csv ---
  for (const r of parseCsvFile('gate_pass_machines_rows.csv')) {
    await prisma.gatePassMachine.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        gatePassId: r.gatePassId,
        machineId: r.machineId,
        quantity: parseInt(dec(r.quantity, '1'), 10)
      },
      update: {
        gatePassId: r.gatePassId,
        machineId: r.machineId,
        quantity: parseInt(dec(r.quantity, '1'), 10)
      }
    })
  }
  console.log(`✅ Gate pass machines (CSV): ${parseCsvFile('gate_pass_machines_rows.csv').length}`)

  // --- bincard_entries_rows.csv ---
  for (const r of parseCsvFile('bincard_entries_rows.csv')) {
    await prisma.bincardEntry.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        date: pgDate(r.date),
        transactionType: r.transactionType as
          | 'STOCK_IN'
          | 'STOCK_OUT'
          | 'RENTAL_OUT'
          | 'RETURN_IN'
          | 'MAINTENANCE_OUT'
          | 'MAINTENANCE_IN'
          | 'RETIRED'
          | 'ADJUSTMENT',
        brand: r.brand,
        model: r.model,
        machineType: r.machineType || null,
        reference: r.reference || null,
        quantityIn: parseInt(dec(r.quantityIn, '0'), 10),
        quantityOut: parseInt(dec(r.quantityOut, '0'), 10),
        balance: parseInt(dec(r.balance, '0'), 10),
        location: r.location || null,
        stockType: r.stockType || null,
        warrantyExpiry: optPgDate(r.warrantyExpiry),
        condition: r.condition || null,
        performedBy: r.performedBy || null,
        notes: r.notes || null
      },
      update: {
        date: pgDate(r.date),
        transactionType: r.transactionType as
          | 'STOCK_IN'
          | 'STOCK_OUT'
          | 'RENTAL_OUT'
          | 'RETURN_IN'
          | 'MAINTENANCE_OUT'
          | 'MAINTENANCE_IN'
          | 'RETIRED'
          | 'ADJUSTMENT',
        brand: r.brand,
        model: r.model,
        machineType: r.machineType || null,
        reference: r.reference || null,
        quantityIn: parseInt(dec(r.quantityIn, '0'), 10),
        quantityOut: parseInt(dec(r.quantityOut, '0'), 10),
        balance: parseInt(dec(r.balance, '0'), 10),
        location: r.location || null,
        stockType: r.stockType || null,
        warrantyExpiry: optPgDate(r.warrantyExpiry),
        condition: r.condition || null,
        performedBy: r.performedBy || null,
        notes: r.notes || null
      }
    })
  }
  console.log(`✅ Bincard entries (CSV): ${parseCsvFile('bincard_entries_rows.csv').length}`)

  // --- transaction_logs_rows.csv ---
  for (const r of parseCsvFile('transaction_logs_rows.csv')) {
    const amt = optDec(r.amount)
    await prisma.transactionLog.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        transactionDate: pgDate(r.transactionDate),
        category: r.category as
          | 'INVENTORY'
          | 'RENTAL'
          | 'RETURN'
          | 'INVOICE'
          | 'MAINTENANCE'
          | 'OTHER',
        transactionType: r.transactionType,
        reference: r.reference || null,
        description: r.description,
        brand: r.brand || null,
        model: r.model || null,
        customerId: r.customerId?.trim() || null,
        amount: amt ? new Prisma.Decimal(amt) : null,
        quantity: r.quantity?.trim() ? parseInt(r.quantity, 10) : null,
        location: r.location || null,
        performedBy: r.performedBy || null,
        status: r.status as 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED',
        notes: r.notes || null
      },
      update: {
        transactionDate: pgDate(r.transactionDate),
        category: r.category as
          | 'INVENTORY'
          | 'RENTAL'
          | 'RETURN'
          | 'INVOICE'
          | 'MAINTENANCE'
          | 'OTHER',
        transactionType: r.transactionType,
        reference: r.reference || null,
        description: r.description,
        brand: r.brand || null,
        model: r.model || null,
        customerId: r.customerId?.trim() || null,
        amount: amt ? new Prisma.Decimal(amt) : null,
        quantity: r.quantity?.trim() ? parseInt(r.quantity, 10) : null,
        location: r.location || null,
        performedBy: r.performedBy || null,
        status: r.status as 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED',
        notes: r.notes || null
      }
    })
  }
  console.log(`✅ Transaction logs (CSV): ${parseCsvFile('transaction_logs_rows.csv').length}`)

  // --- qr_print_logs_rows.csv ---
  for (const r of parseCsvFile('qr_print_logs_rows.csv')) {
    const printedBy = requireUserId(userRemap, r.printedByUserId, 'qrPrintLog.printedByUserId')
    await prisma.qrPrintLog.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        machineId: r.machineId,
        printedByUserId: printedBy,
        serialNumber: r.serialNumber,
        boxNumber: r.boxNumber || null,
        qrCodeValue: r.qrCodeValue,
        printCount: parseInt(dec(r.printCount, '1'), 10),
        printedAt: optPgDate(r.printedAt) ?? new Date(),
        notes: r.notes || null
      },
      update: {
        machineId: r.machineId,
        printedByUserId: printedBy,
        serialNumber: r.serialNumber,
        boxNumber: r.boxNumber || null,
        qrCodeValue: r.qrCodeValue,
        printCount: parseInt(dec(r.printCount, '1'), 10),
        printedAt: optPgDate(r.printedAt) ?? new Date(),
        notes: r.notes || null
      }
    })
  }
  console.log(`✅ QR print logs (CSV): ${parseCsvFile('qr_print_logs_rows.csv').length}`)
}

/** Aligned with `public/csv/roles_rows.csv` — upserted by unique `name`. */
const SEED_ROLES: Array<{ name: string; description: string; permissions: string[] }> = [
  {
    name: 'SUPER_ADMIN',
    description: 'Super Administrator with full system access',
    permissions: ['*']
  },
  {
    name: 'Security_Officer',
    description: 'security officer',
    permissions: ['gatepasses:approve']
  },
  {
    name: 'Stock_Keeper',
    description: 'stock keeper',
    permissions: ['operations:machine-assign', 'operations:return-process']
  },
  {
    name: 'Operational_Officer',
    description: 'operational officer',
    permissions: [
      'reports:view',
      'purchase-orders:view',
      'purchase-orders:create',
      'purchase-orders:approve',
      'rentals:view',
      'rentals:create',
      'rentals:update',
      'rentals:delete',
      'gatepasses:view',
      'gatepasses:create',
      'gatepasses:delete',
      'returns:view',
      'returns:create',
      'invoices:view',
      'invoices:create',
      'invoices:update',
      'inventory:view',
      'inventory:stock-in',
      'machines:view',
      'tools:view',
      'machines:create',
      'tools:create',
      'machines:update',
      'tools:update',
      'machines:delete',
      'tools:delete',
      'customers:view',
      'customers:create',
      'customers:update',
      'customers:delete',
      'alerts:view',
      'transaction-log:view',
      'bincard:view',
      'settings:view',
      'settings:update'
    ]
  }
]

/** Aligned with `public/csv/users_rows.csv` — `id` must stay the Supabase Auth user id after create. */
const SEED_PASSWORD = 'admin123'

type SeedAppUser = {
  email: string
  username: string
  fullName: string
  roleName: string
  phone?: string | null
}

const SEED_APP_USERS: SeedAppUser[] = [
  {
    email: 'admin@needletech.com',
    username: 'admin',
    fullName: 'Super Administrator',
    roleName: 'SUPER_ADMIN',
    phone: null
  },
  {
    email: 'stock@gmail.com',
    username: 'stock keeper',
    fullName: 'Sasith Ruvin',
    roleName: 'Stock_Keeper',
    phone: '0768923776'
  },
  {
    email: 'security@gmail.com',
    username: 'security_officer',
    fullName: 'Tharusha Thathsara',
    roleName: 'Security_Officer',
    phone: '0712232123'
  },
  {
    email: 'operation@gmail.com',
    username: 'operational officer',
    fullName: 'Tharushi Gunarathne',
    roleName: 'Operational_Officer',
    phone: '0712312345'
  }
]

async function ensureSeedUser(
  authPool: { id: string; email?: string | null }[],
  params: SeedAppUser & { password: string; roleId: string }
) {
  const { email, password, username, fullName, roleId, phone } = params

  const existing = authPool.find(
    u => u.email?.toLowerCase() === email.toLowerCase()
  )

  let userId: string
  if (existing) {
    console.log(`⚠️  Already in Supabase Auth: ${email}`)
    userId = existing.id
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, fullName }
    })
    if (error) throw error
    if (!data.user) throw new Error('No user returned from Supabase')
    userId = data.user.id
    authPool.push(data.user)
    console.log(`✅ Created in Supabase Auth: ${email}`)
  }

  const phoneValue = phone?.trim() ? phone.trim() : null

  await prisma.user.upsert({
    where: { id: userId },
    update: {
      username,
      email,
      fullName,
      roleId,
      phone: phoneValue,
      status: 'ACTIVE'
    },
    create: {
      id: userId,
      username,
      email,
      fullName,
      roleId,
      phone: phoneValue,
      status: 'ACTIVE'
    }
  })
  console.log(`✅ User in database: ${email}`)
}

async function main() {
  console.log('🌱 Starting database seed...')

  // 1. Roles (from roles_rows.csv)
  console.log('📝 Upserting roles...')
  const roleByName: Record<string, { id: string }> = {}
  for (const r of SEED_ROLES) {
    const row = await prisma.role.upsert({
      where: { name: r.name },
      update: {
        description: r.description,
        permissions: r.permissions
      },
      create: {
        name: r.name,
        description: r.description,
        permissions: r.permissions
      }
    })
    roleByName[r.name] = row
    console.log(`   ✓ ${r.name}`)
  }

  // 2–3. Users in Supabase Auth + DB (from users_rows.csv; ids follow Supabase)
  console.log('👤 Seeding users (Supabase Auth + Prisma)...')
  const { data: authList, error: authListError } = await supabase.auth.admin.listUsers()
  if (authListError) throw authListError
  const authPool = [...(authList?.users ?? [])]

  for (const u of SEED_APP_USERS) {
    const role = roleByName[u.roleName]
    if (!role) throw new Error(`Missing role for seed user ${u.email}: ${u.roleName}`)
    await ensureSeedUser(authPool, { ...u, password: SEED_PASSWORD, roleId: role.id })
  }

  // 4. Domain data from `public/csv/*_rows.csv` (order respects FKs)
  console.log('📂 Loading domain data from public/csv …')
  const userRemap = await buildLegacyUserIdRemap()
  await seedDomainFromPublicCsv(userRemap)

  console.log('\n🎉 Database seeding completed!\n')
  console.log('📋 Dev login (all seed users share this password):')
  console.log('   Password:', SEED_PASSWORD)
  for (const u of SEED_APP_USERS) {
    console.log(`   - ${u.email} (${u.roleName})`)
  }
  console.log('\n📊 Core auth:')
  console.log(`   - ${SEED_ROLES.length} roles`)
  console.log(`   - ${SEED_APP_USERS.length} users`)
  console.log('\n📊 Domain rows loaded from CSV (see logs above).')
  console.log('\n⚠️  Please change the password after first login!\n')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })