import { Prisma } from '@prisma/client';

/**
 * Maps API money fields (string or number from JSON) to Prisma Decimal without using parseFloat,
 * which can introduce IEEE-754 drift that rounds incorrectly at DECIMAL(10,2) scale (e.g. 24000 → 23998).
 */
export function toPrismaDecimalMoneyInput(value: unknown): Prisma.Decimal | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  const normalized =
    typeof value === 'string'
      ? value.trim().replace(/[\s,']/g, '')
      : String(value).trim().replace(/[\s,']/g, '');
  if (normalized === '' || normalized === 'NaN') return undefined;
  try {
    return new Prisma.Decimal(normalized);
  } catch {
    return undefined;
  }
}
