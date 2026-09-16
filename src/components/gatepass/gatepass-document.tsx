'use client';

import React from 'react';
import { LETTERHEAD_COMPANY_INFO } from '@/src/components/letterhead/letterhead-document';
import { QRCodeSVG } from 'qrcode.react';

export interface GatepassDocumentProps {
  from: string;
  to: string;
  toAddress?: string;
  vehicleNumber: string;
  driverName: string;
  gatepassNo: string;
  dateOfIssue: string;
  returnable: boolean;
  entry: 'IN' | 'OUT';
  items: {
    description: string;
    status: string;
    serialNo: string;
    motorBoxNo: string;
  }[];
}

export function GatepassDocument({
  from,
  to,
  toAddress,
  vehicleNumber,
  driverName,
  gatepassNo,
  dateOfIssue,
  returnable,
  entry,
  items,
}: GatepassDocumentProps) {
  const info = LETTERHEAD_COMPANY_INFO;
  const logoPath = info.logoPath;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-CA'); // e.g. 2026-09-11
  };

  return (
    <div className="bg-white text-black font-sans w-[210mm] min-h-[297mm] mx-auto p-8 text-sm flex flex-col box-border">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoPath}
            alt="Needle Technologies"
            className="h-16 w-auto object-contain object-left grayscale"
          />
        </div>
        <div className="text-right flex-1 text-[15px] font-semibold text-gray-800">
          {info.tagline}
        </div>
      </div>

      <div className="border-b-2 border-gray-300 w-full mb-4"></div>

      <div className="text-center font-bold text-lg mb-6 tracking-wider">
        GATEPASS
      </div>

      {/* Grid Details */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-8">
        {/* Left Column */}
        <div className="flex flex-col gap-1">
          <div className="flex">
            <span className="w-20">FROM:</span>
            <span className="flex-1">{from}</span>
          </div>
          <div className="flex">
            <span className="w-20">TO:</span>
            <span className="flex-1">
              {to}
              {toAddress && (
                <>
                  <br />
                  {toAddress}
                </>
              )}
            </span>
          </div>
          <div className="flex mt-1">
            <span className="w-20">Vehicle:</span>
            <span className="flex-1">{vehicleNumber}</span>
          </div>
          <div className="flex">
            <span className="w-20">Driver:</span>
            <span className="flex-1">{driverName}</span>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-1 ml-auto w-[70%]">
          <div className="flex">
            <span className="w-32">Gatepass:</span>
            <span className="flex-1">{gatepassNo}</span>
          </div>
          <div className="flex">
            <span className="w-32">Date of Issue:</span>
            <span className="flex-1">{formatDate(dateOfIssue)}</span>
          </div>
          <div className="flex mt-1">
            <span className="w-32">Returnable</span>
            <span className="flex-1">{returnable ? 'YES' : 'NO'}</span>
          </div>
          <div className="flex">
            <span className="w-32">Entry</span>
            <span className="flex-1">{entry}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 flex flex-col mb-4">
        <table className="w-full border-collapse flex-1 flex flex-col border-t-2 border-b-2 border-gray-300">
          <thead className="w-full table table-fixed">
            <tr className="border-b border-gray-300">
              <th className="p-2 py-3 text-left w-[50%] font-bold text-[13px]">Description</th>
              <th className="p-2 py-3 text-left w-[15%] font-bold text-[13px]">Status</th>
              <th className="p-2 py-3 text-left w-[15%] font-bold text-[13px]">Serial No</th>
              <th className="p-2 py-3 text-left w-[20%] font-bold text-[13px]">Motor / Box No</th>
            </tr>
          </thead>
          <tbody className="w-full table table-fixed flex-1 pt-2">
            {items.map((item, index) => (
              <tr key={index} className="align-top h-8 text-[12px]">
                <td className="p-2 text-left whitespace-pre-wrap leading-tight text-gray-700 uppercase">
                  {index + 1}. {item.description}
                </td>
                <td className="p-2 text-left text-gray-700 uppercase">{item.status}</td>
                <td className="p-2 text-left text-gray-700 uppercase">{item.serialNo}</td>
                <td className="p-2 text-left text-gray-700 uppercase">{item.motorBoxNo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <div className="mt-16 mb-16 flex justify-between px-2 text-[13px] text-gray-800">
        <div className="flex flex-col gap-1 items-start">
          <span className="w-64 border-b border-dotted border-gray-500 inline-block mb-1"></span>
          <span>Issued By</span>
        </div>
        <div className="flex flex-col gap-1 items-end text-right">
          <span className="w-64 border-b border-dotted border-gray-500 inline-block mb-1"></span>
          <span>Received By</span>
        </div>
      </div>

      {/* Footer Details */}
      <div className="mt-auto relative">
        <div className="absolute bottom-0 left-0 border border-gray-200 p-1.5 bg-white rounded-md flex flex-col items-center">
          <QRCodeSVG value={gatepassNo} size={70} />
          <span className="text-[8px] text-gray-500 mt-1 uppercase font-semibold">Scan QR</span>
        </div>
        <div className="text-center pl-24">
          <div className="text-[10px] text-gray-500 tracking-wider mb-6 leading-relaxed max-w-4xl mx-auto uppercase">
            {info.importerInfo}
          </div>
          
          <div className="border-t border-gray-300 pt-3">
            <div className="text-[11px] text-gray-600 space-y-1">
              {info.address}, Tel: {info.telephone.join(', ')} Fax: {info.fax}, Email: {info.email}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
