import React from 'react';
import { LetterheadDocument } from '@/src/components/letterhead/letterhead-document';
import type { RentalAgreementInfo } from '@/app/rental-agreement/page';

interface Props {
  agreementInfo: RentalAgreementInfo;
}

export const HiringMachineAgreementPrint: React.FC<Props> = ({ agreementInfo }) => {
  const totalMonthlyRent = agreementInfo.machines.reduce((sum, machine) => sum + machine.monthlyRent, 0);
  const dateOfIssue = agreementInfo.startDate
    ? new Date(agreementInfo.startDate).toLocaleDateString('en-LK', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    : 'TBD';

  return (
    <div
      className="bg-white dark:!bg-white text-black dark:!text-black w-full p-6 sm:p-8 max-w-[210mm] mx-auto print:w-[210mm] print:max-w-[210mm] print:p-8 print:overflow-visible"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <LetterheadDocument
        documentTitle="HIRING MACHINE AGREEMENT"
        className="print:p-0 dark:!bg-white dark:!text-black"
      >
        <div className="text-black dark:!text-black pt-4">
          {/* Header section (Customer and Agreement info) */}
          <div className="grid grid-cols-[3fr_2fr] gap-4 mb-8 text-sm">
            <div>
              <div className="flex mb-1">
                <span className="w-20 font-semibold text-gray-900 dark:!text-black">Customer</span>
                <span className="text-gray-900 dark:!text-black whitespace-pre-wrap flex-1">- {agreementInfo.customerName}</span>
              </div>
              <div className="flex">
                <span className="w-20 font-semibold text-gray-900 dark:!text-black">Address</span>
                <span className="text-gray-900 dark:!text-black whitespace-pre-wrap flex-1">- {agreementInfo.customerAddress || ''}</span>
              </div>
            </div>
            <div>
              <div className="flex mb-1">
                <span className="w-28 font-semibold text-gray-900 dark:!text-black">Agreement</span>
                <span className="text-gray-900 dark:!text-black">- {agreementInfo.agreementNo || ''}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-semibold text-gray-900 dark:!text-black">Date of Issue</span>
                <span className="text-gray-900 dark:!text-black">- {dateOfIssue}</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-t border-b border-gray-800 py-2 text-left text-sm font-semibold text-gray-900 dark:!text-black pl-1">
                    Model - Description
                  </th>
                  <th className="border-t border-b border-gray-800 py-2 text-left text-sm font-semibold text-gray-900 dark:!text-black">
                    Serial No
                  </th>
                  <th className="border-t border-b border-gray-800 py-2 text-left text-sm font-semibold text-gray-900 dark:!text-black">
                    Motor / Box No
                  </th>
                  <th className="border-t border-b border-gray-800 py-2 text-right text-sm font-semibold text-gray-900 dark:!text-black pr-1">
                    Monthly Rental
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="h-4"></td>
                </tr>
                {agreementInfo.machines.map((machine, index) => (
                  <tr key={index}>
                    <td className="py-1.5 text-sm text-gray-900 dark:!text-black pl-1 align-top pr-4">
                      {index + 1}. {machine.machineDescription}
                    </td>
                    <td className="py-1.5 text-sm text-gray-900 dark:!text-black align-top pr-4">
                      {machine.serialNo}
                    </td>
                    <td className="py-1.5 text-sm text-gray-900 dark:!text-black align-top pr-4">
                      {machine.motorBoxNo || ''}
                    </td>
                    <td className="py-1.5 text-right text-sm text-gray-900 dark:!text-black pr-1 align-top">
                      {machine.monthlyRent.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={4} className="h-4"></td>
                </tr>
                <tr>
                  <td colSpan={4} className="border-t border-gray-800"></td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 text-right text-sm font-semibold text-gray-900 dark:!text-black px-2">
                    Total
                  </td>
                  <td className="py-2 text-right text-sm font-semibold text-gray-900 dark:!text-black pr-1">
                    {totalMonthlyRent.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td colSpan={4} className="border-b-4 border-double border-gray-800"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Additional Parts */}
          <div className="mb-12">
            <span className="text-sm font-semibold text-gray-900 dark:!text-black">Additional Parts</span>
            {agreementInfo.additionalParts && (
              <div className="text-sm text-gray-900 dark:!text-black mt-2">
                {agreementInfo.additionalParts}
              </div>
            )}
          </div>

          {/* Terms & Conditions */}
          <div className="mb-10">
            <h3 className="text-sm font-semibold text-gray-900 dark:!text-black mb-2">Terms & Conditions</h3>
            <div className="space-y-4 text-sm text-gray-900 dark:!text-black text-justify leading-relaxed">
              <p>
                (01) You have to be paid in cash double monthly rental fee on the date of rent machine issues. The excess payment would be immediately return to you as and when you returned the hired machine within the stipulated period.
              </p>
              <p>(02) Above payment has to be paid 05 days prior to next month.</p>
              <p>(03) Customer has to take total responsibility with regard to security of the machine.</p>
              <p>(04) Both the parties can withdraw or return the machine with one month prior notice.</p>
              <p>(05) Company will examine the machine at the point of returning and will release due security deposit.</p>
            </div>
          </div>

          {/* Signature block */}
          <div className="grid grid-cols-2 gap-8 mb-12 mt-24">
            <div className="flex flex-col justify-end">
              <div className="text-sm text-gray-900 dark:!text-black mb-16">
                Customer Signature
              </div>
              <div className="border-t border-dotted border-gray-600 pt-1 text-sm text-gray-900 dark:!text-black w-64">
                (Agreed upon the terms & Conditions)
              </div>
            </div>
            <div className="space-y-5 pt-8">
              <div className="flex items-end">
                <span className="w-24 text-sm text-gray-900 dark:!text-black">ID NO :</span>
                <span className="flex-1 border-b border-dotted border-gray-600"></span>
              </div>
              <div className="flex items-end">
                <span className="w-24 text-sm text-gray-900 dark:!text-black">Full Name :</span>
                <span className="flex-1 border-b border-dotted border-gray-600"></span>
              </div>
              <div className="flex items-end">
                <span className="w-24 text-sm text-gray-900 dark:!text-black">Date :</span>
                <span className="flex-1 border-b border-dotted border-gray-600"></span>
              </div>
            </div>
          </div>
          
          {/* QR Code Placeholder */}
          <div className="w-24 h-24 border border-gray-400 flex items-center justify-center text-gray-500 font-handwriting text-2xl mt-12" style={{fontFamily: 'cursive'}}>
            QR
          </div>
        </div>
      </LetterheadDocument>
    </div>
  );
};
