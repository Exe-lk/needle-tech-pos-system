import React from 'react';
import { LetterheadDocument } from '@/src/components/letterhead/letterhead-document';

export interface PurchaseOrderPrintMachine {
  brand: string;
  model: string;
  type: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrderPrintTool {
  toolName?: string;
  toolType?: string;
  brand?: string;
  model?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
}

export interface PurchaseOrderPrintRequest {
  requestNumber: string;
  customerName: string;
  customerType: string;
  customerAddress?: string | null;
  requestDate: string;
  startDate?: string | null;
  endDate?: string | null;
  totalAmount: number;
  machines: PurchaseOrderPrintMachine[];
  tools?: PurchaseOrderPrintTool[];
}

interface Props {
  request: PurchaseOrderPrintRequest;
}

const purchaseOrderPrintLogoPath = (customerType: string): string =>
  customerType === 'Business' ? '/vat_logo.jpeg' : '/non_vat_logo.jpeg';

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-LK', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const formatMoney = (value: number): string =>
  value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const machineDescription = (machine: PurchaseOrderPrintMachine): string =>
  [machine.brand, machine.model].filter(Boolean).join(' ') + (machine.type ? ` - ${machine.type}` : '');

const toolDescription = (tool: PurchaseOrderPrintTool): string => {
  const brandModel = [tool.brand, tool.model].filter(Boolean).join(' ');
  return [tool.toolName, brandModel, tool.toolType].filter(Boolean).join(' - ') || 'Tool';
};

export const PurchaseOrderPrint: React.FC<Props> = ({ request }) => {
  const dateOfIssue = formatDate(request.requestDate) || 'TBD';
  const periodFrom = formatDate(request.startDate);
  const periodTo = formatDate(request.endDate);
  const period =
    periodFrom && periodTo ? `${periodFrom} to ${periodTo}` : periodFrom || periodTo || '—';

  const lines: { key: string; description: string; quantity: number; unitPrice: number; amount: number }[] = [];
  (request.machines || []).forEach((machine, index) => {
    lines.push({
      key: `machine-${index}`,
      description: machineDescription(machine),
      quantity: machine.quantity,
      unitPrice: machine.unitPrice,
      amount: machine.totalPrice,
    });
  });
  (request.tools || []).forEach((tool, index) => {
    lines.push({
      key: `tool-${index}`,
      description: toolDescription(tool),
      quantity: tool.quantity,
      unitPrice: tool.unitPrice ?? 0,
      amount: tool.totalPrice ?? 0,
    });
  });

  return (
    <div
      className="bg-white dark:!bg-white text-black dark:!text-black w-full p-6 sm:p-8 max-w-[210mm] mx-auto print:w-[210mm] print:max-w-[210mm] print:p-8 print:overflow-visible"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <LetterheadDocument
        documentTitle="PURCHASE ORDER"
        footerStyle="simple"
        className="print:p-0 dark:!bg-white dark:!text-black"
        logoPath={purchaseOrderPrintLogoPath(request.customerType)}
      >
        <div className="text-black dark:!text-black pt-1">
          <div className="grid grid-cols-[3fr_2fr] gap-4 mb-4 text-sm">
            <div>
              <div className="flex mb-1">
                <span className="w-20 font-semibold text-gray-900 dark:!text-black">Customer</span>
                <span className="text-gray-900 dark:!text-black whitespace-pre-wrap flex-1">- {request.customerName}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold text-gray-900 dark:!text-black">Address</span>
                <span className="text-gray-900 dark:!text-black whitespace-pre-wrap flex-1">- {request.customerAddress || ''}</span>
              </div>
            </div>
            <div>
              <div className="flex mb-1">
                <span className="w-28 font-semibold text-gray-900 dark:!text-black">PO Number</span>
                <span className="text-gray-900 dark:!text-black">- {request.requestNumber}</span>
              </div>
              <div className="flex mb-1">
                <span className="w-28 font-semibold text-gray-900 dark:!text-black">Date of Issue</span>
                <span className="text-gray-900 dark:!text-black">- {dateOfIssue}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold text-gray-900 dark:!text-black">Period</span>
                <span className="text-gray-900 dark:!text-black">- {period}</span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-t border-b border-gray-800 py-2 text-left text-sm font-semibold text-gray-900 dark:!text-black pl-1">
                    Description
                  </th>
                  <th className="border-t border-b border-gray-800 py-2 text-center text-sm font-semibold text-gray-900 dark:!text-black">
                    Qty
                  </th>
                  <th className="border-t border-b border-gray-800 py-2 text-right text-sm font-semibold text-gray-900 dark:!text-black">
                    Unit Price
                  </th>
                  <th className="border-t border-b border-gray-800 py-2 text-right text-sm font-semibold text-gray-900 dark:!text-black pr-1">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="h-1"></td>
                </tr>
                {lines.map((line, index) => (
                  <tr key={line.key}>
                    <td className="py-0.5 text-sm text-gray-900 dark:!text-black pl-1 align-top pr-4">
                      {index + 1}. {line.description}
                    </td>
                    <td className="py-0.5 text-sm text-center text-gray-900 dark:!text-black align-top">
                      {line.quantity}
                    </td>
                    <td className="py-0.5 text-right text-sm text-gray-900 dark:!text-black align-top pr-4">
                      {formatMoney(line.unitPrice)}
                    </td>
                    <td className="py-0.5 text-right text-sm text-gray-900 dark:!text-black pr-1 align-top">
                      {formatMoney(line.amount)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className="h-1"></td>
                </tr>
                <tr>
                  <td colSpan={4} className="border-t border-gray-800"></td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 text-right text-sm font-semibold text-gray-900 dark:!text-black px-2">
                    Total
                  </td>
                  <td className="py-2 text-right text-sm font-semibold text-gray-900 dark:!text-black pr-1">
                    {formatMoney(request.totalAmount)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border-b-4 border-double border-gray-800"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 print:mt-6 flex flex-col sm:flex-row justify-between gap-6 sm:gap-8">
            <div className="w-full sm:w-48 print:w-40">
              <p className="text-xs text-gray-900 dark:!text-black font-semibold">Authorized By :</p>
              <div className="border-b border-dotted border-gray-800 mt-1 min-h-[1.5rem]" />
            </div>
            <div className="w-full sm:w-48 print:w-40 text-left sm:text-right">
              <p className="text-xs text-gray-900 dark:!text-black font-semibold">Received By :</p>
              <div className="border-b border-dotted border-gray-800 mt-1 min-h-[1.5rem]" />
            </div>
          </div>
        </div>
      </LetterheadDocument>
    </div>
  );
};
