'use client';

import React from 'react';

/** Company information - single source of truth for Needle Technologies letterhead */
export const LETTERHEAD_COMPANY_INFO = {
  fullName: 'NEEDLE TECHNOLOGIES COMPANY (PVT) LTD',
  brandName: 'NEEDLE TECHNOLOGIES',
  tagline: 'Supplier of Industrial Sewing Machines and Accessories',
  address: 'No. 137M, Colombo Road, Biyagama',
  telephone: ['011-2488735', '011-5737711', '011-5737712'],
  fax: '011-2487623',
  hotline: '077-7615289',
  email: 'needletec@sltnet.lk',
  tinNo: '114719676',
  vatNo: '114719676-7000',
  chequePayableTo: 'Needle Technologies',
  importerInfo:
    'IMPORTERS & DISTRIBUTORS OF SPARE PARTS & ATTACHMENTS FOR: JUKI, SINGER, KANSAI, BROTHER, SUNSTAR, EASTMAN, CUTTING PEGASUS & RECECINNUSTRIAL SEWING MACHINES, NAQMO IRONS, ORGAN & ORANGE NEEDLES.',
  logoPath: '/logo.jpg',
} as const;

export type FooterStyle = 'simple' | 'full';

export interface LetterheadDocumentProps {
  /** Content to render between header and footer */
  children?: React.ReactNode;
  /** Optional document title (e.g. TAX INVOICE, GATEPASS, HIRING MACHINE AGREEMENT) */
  documentTitle?: string;
  /** Footer style: 'simple' = address, tel, fax, email only (Hiring Agreement); 'full' = cheque + importer + contact */
  footerStyle?: FooterStyle;
  /** @deprecated Use footerStyle='full' instead */
  showChequeInstructions?: boolean;
  /** Additional footer content above the standard footer */
  footerContent?: React.ReactNode;
  /** Custom class name for the container */
  className?: string;
}

/**
 * Reusable letterhead document component matching Needle Technologies'
 * Gatepass, Normal Invoice, Hiring Machine Agreement, and Tax Invoice designs.
 * Layout: Logo (top-left) | Tagline (right, same row) | Horizontal line
 */
export function LetterheadDocument({
  children,
  documentTitle,
  footerStyle = 'simple',
  showChequeInstructions,
  footerContent,
  className = '',
}: LetterheadDocumentProps) {
  const info = LETTERHEAD_COMPANY_INFO;
  const useFullFooter = footerStyle === 'full' || showChequeInstructions;

  return (
    <div
      className={`bg-white text-black font-sans ${className}`}
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Header - Logo top-left, Tagline to the right (matches Gatepass, Invoice, Hiring Agreement) */}
      <div className="mb-6 print:mb-4">
        <div className="flex flex-row items-center justify-between gap-4">
          {/* Logo - top-left corner (img for reliable print) */}
          <div className="flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={info.logoPath}
              alt="Needle Technologies"
              className="h-12 w-auto sm:h-14 print:h-12 object-contain object-left grayscale"
            />
          </div>
          {/* Tagline - to the right of logo, horizontally aligned */}
          <p className="text-sm text-gray-700 print:text-xs text-right flex-1 leading-tight">
            {info.tagline}
          </p>
        </div>

        {/* Separator line - below logo and tagline */}
        <div className="border-b border-gray-800 mt-3 mb-4" />

        {/* Document title (e.g. GATEPASS, INVOICE, HIRING MACHINE AGREEMENT) */}
        {documentTitle && (
          <div className="text-center mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 uppercase tracking-tight">
              {documentTitle}
            </h2>
          </div>
        )}
      </div>

      {/* Content area */}
      {children && <div className="mb-6 print:mb-4">{children}</div>}

      {/* Footer content (e.g. signatures) */}
      {footerContent && <div className="mb-6 print:mb-4">{footerContent}</div>}

      {/* Footer - simple: address, tel/fax, email (Hiring Agreement); full: + cheque + importer */}
      <div className="border-t border-gray-300 pt-4 mt-6 print:mt-4">
        {useFullFooter && (
          <>
            <p className="text-sm text-gray-700 text-center mb-3 print:text-xs">
              All Cheques should be drawn in favor of &quot;{info.chequePayableTo}&quot;
            </p>
            <div className="text-[10px] sm:text-xs text-gray-700 text-center mb-2 px-2 print:text-[10px] leading-tight">
              {info.importerInfo}
            </div>
          </>
        )}
        <div className="text-xs text-gray-700 text-center space-y-1 px-2 print:text-xs">
          <div>{info.address}</div>
          <div>Tel: {info.telephone.map((t) => t.replace(/-/g, '')).join(', ')} Fax: 2487623</div>
          <div>Email: {info.email}</div>
        </div>
      </div>
    </div>
  );
}
