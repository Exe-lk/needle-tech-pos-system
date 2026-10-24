/**
 * Shared month-slice billing helpers for multi-agreement rental invoices.
 *
 * Create-invoice billing always uses full monthly fee per included month
 * (FULL_FEE_ALL_MONTHS and SELECTED_MONTHS). Day-proration remains available
 * via monthRateFactor(..., useFullFee=false) for Print Monthly only.
 */

export type RentalBillingMode = 'FULL_FEE_ALL_MONTHS' | 'SELECTED_MONTHS';

export type MonthSlice = {
  periodFrom: string; // YYYY-MM-DD
  periodTo: string;   // YYYY-MM-DD
  year: number;
  month: number; // 0-indexed
  monthLabel: string;
  daysInPeriod: number;
  daysInMonth: number;
  isPartialMonth: boolean;
};

export type RentalBillingInput = {
  rentalId: string;
  mode: RentalBillingMode;
  /** Required when mode is SELECTED_MONTHS */
  months?: Array<{ periodFrom: string; periodTo: string }>;
};

export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

export const getDaysInMonth = (year: number, month: number): number => {
  // month is 0-indexed; use UTC to avoid TZ drift
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
};

/** Normalize any Date/ISO string to YYYY-MM-DD using the UTC calendar day. */
export const toUtcDateOnlyString = (s: string | Date): string => {
  if (s instanceof Date) {
    if (Number.isNaN(s.getTime())) return '';
    const y = s.getUTCFullYear();
    const m = String(s.getUTCMonth() + 1).padStart(2, '0');
    const d = String(s.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const raw = String(s || '').trim();
  if (!raw) return '';
  // Prefer explicit YYYY-MM-DD prefix (ISO timestamps and date inputs)
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return '';
  return toUtcDateOnlyString(dt);
};

/** Parse to a UTC noon Date for the calendar day (stable across local TZ). */
const parseDateOnly = (s: string | Date): Date => {
  const ymd = toUtcDateOnlyString(s);
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1, 12, 0, 0));
};

const toDateOnly = (d: Date): string => toUtcDateOnlyString(d);

/**
 * Build month slices from agreement start → end (UTC date-only).
 * Open-ended agreements (no end) are capped through `capThrough` (default: today UTC).
 */
export function buildMonthSlices(
  startDate: string | Date,
  endDate: string | Date | null | undefined,
  capThrough: string | Date = new Date()
): MonthSlice[] {
  const start = parseDateOnly(startDate);
  const end = endDate ? parseDateOnly(endDate) : parseDateOnly(capThrough);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const slices: MonthSlice[] = [];
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1, 12, 0, 0));

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const daysInMonth = getDaysInMonth(year, month);

    const isFirstMonth = year === start.getUTCFullYear() && month === start.getUTCMonth();
    const isLastMonth = year === end.getUTCFullYear() && month === end.getUTCMonth();

    const periodStartDay = isFirstMonth ? start.getUTCDate() : 1;
    const periodEndDay = isLastMonth ? end.getUTCDate() : daysInMonth;
    const daysInPeriod = periodEndDay - periodStartDay + 1;

    const periodFrom = `${year}-${String(month + 1).padStart(2, '0')}-${String(periodStartDay).padStart(2, '0')}`;
    const periodTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(periodEndDay).padStart(2, '0')}`;
    const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

    slices.push({
      periodFrom,
      periodTo,
      year,
      month,
      monthLabel,
      daysInPeriod,
      daysInMonth,
      isPartialMonth: daysInPeriod < daysInMonth,
    });

    cursor = new Date(Date.UTC(year, month + 1, 1, 12, 0, 0));
  }

  return slices;
}

/** Factor to multiply a full monthly rate by for one month slice. */
export function monthRateFactor(
  slice: Pick<MonthSlice, 'daysInPeriod' | 'daysInMonth' | 'isPartialMonth'>,
  useFullFee: boolean
): number {
  if (useFullFee || !slice.isPartialMonth) return 1;
  return slice.daysInPeriod / slice.daysInMonth;
}

/**
 * Resolve the billed month slices for one rental based on billing mode.
 * FULL_FEE_ALL_MONTHS → all months in range at full fee.
 * SELECTED_MONTHS → only provided months, each at full monthly fee (no day proration).
 */
export function resolveBilledMonths(
  startDate: string | Date,
  endDate: string | Date | null | undefined,
  billing: Pick<RentalBillingInput, 'mode' | 'months'>,
  capThrough: string | Date = new Date()
): { slices: MonthSlice[]; useFullFee: boolean } {
  const allSlices = buildMonthSlices(startDate, endDate, capThrough);

  // Create-invoice flow: always full monthly fee per included month.
  const useFullFee = true;

  if (billing.mode === 'FULL_FEE_ALL_MONTHS') {
    return { slices: allSlices, useFullFee };
  }

  const selectedKeys = new Set(
    (billing.months ?? []).map(
      (m) => `${toUtcDateOnlyString(m.periodFrom)}|${toUtcDateOnlyString(m.periodTo)}`
    )
  );

  const slices = allSlices.filter((s) => selectedKeys.has(`${s.periodFrom}|${s.periodTo}`));
  // Also accept months that match by periodFrom only (client may send approximate ends)
  const fromOnly = new Set((billing.months ?? []).map((m) => toUtcDateOnlyString(m.periodFrom)));
  const slicesByFrom =
    slices.length > 0 ? slices : allSlices.filter((s) => fromOnly.has(s.periodFrom));

  // If client sent custom month windows not in agreement calendar, trust client windows
  if (slicesByFrom.length === 0 && (billing.months?.length ?? 0) > 0) {
    const custom: MonthSlice[] = (billing.months ?? []).map((m) => {
      const from = parseDateOnly(m.periodFrom);
      const to = parseDateOnly(m.periodTo);
      const year = from.getUTCFullYear();
      const month = from.getUTCMonth();
      const daysInMonth = getDaysInMonth(year, month);
      const daysInPeriod = Math.max(
        1,
        Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1
      );
      return {
        periodFrom: toDateOnly(from),
        periodTo: toDateOnly(to),
        year,
        month,
        monthLabel: new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }),
        daysInPeriod: Math.min(daysInPeriod, daysInMonth),
        daysInMonth,
        isPartialMonth: daysInPeriod < daysInMonth,
      };
    });
    return { slices: custom, useFullFee };
  }

  return { slices: slicesByFrom, useFullFee };
}

/** Sum of month factors for a rental (e.g. 2 months of charge). */
export function sumMonthFactors(
  startDate: string | Date,
  endDate: string | Date | null | undefined,
  billing: Pick<RentalBillingInput, 'mode' | 'months'>,
  capThrough: string | Date = new Date()
): number {
  const { slices, useFullFee } = resolveBilledMonths(startDate, endDate, billing, capThrough);
  return slices.reduce((sum, s) => sum + monthRateFactor(s, useFullFee), 0);
}

/** Latest periodTo across billed slices (for due date default). */
export function latestBilledPeriodTo(
  startDate: string | Date,
  endDate: string | Date | null | undefined,
  billing: Pick<RentalBillingInput, 'mode' | 'months'>,
  capThrough: string | Date = new Date()
): string | null {
  const { slices } = resolveBilledMonths(startDate, endDate, billing, capThrough);
  if (slices.length === 0) return null;
  return slices.reduce((max, s) => (s.periodTo > max ? s.periodTo : max), slices[0].periodTo);
}

/**
 * Monthly rate used by create-invoice preview and Review edits.
 * Prefer catalog monthlyRentalFee when stored dailyRate implies a much lower monthly
 * (common when PO lines were seeded from purchase unitPrice instead of monthlyRentalFee).
 */
export function resolveMonthlyRate(
  dailyRate?: number | null,
  monthlyRentalFee?: number | null
): number {
  let daily = Number(dailyRate) || 0;
  const catalogMonthly = monthlyRentalFee != null ? Number(monthlyRentalFee) : NaN;
  if (Number.isFinite(catalogMonthly) && catalogMonthly > 0 && daily * 30 < catalogMonthly * 0.5) {
    daily = catalogMonthly / 30;
  }
  return round2(daily * 30);
}

/** Rental Charge = (Monthly Rent / 30) × Rental Days */
export function billedAmountFromFormula(monthlyRent: number, rentalDays: number): number {
  return round2(((Number(monthlyRent) || 0) / 30) * (Number(rentalDays) || 0));
}

export type ReviewMachineSource = {
  rentalId: string;
  agreementNumber: string;
  startDate: string | Date;
  expectedEndDate: string | Date | null | undefined;
  billing: Pick<RentalBillingInput, 'mode' | 'months'>;
  machines: Array<{
    quantity?: number;
    dailyRate?: number | null;
    monthlyRentalFee?: number | null;
    brand?: string;
    model?: string;
    type?: string;
    serialNumber?: string;
  }>;
};

export type ReviewMachineRow = {
  key: string;
  rentalId: string;
  agreementNumber: string;
  serialNumber: string;
  brand: string;
  model: string;
  type: string;
  included: boolean;
  monthlyRent: number;
  rentalDays: number;
  billedAmount: number;
  amountOverridden: boolean;
};

/**
 * One Review row per assigned machine. Defaults match create-invoice full-fee math:
 * monthlyRent = resolveMonthlyRate(...), rentalDays = 30 × monthFactor,
 * billedAmount = monthlyRent / 30 × rentalDays.
 */
export function buildReviewMachineRows(
  rentals: ReviewMachineSource[],
  capThrough: string | Date = new Date()
): ReviewMachineRow[] {
  const rows: ReviewMachineRow[] = [];
  for (const rental of rentals) {
    const monthFactor = sumMonthFactors(
      rental.startDate,
      rental.expectedEndDate,
      rental.billing,
      capThrough
    );
    const factor = monthFactor > 0 ? monthFactor : 0;
    const machines = Array.isArray(rental.machines) ? rental.machines : [];
    machines.forEach((machine, index) => {
      const qty = Math.max(1, Number(machine.quantity) || 1);
      const monthlyRent = resolveMonthlyRate(machine.dailyRate, machine.monthlyRentalFee);
      const rentalDays = round2(30 * factor);
      const billedAmount = billedAmountFromFormula(monthlyRent, rentalDays);
      const serial = String(machine.serialNumber || '').trim();
      for (let copy = 0; copy < qty; copy++) {
        rows.push({
          key: `${rental.rentalId}::${serial || 'noserial'}::${index}::${copy}`,
          rentalId: rental.rentalId,
          agreementNumber: rental.agreementNumber,
          serialNumber: serial,
          brand: machine.brand || '',
          model: machine.model || '',
          type: machine.type || '',
          included: true,
          monthlyRent,
          rentalDays,
          billedAmount,
          amountOverridden: false,
        });
      }
    });
  }
  return rows;
}

export function reviewMachineLineDescription(
  row: Pick<ReviewMachineRow, 'brand' | 'model' | 'type' | 'agreementNumber' | 'rentalDays'>
): string {
  const baseDesc =
    [row.brand, row.model, row.type].filter(Boolean).join(' ').toUpperCase() || 'MACHINE';
  const withAgreement = row.agreementNumber
    ? `${baseDesc} (AGREEMENT ${row.agreementNumber})`
    : baseDesc;
  const days = Number(row.rentalDays) || 0;
  if (days > 0 && Math.abs(days % 30) > 0.001) {
    return `${withAgreement} (${days} days)`;
  }
  return withAgreement;
}
