'use client';

import React from 'react';
import { Pencil } from 'lucide-react';
import {
  billedAmountFromFormula,
  round2,
  type ReviewMachineRow,
} from '@/lib/invoice-month-billing';

const money = (n: number) =>
  `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const inputClass =
  'w-full min-w-[5.5rem] px-2 py-1 border rounded text-sm bg-white dark:bg-slate-700 dark:text-white border-gray-300 dark:border-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-indigo-400';

function cloneRows(rows: ReviewMachineRow[]): ReviewMachineRow[] {
  return rows.map((row) => ({ ...row }));
}

function parseNonNegative(raw: string): number | null {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

type ReviewMachinesPanelProps = {
  rows: ReviewMachineRow[];
  editing: boolean;
  customized: boolean;
  error?: string;
  disabled?: boolean;
  onStartEdit: () => void;
  onReset: () => void;
  onCancel: () => void;
  onApply: () => void;
  onChangeRows: (rows: ReviewMachineRow[]) => void;
};

export function ReviewMachinesPanel({
  rows,
  editing,
  customized,
  error,
  disabled,
  onStartEdit,
  onReset,
  onCancel,
  onApply,
  onChangeRows,
}: ReviewMachinesPanelProps) {
  const displayRows = editing ? rows : rows.filter((row) => row.included);

  const patchRow = (key: string, updater: (row: ReviewMachineRow) => ReviewMachineRow) => {
    onChangeRows(rows.map((row) => (row.key === key ? updater(row) : row)));
  };

  const handleMonthlyRentChange = (key: string, raw: string) => {
    const parsed = parseNonNegative(raw);
    if (parsed == null) return;
    patchRow(key, (row) => {
      const monthlyRent = round2(parsed);
      return {
        ...row,
        monthlyRent,
        amountOverridden: false,
        billedAmount: billedAmountFromFormula(monthlyRent, row.rentalDays),
      };
    });
  };

  const handleDaysChange = (key: string, raw: string) => {
    const parsed = parseNonNegative(raw);
    if (parsed == null) return;
    patchRow(key, (row) => {
      const rentalDays = round2(parsed);
      return {
        ...row,
        rentalDays,
        amountOverridden: false,
        billedAmount: billedAmountFromFormula(row.monthlyRent, rentalDays),
      };
    });
  };

  const handleAmountChange = (key: string, raw: string) => {
    const parsed = parseNonNegative(raw);
    if (parsed == null) return;
    patchRow(key, (row) => ({
      ...row,
      billedAmount: round2(parsed),
      amountOverridden: true,
    }));
  };

  return (
    <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="font-medium text-gray-800 dark:text-gray-200">Machines and rent amounts</div>
        <div className="flex items-center gap-2">
          {customized && !editing && (
            <button
              type="button"
              onClick={onReset}
              disabled={disabled}
              className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:underline disabled:opacity-50"
            >
              Reset to calculated
            </button>
          )}
          {!editing && (
            <button
              type="button"
              onClick={onStartEdit}
              disabled={disabled || rows.length === 0}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-blue-200 dark:border-indigo-800 text-blue-700 dark:text-indigo-300 bg-blue-50 dark:bg-indigo-900/30 hover:bg-blue-100 dark:hover:bg-indigo-900/50 disabled:opacity-50"
            >
              <Pencil className="w-3 h-3" />
              Edit machines and amounts
            </button>
          )}
        </div>
      </div>

      {customized && !editing && (
        <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">
          Amounts customized for this invoice.
        </p>
      )}

      {editing && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Include or exclude machines from this invoice. Rent amount = (Monthly rent / 30) × Rental days,
          unless you type a custom amount.
        </p>
      )}

      {displayRows.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">No machines on the selected agreements.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 dark:border-slate-600">
          <table className="w-full border-collapse min-w-[36rem] text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/40 text-gray-600 dark:text-gray-300">
                {editing && <th className="text-left px-2 py-1.5 font-medium w-10">Incl.</th>}
                <th className="text-left px-2 py-1.5 font-medium">Serial</th>
                <th className="text-left px-2 py-1.5 font-medium">Machine</th>
                <th className="text-left px-2 py-1.5 font-medium">Agreement</th>
                <th className="text-right px-2 py-1.5 font-medium">Monthly rent</th>
                <th className="text-right px-2 py-1.5 font-medium">Days</th>
                <th className="text-right px-2 py-1.5 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => {
                const machineLabel =
                  [row.brand, row.model, row.type].filter(Boolean).join(' ') || 'Machine';
                return (
                  <tr
                    key={row.key}
                    className={`border-t border-gray-200 dark:border-slate-600 ${
                      editing && !row.included ? 'opacity-50' : ''
                    }`}
                  >
                    {editing && (
                      <td className="px-2 py-1.5 align-middle">
                        <input
                          type="checkbox"
                          checked={row.included}
                          onChange={() =>
                            patchRow(row.key, (current) => ({
                              ...current,
                              included: !current.included,
                            }))
                          }
                          className="rounded border-gray-300 dark:border-slate-500"
                          aria-label={`Include ${row.serialNumber || machineLabel}`}
                        />
                      </td>
                    )}
                    <td className="px-2 py-1.5 align-middle whitespace-nowrap text-gray-900 dark:text-white">
                      {row.serialNumber || '—'}
                    </td>
                    <td className="px-2 py-1.5 align-middle text-gray-900 dark:text-white">{machineLabel}</td>
                    <td className="px-2 py-1.5 align-middle whitespace-nowrap">{row.agreementNumber}</td>
                    <td className="px-2 py-1.5 align-middle text-right">
                      {editing ? (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={row.monthlyRent}
                          disabled={!row.included}
                          onChange={(e) => handleMonthlyRentChange(row.key, e.target.value)}
                          className={`${inputClass} text-right`}
                        />
                      ) : (
                        <span className="text-gray-900 dark:text-white">{money(row.monthlyRent)}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 align-middle text-right">
                      {editing ? (
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={row.rentalDays}
                          disabled={!row.included}
                          onChange={(e) => handleDaysChange(row.key, e.target.value)}
                          className={`${inputClass} text-right`}
                        />
                      ) : (
                        <span className="text-gray-900 dark:text-white">{row.rentalDays}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 align-middle text-right">
                      {editing ? (
                        <div>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.billedAmount}
                            disabled={!row.included}
                            onChange={(e) => handleAmountChange(row.key, e.target.value)}
                            className={`${inputClass} text-right`}
                          />
                          {row.amountOverridden && (
                            <div className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">Custom</div>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900 dark:text-white">
                          {money(row.billedAmount)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-500 dark:text-red-400">{error}</p>}

      {editing && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded border border-gray-300 dark:border-slate-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={disabled}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 dark:bg-indigo-600 hover:bg-blue-700 dark:hover:bg-indigo-700 rounded border border-blue-700 dark:border-indigo-700 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

export { cloneRows as cloneReviewMachineRows };
