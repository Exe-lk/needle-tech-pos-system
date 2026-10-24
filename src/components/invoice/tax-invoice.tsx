'use client';

import React from 'react';
import { amountInWords } from '@/lib/amount-in-words';
import { LETTERHEAD_COMPANY_INFO } from '@/src/components/letterhead/letterhead-document';

const TAX_INVOICE_SUPPLIER = {
  name: 'Needle Technologies Company (Pvt) Ltd',
  address: 'No. 137/M, Colombo Road, Biyagama',
  telephone: '011 2488735 / 076 3480393-6',
  email: 'needletec@sltnet.lk',
  tin: '114719676-7000',
  chequePayee: 'Needle Technologies Company (Pvt) Ltd',
  bankDetails: 'A/C 1420027865, Commercial Bank, Kaduwela.',
} as const;

const MIN_LINE_ROWS = 12;
const COL_WIDTHS = ['w-[16%]', 'w-[42%]', 'w-[14%]', 'w-[8%]', 'w-[20%]'] as const;

export interface TaxInvoiceProps {
  invoiceNumber: string;
  invoiceDate: string;
  periodFrom: string;
  periodTo: string;
  purchaseOrderNumber?: string;
  purchaserTin?: string;
  customerName: string;
  customerAddress: string;
  customerPhone?: string;
  customerEmail?: string;
  placeOfSupply?: string;
  items: {
    serialNo: string;
    description: string;
    rate: number;
    qty: number;
    amountExcludingVat: number;
  }[];
  totalValueExcludingVat: number;
  vatPercentage: number;
  vatAmount: number;
  totalAmountIncludingVat: number;
}

function formatMoney(value: number) {
  return value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function TaxInvoice({
  invoiceNumber,
  invoiceDate,
  periodFrom,
  periodTo,
  purchaseOrderNumber = '',
  purchaserTin = '',
  customerName,
  customerAddress,
  customerPhone = '',
  customerEmail = '',
  placeOfSupply = '',
  items,
  totalValueExcludingVat,
  vatPercentage,
  vatAmount,
  totalAmountIncludingVat,
}: TaxInvoiceProps) {
  const logoPath = LETTERHEAD_COMPANY_INFO.logoPath;
  const emptyRowCount = Math.max(0, MIN_LINE_ROWS - items.length);
  const totalInWords = amountInWords(totalAmountIncludingVat);

  return (
    <div className="bg-white text-black font-sans w-[210mm] min-h-[297mm] mx-auto px-8 py-6 text-[12px] flex flex-col box-border">
      <div className="relative mb-4 min-h-[52px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoPath}
          alt="Needle Technologies"
          className="absolute left-0 top-0 h-12 w-auto object-contain object-left"
        />
        <h1 className="text-xl font-bold uppercase tracking-wide text-center pt-2">TAX INVOICE</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="border border-black px-2 py-1 font-semibold w-[40%]">Date of Invoice</td>
              <td className="border border-black px-2 py-1">{formatDate(invoiceDate)}</td>
            </tr>
          </tbody>
        </table>
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="border border-black px-2 py-1 font-semibold w-[40%]">Tax Invoice No</td>
              <td className="border border-black px-2 py-1">{invoiceNumber}</td>
            </tr>
          </tbody>
        </table>
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="border border-black px-2 py-1 font-semibold w-[40%]">Supplier&apos;s Tin</td>
              <td className="border border-black px-2 py-1">{TAX_INVOICE_SUPPLIER.tin}</td>
            </tr>
          </tbody>
        </table>
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="border border-black px-2 py-1 font-semibold w-[40%]">Purchaser&apos;s Tin</td>
              <td className="border border-black px-2 py-1">{purchaserTin}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="border border-black p-2 min-h-[108px] leading-snug">
          <div className="grid grid-cols-[110px_1fr] gap-x-1 gap-y-0.5">
            <span>Supplier&apos;s Name :</span>
            <span>{TAX_INVOICE_SUPPLIER.name}</span>
            <span>Address :</span>
            <span className="whitespace-pre-wrap">{TAX_INVOICE_SUPPLIER.address.replace(', ', ',\n')}</span>
            <span>Telephone No :</span>
            <span>{TAX_INVOICE_SUPPLIER.telephone}</span>
            <span>Email :</span>
            <span>{TAX_INVOICE_SUPPLIER.email}</span>
          </div>
        </div>
        <div className="border border-black p-2 min-h-[108px] leading-snug">
          <div className="grid grid-cols-[110px_1fr] gap-x-1 gap-y-0.5">
            <span>Purchaser&apos;s Name :</span>
            <span>{customerName}</span>
            <span>Address :</span>
            <span className="whitespace-pre-wrap">{customerAddress}</span>
            <span>Telephone No :</span>
            <span>{customerPhone}</span>
            <span>Email :</span>
            <span>{customerEmail}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2 items-start">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 py-1">
            <span className="font-semibold whitespace-nowrap">Period From</span>
            <span>{formatDate(periodFrom)}</span>
            <span className="font-semibold">To</span>
            <span>{formatDate(periodTo)}</span>
          </div>
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 font-semibold w-[40%]">Purchase Order No</td>
                <td className="border border-black px-2 py-1">{purchaseOrderNumber}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className="border border-black px-2 py-1 font-semibold">Place of Supply</td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-3 min-h-[42px] align-top">{placeOfSupply}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <table className="w-full border-collapse table-fixed flex-1">
        <thead>
          <tr>
            <th className={`border border-black px-1 py-1 text-center font-semibold text-[11px] ${COL_WIDTHS[0]}`}>Serial No</th>
            <th className={`border border-black px-1 py-1 text-center font-semibold text-[11px] ${COL_WIDTHS[1]}`}>Description of Goods or Services</th>
            <th className={`border border-black px-1 py-1 text-center font-semibold text-[11px] ${COL_WIDTHS[2]}`}>Rate</th>
            <th className={`border border-black px-1 py-1 text-center font-semibold text-[11px] ${COL_WIDTHS[3]}`}>Qty</th>
            <th className={`border border-black px-1 py-1 text-center font-semibold text-[11px] ${COL_WIDTHS[4]}`}>Amount Excluding VAT (LKR)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="align-top">
              <td className={`border-x border-black px-2 py-1 text-left text-[11px] ${COL_WIDTHS[0]}`}>{item.serialNo}</td>
              <td className={`border-x border-black px-2 py-1 text-left text-[11px] whitespace-pre-wrap leading-tight ${COL_WIDTHS[1]}`}>{item.description}</td>
              <td className={`border-x border-black px-2 py-1 text-right text-[11px] ${COL_WIDTHS[2]}`}>{formatMoney(item.rate)}</td>
              <td className={`border-x border-black px-2 py-1 text-center text-[11px] ${COL_WIDTHS[3]}`}>{item.qty}</td>
              <td className={`border-x border-black px-2 py-1 text-right text-[11px] ${COL_WIDTHS[4]}`}>{formatMoney(item.amountExcludingVat)}</td>
            </tr>
          ))}
          {Array.from({ length: emptyRowCount }, (_, index) => (
            <tr key={`empty-${index}`}>
              <td className={`border-x border-black h-7 ${COL_WIDTHS[0]}`}>&nbsp;</td>
              <td className={`border-x border-black ${COL_WIDTHS[1]}`}></td>
              <td className={`border-x border-black ${COL_WIDTHS[2]}`}></td>
              <td className={`border-x border-black ${COL_WIDTHS[3]}`}></td>
              <td className={`border-x border-black ${COL_WIDTHS[4]}`}></td>
            </tr>
          ))}
          <tr>
            <td className={`border-x border-b border-black h-8 ${COL_WIDTHS[0]}`}></td>
            <td className={`border-x border-b border-black ${COL_WIDTHS[1]}`}></td>
            <td className={`border-x border-b border-black ${COL_WIDTHS[2]}`}></td>
            <td className={`border-x border-b border-black ${COL_WIDTHS[3]}`}></td>
            <td className={`border-x border-b border-black ${COL_WIDTHS[4]}`}></td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="border border-black px-2 py-1 font-semibold">Total Value of Supply</td>
            <td className="border border-black px-2 py-1 text-right">{formatMoney(totalValueExcludingVat)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="border border-black px-2 py-1 font-semibold">VAT Amount ({vatPercentage.toFixed(1)}%)</td>
            <td className="border border-black px-2 py-1 text-right">{formatMoney(vatAmount)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="border border-black px-2 py-1 font-semibold">Total Amount Including VAT</td>
            <td className="border border-black px-2 py-1 text-right font-semibold">{formatMoney(totalAmountIncludingVat)}</td>
          </tr>
        </tfoot>
      </table>

      <table className="w-full border-collapse mt-2">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-2">
              <span className="font-semibold">Total Amount in Words : </span>
              {totalInWords}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 text-[11px] leading-relaxed">
        <p>All Cheques to be drawn in favour of &quot; {TAX_INVOICE_SUPPLIER.chequePayee} &quot;</p>
        <p className="font-semibold mt-2">Bank Details:</p>
        <p>{TAX_INVOICE_SUPPLIER.bankDetails}</p>
        <p>Kindly mention your invoice number for the reference.</p>
      </div>

      <div className="mt-10 mb-2 flex justify-between text-[12px]">
        <span>Authorized By:</span>
        <span className="pr-16">Received By:</span>
      </div>
    </div>
  );
}
