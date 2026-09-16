'use client';

import React from 'react';
import { LETTERHEAD_COMPANY_INFO } from '@/src/components/letterhead/letterhead-document';

export interface TaxInvoiceProps {
  invoiceNumber: string;
  invoiceDate: string;
  periodFrom: string;
  periodTo: string;
  purchaseOrderNumber?: string;
  purchaserTin?: string;
  purchaserVat?: string;
  customerName: string;
  customerAddress: string;
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

export function TaxInvoice({
  invoiceNumber,
  invoiceDate,
  periodFrom,
  periodTo,
  purchaseOrderNumber = '',
  purchaserTin = '',
  purchaserVat = '',
  customerName,
  customerAddress,
  placeOfSupply = '',
  items,
  totalValueExcludingVat,
  vatPercentage,
  vatAmount,
  totalAmountIncludingVat,
}: TaxInvoiceProps) {
  const info = LETTERHEAD_COMPANY_INFO;
  const logoPath = info.logoPath;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="bg-white text-black font-sans w-[210mm] min-h-[297mm] mx-auto p-8 text-sm flex flex-col box-border">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4 w-1/3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoPath}
            alt="Needle Technologies"
            className="h-16 w-auto object-contain object-left"
          />
        </div>
        <div className="w-1/3 text-center mt-4">
          <h1 className="text-2xl font-bold uppercase tracking-wide">TAX INVOICE</h1>
        </div>
        <div className="w-1/3 text-right mt-4 whitespace-nowrap">
          <span className="font-bold mr-2">Tax Invoice No :</span>
          <span>{invoiceNumber}</span>
        </div>
      </div>

      {/* Grid Details */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
        {/* Left Column */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center pr-8">
            <span className="font-bold">Date of Invoice :</span>
            <span>{formatDate(invoiceDate)}</span>
          </div>
          
          <table className="w-full border-collapse border border-gray-400">
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 font-bold w-1/2 bg-gray-50">Supplier's TIN</td>
                <td className="border border-gray-400 p-2">{info.tinNo}</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 font-bold bg-gray-50">Supplier's VAT</td>
                <td className="border border-gray-400 p-2">{info.vatNo}</td>
              </tr>
            </tbody>
          </table>

          <div className="border border-gray-400 flex flex-col h-[130px]">
            <div className="bg-gray-50 font-bold p-2 border-b border-gray-400">Supplier's Name & Address</div>
            <div className="p-2 whitespace-pre-wrap flex-1 text-[13px] leading-tight">
              {info.fullName}<br />
              {info.address.split(',').join(',\n')}<br />
              <br />
              Tel&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {info.telephone[0]} / {info.hotline}<br />
              Email : {info.email}
            </div>
          </div>

          <div className="flex items-center text-sm gap-2 mt-2">
            <span className="font-bold min-w-[90px]">Period From :</span>
            <span>{formatDate(periodFrom)}</span>
            <span className="font-bold mx-2">To</span>
            <span>{formatDate(periodTo)}</span>
          </div>

          <table className="w-full border-collapse border border-gray-400 mt-2">
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 font-bold w-2/5 bg-gray-50">Purchase Order No</td>
                <td className="border border-gray-400 p-2">{purchaseOrderNumber}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4 mt-[34px]">
          <table className="w-full border-collapse border border-gray-400">
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 font-bold w-1/2 bg-gray-50">Purchaser's TIN</td>
                <td className="border border-gray-400 p-2">{purchaserTin}</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 font-bold bg-gray-50">Purchaser's VAT</td>
                <td className="border border-gray-400 p-2">{purchaserVat}</td>
              </tr>
            </tbody>
          </table>

          <div className="border border-gray-400 flex flex-col h-[130px]">
            <div className="bg-gray-50 font-bold p-2 border-b border-gray-400">Purchaser's Name & Address</div>
            <div className="p-2 whitespace-pre-wrap flex-1 text-[13px] leading-tight">
              {customerName}<br />
              {customerAddress}
            </div>
          </div>

          <div className="border border-gray-400 flex flex-col mt-[44px]">
            <div className="bg-gray-50 font-bold p-2 border-b border-gray-400">Place of Supply</div>
            <div className="p-2 h-[42px] flex items-center">{placeOfSupply || customerAddress.split(',').pop()?.trim()}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 flex flex-col mb-4 min-h-[300px]">
        <table className="w-full border-collapse border-t border-l border-r border-gray-400 flex-1 flex flex-col">
          <thead className="bg-gray-50 w-full table table-fixed">
            <tr>
              <th className="border border-gray-400 p-2 text-center w-[15%] font-bold text-xs">Serial No</th>
              <th className="border border-gray-400 p-2 text-center w-[45%] font-bold text-xs">Description of Goods or Services</th>
              <th className="border border-gray-400 p-2 text-center w-[15%] font-bold text-xs">Rate</th>
              <th className="border border-gray-400 p-2 text-center w-[5%] font-bold text-xs">Qty</th>
              <th className="border border-gray-400 p-2 text-center w-[20%] font-bold text-xs">Amount Excluding VAT</th>
            </tr>
          </thead>
          <tbody className="w-full table table-fixed flex-1 border-b border-gray-400 relative">
            <div className="absolute inset-0">
              <table className="w-full h-full table-fixed">
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="align-top h-8">
                      <td className="border-r border-gray-400 p-2 text-left text-xs w-[15%]">{item.serialNo}</td>
                      <td className="border-r border-gray-400 p-2 text-left whitespace-pre-wrap text-[11px] w-[45%] leading-tight">{item.description}</td>
                      <td className="border-r border-gray-400 p-2 text-right text-xs w-[15%]">{item.rate.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="border-r border-gray-400 p-2 text-center text-xs w-[5%]">{item.qty}</td>
                      <td className="p-2 text-right text-xs w-[20%]">{item.amountExcludingVat.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {/* Fill empty space */}
                  <tr className="align-top h-full">
                    <td className="border-r border-gray-400 p-2 w-[15%]"></td>
                    <td className="border-r border-gray-400 p-2 w-[45%]"></td>
                    <td className="border-r border-gray-400 p-2 w-[15%]"></td>
                    <td className="border-r border-gray-400 p-2 w-[5%]"></td>
                    <td className="p-2 w-[20%]"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </tbody>
          <tfoot className="w-full table table-fixed">
            <tr>
              <td colSpan={4} className="border border-gray-400 p-2 pl-4 text-left font-bold w-[80%] text-xs">Total Value of Supply</td>
              <td className="border border-gray-400 p-2 text-right w-[20%] text-xs">Rs.{totalValueExcludingVat.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-gray-400 p-2 pl-4 text-left font-bold w-[80%] text-xs">VAT Amount ({vatPercentage.toFixed(1)}%)</td>
              <td className="border border-gray-400 p-2 text-right w-[20%] text-xs">Rs.{vatAmount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td colSpan={4} className="border border-gray-400 p-2 pl-4 text-left font-bold w-[80%] text-xs">Total Amount including VAT</td>
              <td className="border border-gray-400 p-2 text-right font-bold w-[20%] text-xs">Rs.{totalAmountIncludingVat.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer Instructions */}
      <div className="mt-auto text-xs space-y-1 text-gray-700">
        <p>All cheques to be drawn in favour of <span className="font-bold text-black">" Needle Technologies Company (Pvt) Ltd "</span></p>
        <p className="font-bold text-black pt-2">Bank Details :</p>
        <p>A/C 1420027865, Commercial Bank, Kaduwela.</p>
        <p>Kindly mention your invoice number for the reference.</p>
      </div>

      {/* Signatures */}
      <div className="mt-12 mb-4 flex justify-between px-4 text-xs font-bold text-gray-800">
        <div className="flex gap-2 items-end">
          <span>Authorized By :</span>
          <span className="w-48 border-b border-dotted border-gray-500 inline-block"></span>
        </div>
        <div className="flex gap-2 items-end">
          <span>Received By :</span>
          <span className="w-48 border-b border-dotted border-gray-500 inline-block"></span>
        </div>
      </div>
    </div>
  );
}
