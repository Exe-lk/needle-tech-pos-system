'use client';

import React, { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import UpdateForm from '@/src/components/form-popup/update';
import { Eye, Pencil, X, Plus, Trash2, Printer, FileText, ExternalLink, QrCode, Truck, CheckCircle2, AlertCircle, Loader2, ChevronDown, Check, ArrowLeft } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import QRScannerComponent from '@/src/components/qr-scanner';
import { LetterheadDocument, LETTERHEAD_COMPANY_INFO } from '@/src/components/letterhead/letterhead-document';

type RentalStatus = 'Active' | 'Completed' | 'Cancelled' | 'Pending';

// Expected machine category (brand, model, type, quantity) for pending agreements
interface ExpectedMachineCategory {
  id: string;
  brand: string;
  model: string;
  type: string;
  quantity: number;
}

interface RentalAgreement {
  id: string;
  agreementNo: string;
  customerNo: string;
  customerName: string;
  serialNo: string;
  startDate: string;
  endDate: string | null;
  monthlyRent: number;
  outstanding: number;
  status: RentalStatus;
  purchaseRequestId?: string;
  purchaseRequestNumber?: string;
  expectedMachines?: number;
  addedMachines?: number;
  /** When status is Pending, machine assignment is by category (e.g. 10x Model A, 5x Model B). */
  expectedMachineCategories?: ExpectedMachineCategory[];
}

// Machine detail interface for agreement
interface MachineDetail {
  serialNo: string;
  machineBrand: string;
  machineModel: string;
  machineType: string;
  machineDescription: string;
  motorBoxNo?: string;
  monthlyRent: number;
}

// Rental Agreement Detail Data Types
interface RentalAgreementInfo {
  id: string;
  agreementNo: string;
  customerNo: string;
  customerName: string;
  customerAddress?: string;
  machines: MachineDetail[];
  startDate: string;
  endDate: string | null;
  monthlyRent: number;
  outstanding: number;
  status: RentalStatus;
  totalAmount: number;
  paidAmount: number;
  deposit: number;
  notes?: string;
  additionalParts?: string;
  customerIdNo?: string;
  customerFullName?: string;
  customerSignatureDate?: string;
  customerSignature?: string;
  purchaseRequestId?: string;
  purchaseRequestNumber?: string;
  expectedMachines?: number;
  addedMachines?: number;
}

// GatePass interfaces (from gatepass page)
interface GatePassItem {
  id: string;
  description: string;
  status: string;
  serialNo: string;
  motorBoxNo: string;
}

interface GatePass {
  id: number;
  gatepassNo: string;
  agreementReference: string;
  dateOfIssue: string;
  returnable: boolean;
  entry: 'IN' | 'OUT';
  from: string;
  to: string;
  toAddress: string;
  vehicleNumber: string;
  driverName: string;
  items: GatePassItem[];
  issuedBy?: string;
  receivedBy?: string;
}

const API_BASE = '/api/v1';

// Backend API rental shape (from GET /rentals and GET /rentals/[id])
interface ApiRentalMachine {
  machineId: string;
  dailyRate: number | string;
  quantity: number;
  machine: {
    serialNumber: string;
    boxNumber: string | null;
    brand: { name: string } | null;
    model: { name: string } | null;
    type: { name: string } | null;
  };
}
interface ApiRental {
  id: string;
  agreementNumber: string;
  customerId: string;
  purchaseOrderId: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  expectedEndDate: string;
  actualEndDate: string | null;
  subtotal: number | string;
  vatAmount: number | string;
  total: number | string;
  balance: number | string;
  paidAmount: number | string;
  depositTotal: number | string;
  customer: {
    id: string;
    code: string;
    name: string;
    billingAddressLine1?: string | null;
    billingAddressLine2?: string | null;
    billingCity?: string | null;
    billingRegion?: string | null;
    billingPostalCode?: string | null;
    billingCountry?: string | null;
    phones?: string[];
    emails?: string[];
  };
  purchaseOrder?: { id: string; requestNumber: string } | null;
  machines: ApiRentalMachine[];
}

function mapApiRentalToAgreement(r: ApiRental): RentalAgreement {
  const start = new Date(r.startDate);
  const end = new Date(r.expectedEndDate);
  const months = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const total = Number(r.total);
  const balance = Number(r.balance);
  const statusMap: Record<string, RentalStatus> = {
    ACTIVE: 'Active',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  const firstSerial = r.machines?.[0]?.machine?.serialNumber ?? '';
  return {
    id: r.id,
    agreementNo: r.agreementNumber,
    customerNo: r.customerId,
    customerName: r.customer.name,
    serialNo: firstSerial,
    startDate: r.startDate,
    endDate: r.expectedEndDate,
    monthlyRent: months > 0 ? total / months : total,
    outstanding: balance,
    status: statusMap[r.status] ?? 'Active',
    purchaseRequestId: r.purchaseOrder?.id,
    purchaseRequestNumber: r.purchaseOrder?.requestNumber,
    expectedMachines: r.machines?.length ?? 0,
    addedMachines: r.machines?.length ?? 0,
  };
}

function mapApiRentalToAgreementInfo(r: ApiRental): RentalAgreementInfo {
  const start = new Date(r.startDate);
  const end = new Date(r.expectedEndDate);
  const months = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const total = Number(r.total);
  const addressParts = [
    r.customer.billingAddressLine1,
    r.customer.billingAddressLine2,
    r.customer.billingCity,
    r.customer.billingRegion,
    r.customer.billingPostalCode,
    r.customer.billingCountry,
  ].filter(Boolean) as string[];
  const machines: MachineDetail[] = (r.machines ?? []).map((rm) => {
    const brand = rm.machine.brand?.name ?? '';
    const model = rm.machine.model?.name ?? '';
    const type = rm.machine.type?.name ?? '';
    const desc = `${brand} ${model}${type ? ` - ${type}` : ''}`.trim() || 'Machine';
    const dailyRate = Number(rm.dailyRate);
    return {
      serialNo: rm.machine.serialNumber,
      machineBrand: brand,
      machineModel: model,
      machineType: type,
      machineDescription: desc.toUpperCase(),
      motorBoxNo: rm.machine.boxNumber ?? undefined,
      monthlyRent: dailyRate * 30,
    };
  });
  const statusMap: Record<string, RentalStatus> = {
    ACTIVE: 'Active',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return {
    id: r.id,
    agreementNo: r.agreementNumber,
    customerNo: r.customerId,
    customerName: r.customer.name,
    customerAddress: addressParts.join(', '),
    machines,
    startDate: r.startDate,
    endDate: r.expectedEndDate,
    monthlyRent: months > 0 ? total / months : total,
    outstanding: Number(r.balance),
    status: statusMap[r.status] ?? 'Active',
    totalAmount: total,
    paidAmount: Number(r.paidAmount),
    deposit: Number(r.depositTotal),
    purchaseRequestId: r.purchaseOrder?.id,
    purchaseRequestNumber: r.purchaseOrder?.requestNumber,
    expectedMachines: r.machines?.length,
    addedMachines: r.machines?.length,
  };
}

// Machine interface for create form (matches print: one row per machine with serial/box/monthly rent)
interface MachineItem {
  id: string;
  brand: string;
  model: string;
  type: string;
  quantity: number;
  standardPrice: number;
  serialNo: string;
  motorBoxNo: string;
}

// Add-on interface for create form (add-ons are not associated with machines)
interface AddOnItem {
  id: string;
  addOnId: string;
  quantity: number;
  price: number;
}

// Machine interface for update form (adding machines to agreement)
interface MachineForAgreement {
  id: string;
  description: string;
  serialNumber: string;
  boxNumber: string;
  brandName?: string;
  modelName?: string;
  typeName?: string;
  scannedAt?: string;
  /** Index into expectedMachineCategories when scanning by category */
  categoryIndex?: number;
}

// Minimal invoice shape for auto-generated invoice from rental agreement (matches invoice page structure for localStorage)
interface AutoGeneratedInvoiceItem {
  id: string;
  itemCode: string;
  description: string;
  serialNumber?: string;
  brand: string;
  model: string;
  type: string;
  numberOfMachines: number;
  monthlyRentPerMachine: number;
  subtotal: number;
}
interface AutoGeneratedInvoice {
  invoiceNumber: string;
  customerName: string;
  customerAddress: string;
  vatTinNic: string;
  invoiceDate: string;
  periodFrom: string;
  periodTo: string;
  items: AutoGeneratedInvoiceItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  status: 'issued';
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  /** Optional class for the dropdown list (e.g. z-[100] when inside overflow container) */
  dropdownClassName?: string;
  /** When true, render dropdown in a portal so it is not clipped by overflow (e.g. in modals/tables) */
  usePortal?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  error,
  className = '',
  dropdownClassName = '',
  usePortal = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(term));
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = usePortal && dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(0);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, usePortal]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && dropdownRef.current && highlightedIndex >= 0) {
      const el = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  useLayoutEffect(() => {
    if (usePortal && isOpen && containerRef.current) {
      updateDropdownPosition();
      const onScrollOrResize = () => updateDropdownPosition();
      window.addEventListener('scroll', onScrollOrResize, true);
      window.addEventListener('resize', onScrollOrResize);
      return () => {
        window.removeEventListener('scroll', onScrollOrResize, true);
        window.removeEventListener('resize', onScrollOrResize);
      };
    }
  }, [isOpen, usePortal]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) handleSelect(filteredOptions[highlightedIndex].value);
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(0);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white cursor-pointer flex items-center justify-between ${
          error ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 dark:hover:border-indigo-500'} focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-indigo-500 transition-colors`}
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setHighlightedIndex(0); }}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            placeholder={placeholder}
            disabled={disabled}
          />
        ) : (
          <span className={`flex-1 ${!selectedOption ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </div>
      {isOpen && (!usePortal || dropdownPosition.width > 0) && (() => {
        const dropdownContent = (
          <div
            ref={dropdownRef}
            className={`z-[100] w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto ${dropdownClassName}`}
            style={usePortal ? {
              position: 'fixed',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              minWidth: 120,
            } : { position: 'absolute' as const }}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between ${
                    index === highlightedIndex ? 'bg-blue-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                  } ${option.value === value ? 'bg-blue-100 dark:bg-indigo-900/50' : ''}`}
                >
                  <span className="text-gray-900 dark:text-white">{option.label}</span>
                  {option.value === value && <Check className="w-4 h-4 text-blue-600 dark:text-indigo-400" />}
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">No options found</div>
            )}
          </div>
        );
        return usePortal && typeof document !== 'undefined'
          ? createPortal(dropdownContent, document.body)
          : dropdownContent;
      })()}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};

// Mock customer data
const mockCustomers = [
  { id: 'CUST-001', name: 'ABC Holdings (Pvt) Ltd', address: '123 Main Street, Colombo 05' },
  { id: 'CUST-002', name: 'John Perera', address: '456 Galle Road, Mount Lavinia' },
  { id: 'CUST-003', name: 'XYZ Engineering', address: '789 Kandy Road, Peradeniya' },
  { id: 'CUST-004', name: 'Kamal Silva', address: '321 Negombo Road, Wattala' },
  { id: 'CUST-005', name: 'Mega Constructions', address: '654 High Level Road, Maharagama' },
  { id: 'CUST-006', name: 'VIHANGA SHADE STRUCTURES', address: '317/2, NEW KANDY ROAD, BIYAGAMA' },
];

// Mock machine data
const mockMachineBrands = ['Brother', 'Singer', 'Janome', 'Juki', 'Pfaff', 'Bernina'];
const mockMachineModels = [
  { brand: 'Brother', models: ['XL2600i', 'SE600', 'CS6000i'] },
  { brand: 'Singer', models: ['Heavy Duty 4423', 'Buttonhole 160'] },
  { brand: 'Janome', models: ['HD3000', 'MB-4S'] },
  { brand: 'Juki', models: ['MO-654DE', 'LK-1903A-SS'] },
];
const mockMachineTypes = ['Industrial', 'Domestic', 'Embroidery', 'Overlock', 'Buttonhole', 'Other'];

// Mock add-ons data
const mockAddOns = [
  { id: 'ADDON-001', name: 'Thread Stand', price: 5000 },
  { id: 'ADDON-002', name: 'Extension Table', price: 8000 },
  { id: 'ADDON-003', name: 'Presser Foot Set', price: 3000 },
  { id: 'ADDON-004', name: 'Bobbin Case', price: 2000 },
  { id: 'ADDON-005', name: 'Needle Set', price: 1500 },
];

// Mock standard prices per machine type
const standardPrices: Record<string, number> = {
  Industrial: 50000,
  Domestic: 35000,
  Embroidery: 45000,
  Overlock: 40000,
  Buttonhole: 30000,
  Other: 35000,
};

// Mock rental agreement data (used only by getRentalAgreementInfoFromList fallback; API is primary)
const mockRentalAgreements: RentalAgreement[] = [
  {
    id: '1',
    agreementNo: 'RA24010001',
    customerNo: 'CUST-001',
    customerName: 'ABC Holdings (Pvt) Ltd',
    serialNo: 'SN-2024-002',
    startDate: '2024-01-15',
    endDate: '2024-04-15',
    monthlyRent: 50000,
    outstanding: 120000,
    status: 'Active',
    purchaseRequestId: '1',
    purchaseRequestNumber: 'PO24010001',
    expectedMachines: 2,
    addedMachines: 2,
  },
  {
    id: '2',
    agreementNo: 'RA24010002',
    customerNo: 'CUST-002',
    customerName: 'John Perera',
    serialNo: 'SN-2024-004',
    startDate: '2024-03-01',
    endDate: '2024-06-01',
    monthlyRent: 35000,
    outstanding: 70000,
    status: 'Pending',
    expectedMachines: 1,
    addedMachines: 0,
  },
  {
    id: '3',
    agreementNo: 'RA24010001',
    customerNo: 'CUST-003',
    customerName: 'XYZ Engineering',
    serialNo: 'SN-2024-001',
    startDate: '2024-01-10',
    endDate: '2024-02-10',
    monthlyRent: 45000,
    outstanding: 0,
    status: 'Completed',
  },
  {
    id: '4',
    agreementNo: 'RA24010004',
    customerNo: 'CUST-004',
    customerName: 'Kamal Silva',
    serialNo: 'SN-2024-003',
    startDate: '2024-02-20',
    endDate: null,
    monthlyRent: 40000,
    outstanding: 80000,
    status: 'Active',
  },
  {
    id: '5',
    agreementNo: 'RA24010005',
    customerNo: 'CUST-005',
    customerName: 'Mega Constructions',
    serialNo: 'SN-2024-005',
    startDate: '2024-04-01',
    endDate: '2024-07-01',
    monthlyRent: 60000,
    outstanding: 180000,
    status: 'Pending',
    purchaseRequestId: '3',
    purchaseRequestNumber: 'PO24010003',
    expectedMachines: 15,
    addedMachines: 0,
    expectedMachineCategories: [
      { id: 'cat-5-1', brand: 'Juki', model: 'Model A', type: 'Industrial', quantity: 10 },
      { id: 'cat-5-2', brand: 'Juki', model: 'Model B', type: 'Industrial', quantity: 5 },
    ],
  },
  {
    id: '6',
    agreementNo: 'RA24010006',
    customerNo: 'CUST-006',
    customerName: 'VIHANGA SHADE STRUCTURES',
    serialNo: '2LIDH01733',
    startDate: '2026-01-02',
    endDate: '2026-08-01',
    monthlyRent: 17000,
    outstanding: 0,
    status: 'Pending',
    expectedMachines: 1,
    expectedMachineCategories: [
      { id: 'cat-6-1', brand: 'Juki', model: 'LK-1903A-SS', type: 'Electronic Bar Tack Machine', quantity: 1 },
    ],
  },
];

/** Get expected machine categories for an agreement. Uses expectedMachineCategories if present; otherwise a single category from expectedMachines. */
function getExpectedCategories(agreement: RentalAgreement | null): ExpectedMachineCategory[] {
  if (!agreement) return [];
  const cats = agreement.expectedMachineCategories;
  if (cats && cats.length > 0) return cats;
  const total = agreement.expectedMachines ?? 0;
  if (total <= 0) return [];
  return [{ id: 'default', brand: '', model: 'Machine', type: '', quantity: total }];
}

// Get rental agreement detail from list (fallback when API detail not loaded); uses provided list for lookup.
const getRentalAgreementInfoFromList = (agreementId: string, agreementsList: RentalAgreement[]): RentalAgreementInfo | null => {
  const agreement = agreementsList.find((r) => r.id === agreementId);
  if (!agreement) return null;
  const customer = mockCustomers.find((c) => c.id === agreement.customerNo);

  if (agreementId === '6') {
    const machines: MachineDetail[] = [
      {
        serialNo: '2LIDH01733',
        machineBrand: 'Juki',
        machineModel: 'LK-1903A-SS',
        machineType: 'Electronic Bar Tack Machine',
        machineDescription: 'JUKI LK-1903A-SS - ELECTRONIC BAR TACK MACHINE',
        motorBoxNo: 'NMBDH01171',
        monthlyRent: 4250,
      },
      {
        serialNo: '2LIDH01734',
        machineBrand: 'Juki',
        machineModel: 'LK-1903A-SS',
        machineType: 'Electronic Bar Tack Machine',
        machineDescription: 'JUKI LK-1903A-SS - ELECTRONIC BAR TACK MACHINE',
        motorBoxNo: 'NMBDH01172',
        monthlyRent: 4250,
      },
      {
        serialNo: '2LIDH01735',
        machineBrand: 'Juki',
        machineModel: 'LK-1903A-SS',
        machineType: 'Electronic Bar Tack Machine',
        machineDescription: 'JUKI LK-1903A-SS - ELECTRONIC BAR TACK MACHINE',
        motorBoxNo: 'NMBDH01173',
        monthlyRent: 4250,
      },
      {
        serialNo: '2LIDH01736',
        machineBrand: 'Juki',
        machineModel: 'LK-1903A-SS',
        machineType: 'Electronic Bar Tack Machine',
        machineDescription: 'JUKI LK-1903A-SS - ELECTRONIC BAR TACK MACHINE',
        motorBoxNo: 'NMBDH01174',
        monthlyRent: 4250,
      },
    ];

    return {
      id: agreement?.id || '',
      agreementNo: agreement?.agreementNo || '',
      customerNo: agreement?.customerNo || '',
      customerName: agreement?.customerName || '',
      customerAddress: customer?.address || '',
      machines,
      startDate: agreement?.startDate || '',
      endDate: agreement?.endDate || null,
      monthlyRent: agreement?.monthlyRent || 0,
      outstanding: agreement?.outstanding || 0,
      status: agreement?.status || 'Active',
      totalAmount: (agreement?.monthlyRent || 0) * 3,
      paidAmount: (agreement?.monthlyRent || 0) * 1,
      deposit: (agreement?.monthlyRent || 0) * 2,
      notes: 'Regular maintenance required. Customer has good payment history.',
      additionalParts: 'Complete timeline',
      customerIdNo: '72348.961V',
      customerFullName: 'SURAJ PRANAWEERA',
      customerSignatureDate: '2026-01-02',
      customerSignature: 'SURAJ PRANAWEERA',
      purchaseRequestId: agreement?.purchaseRequestId,
      purchaseRequestNumber: agreement?.purchaseRequestNumber,
      expectedMachines: agreement?.expectedMachines,
      addedMachines: agreement?.addedMachines,
    };
  }

  const machines: MachineDetail[] = [
    {
      serialNo: 'SN-2024-001',
      machineBrand: 'Brother',
      machineModel: 'XL2600i',
      machineType: 'Domestic',
      machineDescription: 'BROTHER XL2600i - DOMESTIC SEWING MACHINE',
      motorBoxNo: 'BOX-2024-001',
      monthlyRent: (agreement?.monthlyRent || 0) / 4,
    },
    {
      serialNo: 'SN-2024-002',
      machineBrand: 'Brother',
      machineModel: 'XL2600i',
      machineType: 'Domestic',
      machineDescription: 'BROTHER XL2600i - DOMESTIC SEWING MACHINE',
      motorBoxNo: 'BOX-2024-002',
      monthlyRent: (agreement?.monthlyRent || 0) / 4,
    },
    {
      serialNo: 'SN-2024-003',
      machineBrand: 'Brother',
      machineModel: 'XL2600i',
      machineType: 'Domestic',
      machineDescription: 'BROTHER XL2600i - DOMESTIC SEWING MACHINE',
      motorBoxNo: 'BOX-2024-003',
      monthlyRent: (agreement?.monthlyRent || 0) / 4,
    },
    {
      serialNo: 'SN-2024-004',
      machineBrand: 'Brother',
      machineModel: 'XL2600i',
      machineType: 'Domestic',
      machineDescription: 'BROTHER XL2600i - DOMESTIC SEWING MACHINE',
      motorBoxNo: 'BOX-2024-004',
      monthlyRent: (agreement?.monthlyRent || 0) / 4,
    },
  ];

  return {
    id: agreement?.id || '',
    agreementNo: agreement?.agreementNo || '',
    customerNo: agreement?.customerNo || '',
    customerName: agreement?.customerName || '',
    customerAddress: customer?.address || '',
    machines,
    startDate: agreement?.startDate || '',
    endDate: agreement?.endDate || null,
    monthlyRent: agreement?.monthlyRent || 0,
    outstanding: agreement?.outstanding || 0,
    status: agreement?.status || 'Active',
    totalAmount: (agreement?.monthlyRent || 0) * 3,
    paidAmount: (agreement?.monthlyRent || 0) * 1,
    deposit: (agreement?.monthlyRent || 0) * 0.5,
    notes: 'Regular maintenance required. Customer has good payment history.',
    customerIdNo: '123456789V',
    customerFullName: customer?.name || '',
    customerSignatureDate: agreement?.startDate || '',
    customerSignature: customer?.name || '',
    purchaseRequestId: agreement?.purchaseRequestId,
    purchaseRequestNumber: agreement?.purchaseRequestNumber,
    expectedMachines: agreement?.expectedMachines,
    addedMachines: agreement?.addedMachines,
  };
};

// Table column configuration - REMOVED SERIAL NO COLUMN
const columns: TableColumn[] = [
  {
    key: 'agreementNo',
    label: 'Agreement No',
    sortable: true,
    filterable: true,
  },
  {
    key: 'customerName',
    label: 'Customer',
    sortable: true,
    filterable: true,
  },
  {
    key: 'purchaseRequestNumber',
    label: 'Purchase Order',
    sortable: true,
    filterable: true,
    render: (value: string | undefined, row: RentalAgreement) => {
      if (!value) {
        return <span className="text-gray-400 dark:text-gray-500 italic text-sm">N/A</span>;
      }
      return (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
          <Tooltip content="View Purchase Request">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/purchase-order?highlight=${row.purchaseRequestId}`;
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <ExternalLink className="w-3 h-3" />
            </button>
          </Tooltip>
        </div>
      );
    },
  },
  {
    key: 'startDate',
    label: 'Start Date',
    sortable: true,
    filterable: false,
    render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
  },
  {
    key: 'endDate',
    label: 'End Date',
    sortable: true,
    filterable: false,
    render: (value: string | null) =>
      value ? new Date(value).toLocaleDateString('en-LK') : 'Ongoing',
  },
  {
    key: 'monthlyRent',
    label: 'Monthly Rent',
    sortable: true,
    filterable: false,
    render: (value: number) => (
      <span className="font-medium text-gray-900 dark:text-white">
        Rs. {value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: 'outstanding',
    label: 'Outstanding',
    sortable: true,
    filterable: false,
    render: (value: number) => (
      <span
        className={
          value > 0
            ? 'text-red-600 dark:text-red-400 font-medium'
            : 'text-green-600 dark:text-green-400 font-medium'
        }
      >
        Rs. {value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    filterable: true,
    render: (value: RentalStatus, row: RentalAgreement) => {
      const base =
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';

      if (value === 'Pending' && row.expectedMachines !== undefined) {
        const progress = row.addedMachines || 0;
        const total = row.expectedMachines;
        return (
          <div className="flex flex-col items-start space-y-1">
            <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
              Pending
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {progress}/{total} machines added
            </span>
          </div>
        );
      }

      if (value === 'Active') {
        return (
          <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}>
            Active
          </span>
        );
      }
      if (value === 'Completed') {
        return (
          <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
            Completed
          </span>
        );
      }
      if (value === 'Pending') {
        return (
          <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
            Pending
          </span>
        );
      }
      return (
        <span className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200`}>
          Cancelled
        </span>
      );
    },
  },
];

const RentalAgreementPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isGatePassModalOpen, setIsGatePassModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreement | null>(null);
  const [generatedGatePass, setGeneratedGatePass] = useState<GatePass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Gatepass form state
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [returnable, setReturnable] = useState(true);
  const [entry, setEntry] = useState<'IN' | 'OUT'>('OUT');
  const [issuedBy, setIssuedBy] = useState('');

  // Create form state
  const [customerId, setCustomerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [machines, setMachines] = useState<MachineItem[]>([
    { id: '1', brand: '', model: '', type: '', quantity: 1, standardPrice: 0, serialNo: '', motorBoxNo: '' },
  ]);
  const [addOns, setAddOns] = useState<AddOnItem[]>([]);
  const [signature, setSignature] = useState('');
  const [agreementDate, setAgreementDate] = useState('');
  const [customerIdNo, setCustomerIdNo] = useState('');
  const [customerFullName, setCustomerFullName] = useState('');
  const [customerSignatureDate, setCustomerSignatureDate] = useState('');
  const [agreementNo, setAgreementNo] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Machine management state for update form
  const [machinesForAgreement, setMachinesForAgreement] = useState<MachineForAgreement[]>([]);
  const [showScanCategoriesView, setShowScanCategoriesView] = useState(false);
  const [agreements, setAgreements] = useState<RentalAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [rentalDetail, setRentalDetail] = useState<RentalAgreementInfo | null>(null);
  const [rentalDetailLoading, setRentalDetailLoading] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string; address?: string }[]>([]);
  /** When set, inline QR scanner is shown for this category (gatepass-style, no navigation). */
  const [activeScanCategoryIndex, setActiveScanCategoryIndex] = useState<number | null>(null);
  const [scannerKey, setScannerKey] = useState(1);
  const activeScanCategoryIndexRef = useRef<number | null>(null);
  useEffect(() => {
    activeScanCategoryIndexRef.current = activeScanCategoryIndex;
  }, [activeScanCategoryIndex]);

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('needletech_access_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const fetchRentals = useCallback(async () => {
    setFetchError(null);
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', limit: '500', sortBy: 'createdAt', sortOrder: 'desc' });
      const res = await fetch(`${API_BASE}/rentals?${params}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to fetch rentals');
      const items = json?.data?.items ?? json?.data ?? [];
      const list = Array.isArray(items) ? items.map((r: ApiRental) => mapApiRentalToAgreement(r)) : [];
      setAgreements(list);
    } catch (err: any) {
      setFetchError(err?.message || 'Failed to load rental agreements');
      setAgreements([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchRentalById = useCallback(async (id: string): Promise<RentalAgreementInfo | null> => {
    try {
      const res = await fetch(`${API_BASE}/rentals/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to fetch rental');
      const data = json?.data;
      if (!data) return null;
      return mapApiRentalToAgreementInfo(data as ApiRental);
    } catch {
      return null;
    }
  }, [getAuthHeaders]);

  const fetchCustomers = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '1000' });
      const res = await fetch(`${API_BASE}/customers?${params}`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) return;
      const items = json?.data?.items ?? json?.data ?? [];
      const list = Array.isArray(items)
        ? items.map((c: { id: string; name: string; billingAddressLine1?: string; billingCity?: string; billingRegion?: string; billingPostalCode?: string; billingCountry?: string }) => ({
            id: c.id,
            name: c.name,
            address: [c.billingAddressLine1, c.billingCity, c.billingRegion, c.billingPostalCode, c.billingCountry].filter(Boolean).join(', '),
          }))
        : [];
      setCustomers(list);
    } catch {
      // keep existing customers (mock or previous)
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  useEffect(() => {
    if (isViewModalOpen && selectedAgreement) {
      setRentalDetailLoading(true);
      setRentalDetail(null);
      fetchRentalById(selectedAgreement.id).then((info) => {
        setRentalDetail(info ?? null);
        setRentalDetailLoading(false);
      });
    } else {
      setRentalDetail(null);
      setRentalDetailLoading(false);
    }
  }, [isViewModalOpen, selectedAgreement?.id, fetchRentalById]);

  useEffect(() => {
    if (isCreateModalOpen && customers.length === 0) fetchCustomers();
  }, [isCreateModalOpen, customers.length, fetchCustomers]);

  // Calculate pricing
  const pricing = useMemo(() => {
    let totalMachinePrice = 0;
    machines.forEach((machine) => {
      if (machine.quantity > 0) {
        const pricePerMachine = machine.standardPrice > 0
          ? machine.standardPrice
          : (machine.type ? standardPrices[machine.type] || 0 : 0);
        totalMachinePrice += pricePerMachine * machine.quantity;
      }
    });

    let totalAddOnPrice = 0;
    addOns.forEach((addOn) => {
      if (addOn.addOnId && addOn.quantity > 0) {
        const addOnData = mockAddOns.find((ao) => ao.id === addOn.addOnId);
        addOn.price = addOnData?.price || 0;
        totalAddOnPrice += (addOnData?.price || 0) * addOn.quantity;
      }
    });

    return {
      standardPricePerMachine: machines.length > 0 && machines[0].type ? standardPrices[machines[0].type] || 0 : 0,
      totalMachinePrice,
      totalAddOnPrice,
      totalPrice: totalMachinePrice + totalAddOnPrice,
    };
  }, [machines, addOns]);

  // Get available models based on selected brand
  const getAvailableModels = (brand: string) => {
    const brandData = mockMachineModels.find((m) => m.brand === brand);
    return brandData?.models || [];
  };

  // Customer options for SearchableSelect (API customers with fallback to mock)
  const customerOptions = useMemo(() => {
    const list = customers.length > 0 ? customers : mockCustomers;
    return list.map((customer) => ({
      value: customer.id,
      label: `${customer.name}${customer.address ? ` - ${customer.address}` : ''}`,
    }));
  }, [customers]);

// Brand options for SearchableSelect
const brandOptions = useMemo(() => {
  return mockMachineBrands.map((brand) => ({
    value: brand,
    label: brand,
  }));
}, []);

// Model options for a given brand (used per machine row)
const getModelOptions = (brand: string) => {
  return getAvailableModels(brand).map((model) => ({
    value: model,
    label: model,
  }));
};

// Type options for SearchableSelect
const typeOptions = useMemo(() => {
  return mockMachineTypes.map((type) => ({
    value: type,
    label: type,
  }));
}, []);

  // Get available machine IDs for add-ons
  const getAvailableMachineIds = () => {
    return machines
      .map((m, index) => ({
        id: m.id,
        label: `Machine ${index + 1}: ${m.brand} ${m.model} (${m.type})`,
      }))
      .filter((m) => m.label.includes(':'));
  };

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  // Generate agreement number (e.g. RA24010001)
  const generateAgreementNo = () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `RA${yy}${mm}${seq}`;
  };

  const handleCreateAgreement = () => {
    setIsCreateModalOpen(true);
    setAgreementNo(generateAgreementNo());
    setCustomerId('');
    setStartDate('');
    setEndDate('');
    setMachines([{ id: '1', brand: '', model: '', type: '', quantity: 1, standardPrice: 0, serialNo: '', motorBoxNo: '' }]);
    setAddOns([]);
    setSignature('');
    setAgreementDate(new Date().toISOString().split('T')[0]);
    setCustomerIdNo('');
    setCustomerFullName('');
    setCustomerSignatureDate(new Date().toISOString().split('T')[0]);
    setCustomerAddress('');
    setFormErrors({});
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setAgreementNo('');
    setCustomerId('');
    setStartDate('');
    setEndDate('');
    setMachines([{ id: '1', brand: '', model: '', type: '', quantity: 1, standardPrice: 0, serialNo: '', motorBoxNo: '' }]);
    setAddOns([]);
    setSignature('');
    setAgreementDate('');
    setCustomerIdNo('');
    setCustomerFullName('');
    setCustomerSignatureDate('');
    setCustomerAddress('');
    setFormErrors({});
  };

  // Auto-fill customer full name and address when customer is selected (signature stays empty for user to enter/print)
  useEffect(() => {
    if (!customerId) {
      setCustomerFullName('');
      setCustomerAddress('');
      return;
    }
    const fromApi = customers.find((c) => c.id === customerId);
    const fromMock = mockCustomers.find((c) => c.id === customerId);
    const customer = fromApi ?? fromMock;
    if (customer) {
      setCustomerFullName(customer.name);
      setCustomerAddress('address' in customer ? (customer as { address?: string }).address || '' : '');
    }
  }, [customerId, customers]);

  const handleAddMachine = () => {
    setMachines([
      ...machines,
      { id: Date.now().toString(), brand: '', model: '', type: '', quantity: 1, standardPrice: 0, serialNo: '', motorBoxNo: '' },
    ]);
  };

  const handleRemoveMachine = (id: string) => {
    if (machines.length > 1) {
      setMachines(machines.filter((m) => m.id !== id));
    }
  };

  const handleMachineChange = (id: string, field: keyof MachineItem, value: any) => {
    setMachines(
      machines.map((m) => {
        if (m.id === id) {
          const updated = { ...m, [field]: value };
          if (field === 'brand') {
            updated.model = '';
          }
          if (field === 'type') {
            updated.standardPrice = standardPrices[value] || 0;
          }
          return updated;
        }
        return m;
      })
    );
  };
  // Build machine description for display (e.g. BROTHER XL2600i - DOMESTIC SEWING MACHINE)
  const getMachineDescription = (m: MachineItem) => {
    if (!m.brand && !m.model && !m.type) return '';
    const typeLabel = m.type ? m.type.toUpperCase() : '';
    return `${(m.brand || '').toUpperCase()} ${(m.model || '').toUpperCase()}${typeLabel ? ` - ${typeLabel}` : ''}`.trim();
  };

  const handleAddAddOn = () => {
    setAddOns([
      ...addOns,
      { id: Date.now().toString(), addOnId: '', quantity: 1, price: 0 },
    ]);
  };

  const handleRemoveAddOn = (id: string) => {
    setAddOns(addOns.filter((a) => a.id !== id));
  };

  const handleAddOnChange = (id: string, field: keyof AddOnItem, value: any) => {
    setAddOns(
      addOns.map((a) => {
        if (a.id === id) {
          const updated = { ...a, [field]: value };
          if (field === 'addOnId') {
            const addOnData = mockAddOns.find((ao) => ao.id === value);
            updated.price = addOnData?.price || 0;
          }
          return updated;
        }
        return a;
      })
    );
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!customerId) errors.customerId = 'Customer is required';
    if (!startDate) errors.startDate = 'Start date is required';
    if (!endDate) errors.endDate = 'End date is required';
    if (new Date(endDate) <= new Date(startDate)) {
      errors.endDate = 'End date must be after start date';
    }

    machines.forEach((machine, index) => {
      if (!machine.brand) errors[`machine_brand_${index}`] = 'Brand is required';
      if (!machine.model) errors[`machine_model_${index}`] = 'Model is required';
      if (!machine.type) errors[`machine_type_${index}`] = 'Type is required';
      if (machine.quantity < 1) errors[`machine_quantity_${index}`] = 'Quantity must be at least 1';
    });

    addOns.forEach((addOn, index) => {
      if (!addOn.addOnId) errors[`addon_id_${index}`] = 'Add-on ID is required';
      if (addOn.quantity < 1) errors[`addon_quantity_${index}`] = 'Quantity must be at least 1';
    });

    if (!signature) errors.signature = 'Signature is required';
    if (!agreementDate) errors.agreementDate = 'Date is required';
    if (!customerIdNo.trim()) errors.customerIdNo = 'ID NO is required';
    if (!customerFullName.trim()) errors.customerFullName = 'Full Name is required';
    if (!customerSignatureDate) errors.customerSignatureDate = 'Customer signature date is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/rentals`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          customerId,
          startDate,
          endDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.message || json?.data?.customerId?.[0] || json?.data?.startDate?.[0] || json?.data?.endDate?.[0] || 'Failed to create rental agreement';
        throw new Error(typeof msg === 'string' ? msg : 'Validation error');
      }
      await fetchRentals();
      alert('Rental agreement created successfully.');
      handleCloseCreateModal();
    } catch (error: any) {
      console.error('Error creating rental agreement:', error);
      alert(error?.message || 'Failed to create rental agreement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewAgreement = (agreement: RentalAgreement) => {
    setSelectedAgreement(agreement);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedAgreement(null);
    setRentalDetail(null);
  };

  const handlePrintAgreement = () => {
    window.print();
  };

  const handleViewPurchaseRequest = (purchaseRequestId?: number) => {
    if (purchaseRequestId) {
      window.location.href = `/purchase-order?highlight=${purchaseRequestId}`;
    }
  };

  const handleUpdateAgreement = (agreement: RentalAgreement) => {
    // Only reset machines if it's a different agreement
    if (!selectedAgreement || selectedAgreement.id !== agreement.id) {
      setMachinesForAgreement([]);
    }
    setSelectedAgreement(agreement);
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedAgreement(null);
    setMachinesForAgreement([]);
    setShowScanCategoriesView(false);
    setActiveScanCategoryIndex(null);
  };

  const handleRemoveMachineFromAgreement = (machineId: string) => {
    const updated = machinesForAgreement.filter((m) => m.id !== machineId);
    setMachinesForAgreement(updated);
    checkAndUpdateStatus(updated);
  };

  const checkAndUpdateStatus = (currentMachines: MachineForAgreement[]) => {
    if (!selectedAgreement || selectedAgreement.status !== 'Pending') return;
    const categories = getExpectedCategories(selectedAgreement);
    const totalExpected = categories.reduce((sum, c) => sum + c.quantity, 0);
    const added = currentMachines.length;
    setSelectedAgreement({
      ...selectedAgreement,
      addedMachines: added,
    });
  };

  /** True when all expected categories have reached their required quantity. */
  const isAllCategoriesComplete = (): boolean => {
    if (!selectedAgreement) return false;
    const categories = getExpectedCategories(selectedAgreement);
    return categories.every((cat, i) => {
      const scanned = machinesForAgreement.filter((m) => m.categoryIndex === i).length;
      return scanned >= cat.quantity;
    });
  };

  /** Open inline QR scanner for a category (gatepass-style: scanner inside modal, no navigation). */
  const handleOpenQRScanner = (categoryIndex: number) => {
    if (!selectedAgreement) return;
    const categories = getExpectedCategories(selectedAgreement);
    if (categoryIndex < 0 || categoryIndex >= categories.length) return;
    const cat = categories[categoryIndex];
    const scannedInCategory = machinesForAgreement.filter((m) => m.categoryIndex === categoryIndex).length;
    if (scannedInCategory >= cat.quantity) {
      alert(`All ${cat.quantity} machine(s) for this category have been added.`);
      return;
    }
    setActiveScanCategoryIndex(categoryIndex);
    setScannerKey((k) => k + 1);
  };

  /** Inline scan success: parse QR, add machine to current category, restart scanner for next. */
  const handleInlineQRScanSuccess = (decodedText: string) => {
    const categoryIndex = activeScanCategoryIndexRef.current;
    if (categoryIndex == null || !selectedAgreement) return;
    try {
      const machineData = JSON.parse(decodedText);
      if (!machineData.serialNumber) {
        alert('Invalid QR code: Missing serial number.');
        setScannerKey((k) => k + 1);
        return;
      }
      setMachinesForAgreement((prev) => {
        const isDuplicate = prev.some(
          (m) => m.serialNumber.toLowerCase() === (machineData.serialNumber || '').toLowerCase()
        );
        if (isDuplicate) {
          setTimeout(() => {
            alert('This machine is already assigned to this agreement.');
            setScannerKey((k) => k + 1);
          }, 0);
          return prev;
        }
        const newMachine: MachineForAgreement = {
          id: Date.now().toString(),
          description: `${machineData.brandName || ''} ${machineData.modelName || ''} ${machineData.typeName || ''}`.trim() || 'Machine',
          serialNumber: machineData.serialNumber || '',
          boxNumber: machineData.boxNumber || '',
          brandName: machineData.brandName,
          modelName: machineData.modelName,
          typeName: machineData.typeName,
          scannedAt: new Date().toISOString(),
          categoryIndex,
        };
        const updated = [...prev, newMachine];
        checkAndUpdateStatus(updated);
        const categories = getExpectedCategories(selectedAgreement);
        const cat = categories[categoryIndex];
        const scannedInCat = updated.filter((m) => m.categoryIndex === categoryIndex).length;
        if (cat && scannedInCat >= cat.quantity) {
          setActiveScanCategoryIndex(null);
        }
        setTimeout(() => setScannerKey((k) => k + 1), 0);
        return updated;
      });
    } catch (error) {
      console.error('Error parsing QR code:', error);
      alert('Invalid QR code format. Please scan a valid machine QR code.');
      setScannerKey((k) => k + 1);
    }
  };

  // Generate Gatepass Number
  const generateGatepassNo = (): string => {
    const num = Math.floor(Math.random() * 1000000);
    return num.toString().padStart(6, '0');
  };

  // Handle Generate Gatepass
  const handleGenerateGatePass = (agreement: RentalAgreement) => {
    setSelectedAgreement(agreement);
    // Reset gatepass form
    setVehicleNumber('');
    setDriverName('');
    setReturnable(true);
    setEntry('OUT');
    setIssuedBy('');
    setIsGatePassModalOpen(true);
  };

  const handleCloseGatePassModal = () => {
    setIsGatePassModalOpen(false);
    setGeneratedGatePass(null);
    setVehicleNumber('');
    setDriverName('');
    setReturnable(true);
    setEntry('OUT');
    setIssuedBy('');
  };

  const handleCreateGatePass = async () => {
    if (!selectedAgreement) return;

    // Validate required fields
    if (!vehicleNumber.trim() || !driverName.trim()) {
      alert('Please fill in Vehicle Number and Driver Name');
      return;
    }

    let agreementInfo: RentalAgreementInfo | null =
      (rentalDetail?.id === selectedAgreement.id ? rentalDetail : null) ??
      getRentalAgreementInfoFromList(selectedAgreement.id, agreements);
    if (!agreementInfo) {
      agreementInfo = await fetchRentalById(selectedAgreement.id);
    }
    if (!agreementInfo) {
      alert('Could not load agreement details.');
      return;
    }
    const customer = customers.find((c) => c.id === selectedAgreement.customerNo) ?? mockCustomers.find((c) => c.id === selectedAgreement.customerNo);
    const gatepassNo = generateGatepassNo();

    // Convert machines to gatepass items
    const gatePassItems: GatePassItem[] = agreementInfo.machines.map((machine, index) => ({
      id: (index + 1).toString(),
      description: machine.machineDescription,
      status: 'GOOD',
      serialNo: machine.serialNo,
      motorBoxNo: machine.motorBoxNo || 'N/A',
    }));

    const gatePass: GatePass = {
      id: Date.now(),
      gatepassNo,
      agreementReference: selectedAgreement.agreementNo,
      dateOfIssue: new Date().toISOString().split('T')[0],
      returnable,
      entry,
      from: 'Needle Technologies',
      to: selectedAgreement.customerName,
      toAddress: (customer as { address?: string })?.address ?? agreementInfo.customerAddress ?? '',
      vehicleNumber,
      driverName,
      items: gatePassItems,
      issuedBy: issuedBy || 'System',
      receivedBy: '',
    };

    setGeneratedGatePass(gatePass);
  };

  const handlePrintGatePass = () => {
    window.print();
  };

  // Form fields for Update
  const updateFields = [
    {
      name: 'agreementNo',
      label: 'Agreement Number',
      type: 'text' as const,
      placeholder: 'Enter agreement number',
      required: true,
      disabled: true,
    },
    {
      name: 'customerName',
      label: 'Customer Name',
      type: 'text' as const,
      placeholder: 'Enter customer name',
      required: true,
      disabled: true,
    },
    {
      name: 'startDate',
      label: 'Start Date',
      type: 'date' as const,
      placeholder: 'Select start date',
      required: true,
    },
    {
      name: 'endDate',
      label: 'End Date',
      type: 'date' as const,
      placeholder: 'Select end date',
      required: false,
    },
    {
      name: 'monthlyRent',
      label: 'Monthly Rent',
      type: 'number' as const,
      placeholder: 'Enter monthly rent',
      required: true,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select' as const,
      placeholder: 'Select status',
      required: true,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Cancelled', value: 'Cancelled' },
        { label: 'Pending', value: 'Pending' },
      ],
    },
  ];

  const getUpdateInitialData = (agreement: RentalAgreement | null) => {
    if (!agreement) return {};

    return {
      agreementNo: agreement.agreementNo,
      customerName: agreement.customerName,
      startDate: agreement.startDate,
      endDate: agreement.endDate || '',
      monthlyRent: agreement.monthlyRent,
      status: agreement.status,
    };
  };

  const handleAgreementUpdate = async (data: Record<string, any>) => {
    if (!selectedAgreement) return;
    const wasPending = selectedAgreement.status === 'Pending';
    const categories = getExpectedCategories(selectedAgreement);
    const totalExpected = categories.reduce((sum, c) => sum + c.quantity, 0);

    if (wasPending && totalExpected > 0 && !isAllCategoriesComplete()) {
      alert('Please complete machine assignment for all categories before submitting. Scan QR for each category until the required count is reached.');
      return;
    }

    setIsSubmitting(true);
    try {
      const addedCount = machinesForAgreement.length;
      const newStatus = wasPending && totalExpected > 0 && addedCount >= totalExpected ? 'Active' : (data.status ?? selectedAgreement.status);
      const body: Record<string, unknown> = {
        status: newStatus,
        ...(data.endDate != null && data.endDate !== '' && { endDate: data.endDate }),
      };

      const res = await fetch(`${API_BASE}/rentals/${selectedAgreement.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Failed to update rental agreement');
      }

      setAgreements((prev) =>
        prev.map((a) =>
          a.id === selectedAgreement.id
            ? {
                ...a,
                ...data,
                status: newStatus as RentalStatus,
                addedMachines: addedCount,
              }
            : a
        )
      );

      if (newStatus === 'Active' && wasPending && addedCount > 0) {
        const customer = customers.find((c) => c.id === selectedAgreement.customerNo) ?? mockCustomers.find((c) => c.id === selectedAgreement.customerNo);
        const monthlyRent = selectedAgreement.monthlyRent;
        const rentPerMachine = addedCount > 0 ? monthlyRent / addedCount : 0;
        const today = new Date().toISOString().split('T')[0];
        const periodFrom = selectedAgreement.startDate;
        const periodTo = selectedAgreement.endDate || new Date(new Date(selectedAgreement.startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const itemsByCategory = new Map<number, MachineForAgreement[]>();
        machinesForAgreement.forEach((m) => {
          const idx = m.categoryIndex ?? 0;
          if (!itemsByCategory.has(idx)) itemsByCategory.set(idx, []);
          itemsByCategory.get(idx)!.push(m);
        });
        const catList = getExpectedCategories(selectedAgreement);
        const invoiceItems: AutoGeneratedInvoiceItem[] = [];
        catList.forEach((cat, i) => {
          const machinesInCat = itemsByCategory.get(i) || [];
          const count = machinesInCat.length;
          if (count === 0) return;
          const desc = [cat.brand, cat.model, cat.type].filter(Boolean).join(' ') || 'Machine';
          const subtotal = count * rentPerMachine;
          invoiceItems.push({
            id: String(invoiceItems.length + 1),
            itemCode: `212WG${String(invoiceItems.length + 1).padStart(5, '0')}`,
            description: desc.toUpperCase(),
            brand: cat.brand,
            model: cat.model,
            type: cat.type,
            numberOfMachines: count,
            monthlyRentPerMachine: rentPerMachine,
            subtotal,
          });
        });
        const subtotal = invoiceItems.reduce((s, it) => s + it.subtotal, 0);
        const vatAmount = Math.round(subtotal * 0.18);
        const totalAmount = subtotal + vatAmount;
        const generatedInvoice: AutoGeneratedInvoice = {
          invoiceNumber: `RA-${selectedAgreement.agreementNo}-${Date.now().toString().slice(-6)}`,
          customerName: selectedAgreement.customerName,
          customerAddress: (customer as { address?: string })?.address ?? '',
          vatTinNic: (customer as { vatTinNic?: string })?.vatTinNic ?? (customer as { id?: string })?.id ?? '',
          invoiceDate: today,
          periodFrom,
          periodTo,
          items: invoiceItems,
          subtotal,
          vatAmount,
          totalAmount,
          status: 'issued',
        };
        try {
          localStorage.setItem('needletech_autoGeneratedInvoice', JSON.stringify(generatedInvoice));
        } catch (e) {
          console.warn('Could not store generated invoice in localStorage', e);
        }
        alert(`Rental Agreement "${data.agreementNo}" is now Active. Invoice has been generated. You can view it from the Invoice page.`);
      } else {
        alert(`Rental Agreement "${data.agreementNo}" updated successfully.`);
      }

      await fetchRentals();
      handleCloseUpdateModal();
    } catch (error: any) {
      console.error('Error updating rental:', error);
      alert(error?.message || 'Failed to update rental agreement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    console.log('Form cleared');
  };

  const getRowClassName = (agreement: RentalAgreement) => {
    if (agreement.status === 'Cancelled') return 'bg-red-50/60 dark:bg-red-950/40';
    if (agreement.status === 'Completed') return 'bg-gray-50 dark:bg-slate-900/40';
    if (agreement.status === 'Pending') return 'bg-yellow-50/60 dark:bg-yellow-950/20';
    if (agreement.outstanding > 0) return 'bg-yellow-50/60 dark:bg-yellow-950/20';
    return '';
  };

  // Render Gate Pass Document (same as gatepass page)
  const renderGatePassDocument = (gatePass: GatePass) => {
    return (
      <div className="bg-white p-8 max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
          <div className="flex items-center justify-center mb-2">
            <div className="text-3xl font-bold text-gray-900">NEEDLE TECHNOLOGIES</div>
          </div>
          <div className="text-4xl font-bold text-gray-900 mt-2">GATEPASS</div>
          <div className="text-sm text-gray-700 mt-1">
            Supplier of Industrial Sewing Machines and Accessories
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          {/* Left Side - Sender/Receiver Info */}
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">FROM:</div>
              <div className="text-sm text-gray-900 font-medium">{gatePass.from}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">TO:</div>
              <div className="text-sm text-gray-900 font-medium">{gatePass.to}</div>
              <div className="text-xs text-gray-700 mt-1">{gatePass.toAddress}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Vehicle:</div>
              <div className="text-sm text-gray-900 font-medium">{gatePass.vehicleNumber}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Driver:</div>
              <div className="text-sm text-gray-900 font-medium">{gatePass.driverName}</div>
            </div>
          </div>

          {/* Right Side - Gatepass Details */}
          <div className="space-y-4 text-right">
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Gatepass:</div>
              <div className="text-lg text-gray-900 font-bold">{gatePass.gatepassNo}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Date of Issue:</div>
              <div className="text-sm text-gray-900 font-medium">
                {new Date(gatePass.dateOfIssue).toLocaleDateString('en-LK', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Returnable:</div>
              <div className="text-sm text-gray-900 font-medium">
                {gatePass.returnable ? 'YES' : 'NO'}
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Entry:</div>
              <div className="text-sm text-gray-900 font-medium">{gatePass.entry}</div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-gray-800">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-800 px-4 py-2 text-left text-sm font-semibold text-gray-900">
                  Description
                </th>
                <th className="border border-gray-800 px-4 py-2 text-center text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="border border-gray-800 px-4 py-2 text-center text-sm font-semibold text-gray-900">
                  Serial No
                </th>
                <th className="border border-gray-800 px-4 py-2 text-center text-sm font-semibold text-gray-900">
                  Motor / Box No
                </th>
              </tr>
            </thead>
            <tbody>
              {gatePass.items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-800 px-4 py-2 text-sm text-gray-900">
                    {item.description}
                  </td>
                  <td className="border border-gray-800 px-4 py-2 text-center text-sm text-gray-900">
                    {item.status}
                  </td>
                  <td className="border border-gray-800 px-4 py-2 text-center text-sm text-gray-900">
                    {item.serialNo}
                  </td>
                  <td className="border border-gray-800 px-4 py-2 text-center text-sm text-gray-900">
                    {item.motorBoxNo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Issued By:</div>
            <div className="border-b border-gray-800 pb-1 mb-2 min-h-[40px]">
              {gatePass.issuedBy && (
                <div className="text-sm text-gray-900">{gatePass.issuedBy}</div>
              )}
            </div>
            <div className="text-xs text-gray-600">Signature & Stamp</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-2">Received By:</div>
            <div className="border-b border-gray-800 pb-1 mb-2 min-h-[40px]">
              {gatePass.receivedBy && (
                <div className="text-sm text-gray-900">{gatePass.receivedBy}</div>
              )}
            </div>
            <div className="text-xs text-gray-600">Signature</div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4 mt-6">
          <div className="text-xs text-gray-700 text-center mb-2">
            IMPORTERS & DISTRIBUTORS OF SPARE PARTS & ATTACHMENTS FOR: JUKI, SINGER, KANSAI,
            BROTHER, SUNSTAR, EASTMAN, CUTTING PEGASUS & RECECINNUSTRIAL SEWING MACHINES, NAQMO
            IRONS, ORGAN & ORANGE NEEDLES.
          </div>
          <div className="text-xs text-gray-700 text-center">
            No. 137M, Colombo Road, Biyagama, Tel: 0112488735, 011-5737711, 011-5737712 Fax:
            2487623, Email: needistec@sltnet.lk
          </div>
        </div>
      </div>
    );
  };

  // Action buttons - Changed icon to Truck
  const actions: ActionButton[] = [
    {
      label: '',
      icon: <Eye className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewAgreement,
      tooltip: 'View Agreement',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
    },
    {
      label: '',
      icon: <Pencil className="w-4 h-4" />,
      variant: 'primary',
      onClick: handleUpdateAgreement,
      tooltip: 'Update Agreement',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500',
    },
    {
      label: '',
      icon: <Truck className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleGenerateGatePass,
      tooltip: 'Generate Gatepass',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-800 focus:ring-green-500 dark:focus:ring-green-500',
    },
  ];

  // Render Rental Agreement Document for Printing (letterhead style - matches HIRING MACHINE AGREEMENT)
  const renderRentalAgreementDocument = (agreementInfo: RentalAgreementInfo) => {
    const totalMonthlyRent = agreementInfo.machines.reduce((sum, machine) => sum + machine.monthlyRent, 0);
    const dateOfIssue = agreementInfo.startDate
      ? new Date(agreementInfo.startDate).toLocaleDateString('en-LK', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      : 'TBD';
    const signatureDate = agreementInfo.customerSignatureDate
      ? new Date(agreementInfo.customerSignatureDate).toLocaleDateString('en-LK', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      : 'N/A';

    const mainContent = (
      <>
        {/* Two-column: Customer (left) | Agreement (right) same row; Address (left) | Date of Issue (right) same row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <div>
              <span className="text-sm font-semibold text-gray-700">Customer: </span>
              <span className="text-sm text-gray-900">{agreementInfo.customerName}</span>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-700">Address: </span>
              <span className="text-sm text-gray-900">{agreementInfo.customerAddress || 'N/A'}</span>
            </div>
          </div>
          <div className="space-y-2 text-left sm:text-right print:text-right">
            <div>
              <span className="text-sm font-semibold text-gray-700">Agreement: </span>
              <span className="text-sm text-gray-900">-{agreementInfo.agreementNo || 'TBD'}</span>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-700">Date of Issue: </span>
              <span className="text-sm text-gray-900">-{dateOfIssue}</span>
            </div>
          </div>
        </div>

        {/* Machine details table - Model/Description, Serial No, Motor/Box No, Monthly Res */}
        <div className="mb-4">
          <table className="w-full border-collapse border border-gray-800">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-800 px-3 py-2 text-left text-sm font-semibold text-gray-900">
                  Model - Description
                </th>
                <th className="border border-gray-800 px-3 py-2 text-center text-sm font-semibold text-gray-900">
                  Serial No
                </th>
                <th className="border border-gray-800 px-3 py-2 text-center text-sm font-semibold text-gray-900">
                  Motor / Box No
                </th>
                <th className="border border-gray-800 px-3 py-2 text-center text-sm font-semibold text-gray-900">
                  Monthly Res
                </th>
              </tr>
            </thead>
            <tbody>
              {agreementInfo.machines.map((machine, index) => (
                <tr key={index}>
                  <td className="border border-gray-800 px-3 py-2 text-sm text-gray-900">
                    {machine.machineDescription}
                  </td>
                  <td className="border border-gray-800 px-3 py-2 text-center text-sm text-gray-900">
                    {machine.serialNo}
                  </td>
                  <td className="border border-gray-800 px-3 py-2 text-center text-sm text-gray-900">
                    {machine.motorBoxNo || 'N/A'}
                  </td>
                  <td className="border border-gray-800 px-3 py-2 text-center text-sm text-gray-900">
                    {machine.monthlyRent.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-sm font-semibold text-gray-900">
            Total: {totalMonthlyRent.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* Additional Parts */}
        {agreementInfo.additionalParts && (
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-1">Additional Parts</div>
            <div className="text-sm text-gray-900">- {agreementInfo.additionalParts}</div>
          </div>
        )}

        {/* Terms & Conditions */}
        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Terms & Conditions</h3>
          <div className="space-y-2 text-sm text-gray-900">
            <p>
              <span className="font-semibold">(01)</span> You have to be paid in cash double monthly rental fee on the date of rent machine issues.
              The excess payment would be immediately return to you as and when you returned the hired
              machine within the stipulated period.
            </p>
            <p>
              <span className="font-semibold">(02)</span> Above payment has to be paid 05 days prior to next month.
            </p>
            <p>
              <span className="font-semibold">(03)</span> Customer has to take total responsibility with regard to security of the machine.
            </p>
            <p>
              <span className="font-semibold">(04)</span> Both the parties can withdraw or return the machine with one month prior notice.
            </p>
            <p>
              <span className="font-semibold">(05)</span> Company will examine the machine at the point of returning and will release due security deposit.
            </p>
          </div>
        </div>
      </>
    );

    const signatureBlock = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 print:break-inside-avoid">
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Customer Signature</div>
          <div className="border-b border-gray-800 pb-2 min-h-[44px]">
            {agreementInfo.customerSignature && (
              <div className="text-sm text-gray-900">{agreementInfo.customerSignature}</div>
            )}
          </div>
          <div className="text-xs text-gray-600 mt-1">(Agreed upon the terms & Conditions)</div>
        </div>
        <div className="space-y-2">
          <div>
            <span className="text-sm font-semibold text-gray-700">ID NO: </span>
            <span className="text-sm text-gray-900">{agreementInfo.customerIdNo || 'N/A'}</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-700">Full Name: </span>
            <span className="text-sm text-gray-900">{agreementInfo.customerFullName || 'N/A'}</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-700">Date: </span>
            <span className="text-sm text-gray-900">{signatureDate}</span>
          </div>
        </div>
      </div>
    );

    return (
      <div className="bg-white p-6 sm:p-8 max-w-[210mm] mx-auto print:p-8 print:overflow-visible" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <LetterheadDocument
          documentTitle="HIRING MACHINE AGREEMENT"
          footerStyle="simple"
          footerContent={signatureBlock}
          className="print:p-0"
        >
          {mainContent}
        </LetterheadDocument>
      </div>
    );
  };

  // Machine Assignment section: only for Pending agreements; category-based scan (brand, model, type, count, scan button per category).
  const renderMachineManagementSection = () => {
    if (!selectedAgreement || selectedAgreement.status !== 'Pending') return null;

    const categories = getExpectedCategories(selectedAgreement);
    const totalExpected = categories.reduce((sum, c) => sum + c.quantity, 0);
    const totalScanned = machinesForAgreement.length;
    const allComplete = isAllCategoriesComplete();
    const progressPercentage = totalExpected > 0 ? Math.min((totalScanned / totalExpected) * 100, 100) : 0;

    const getScannedForCategory = (categoryIndex: number) =>
      machinesForAgreement.filter((m) => m.categoryIndex === categoryIndex).length;
    const canScanCategory = (categoryIndex: number) => {
      for (let j = 0; j < categoryIndex; j++) {
        if (getScannedForCategory(j) < categories[j].quantity) return false;
      }
      return getScannedForCategory(categoryIndex) < categories[categoryIndex].quantity;
    };

    return (
      <div className="space-y-6">
        <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Machine Assignment
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add machines by scanning QR codes for each category. Complete each category in order.
              </p>
            </div>
            {totalExpected > 0 && (
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl px-5 py-3 border border-gray-100 dark:border-slate-600/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                    {totalScanned}/{totalExpected}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Machines</div>
                </div>
                {allComplete && (
                  <div className="flex items-center text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5 mr-1.5 shrink-0" />
                    <span className="text-sm font-medium">Complete</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {totalExpected > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                  {Math.round(progressPercentage)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                    allComplete
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-500 dark:to-emerald-600'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-500 dark:to-indigo-600'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              {allComplete && (
                <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  All machines assigned. Submit to activate agreement and generate invoice.
                </p>
              )}
            </div>
          )}

          {/* Category-based scan UI: list of categories; "Scan QR" opens a separate scanner popup */}
          <div className="space-y-4 mb-6">
            {categories.map((cat, i) => {
              const scanned = getScannedForCategory(i);
              const required = cat.quantity;
              const categoryComplete = scanned >= required;
              const canScan = canScanCategory(i);
              const label = [cat.brand, cat.model, cat.type].filter(Boolean).join(' ') || 'Machine';
              return (
                <div
                  key={cat.id}
                  className={`rounded-xl border p-4 ${
                    categoryComplete
                      ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50'
                      : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {cat.brand && <span>{cat.brand} </span>}
                        {cat.model && <span>{cat.model} </span>}
                        {cat.type && <span>({cat.type})</span>}
                        {!cat.brand && !cat.model && !cat.type && 'Machine'}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        Enter {required} machine(s) — {scanned} of {required} scanned
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenQRScanner(i)}
                      disabled={!canScan}
                      className="flex-shrink-0 px-4 py-2 rounded-lg bg-green-600 dark:bg-green-700 text-white text-sm font-medium hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />
                      {categoryComplete ? 'Complete' : `Scan QR for ${label}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {machinesForAgreement.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Assigned machines ({machinesForAgreement.length})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Remove all machines from this agreement?')) {
                      setMachinesForAgreement([]);
                      checkAndUpdateStatus([]);
                    }
                  }}
                  className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1 -mr-1">
                {machinesForAgreement.map((machine, index) => (
                  <div
                    key={machine.id}
                    className="bg-white dark:bg-slate-700/80 border border-gray-200 dark:border-slate-600 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex-shrink-0 w-7 h-7 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg flex items-center justify-center text-xs font-semibold">
                            {index + 1}
                          </span>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {machine.description || 'Machine'}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-600 dark:text-gray-400 ml-9">
                          <div><span className="font-medium text-gray-500 dark:text-gray-500">Serial:</span> {machine.serialNumber}</div>
                          <div><span className="font-medium text-gray-500 dark:text-gray-500">Box:</span> {machine.boxNumber || '—'}</div>
                          {machine.scannedAt && (
                            <div className="sm:col-span-2 text-gray-500 dark:text-gray-500">
                              Scanned {new Date(machine.scannedAt).toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' })}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMachineFromAgreement(machine.id)}
                        className="flex-shrink-0 p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Remove machine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {machinesForAgreement.length === 0 && (
            <div className="text-center py-10 px-6 bg-gray-50 dark:bg-slate-700/30 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-600">
              <QrCode className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                No machines assigned yet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Use the &quot;Scan QR&quot; button for each category above to add machines.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // View Rental Agreement Content
  const renderAgreementDetails = () => {
    if (!selectedAgreement) return null;
    if (rentalDetailLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-indigo-400" />
        </div>
      );
    }
    if (!rentalDetail) {
      return (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          Could not load agreement details.
        </div>
      );
    }
    const agreementInfo = rentalDetail;
    return (
      <div>
        <div className="print:hidden">
          <div className="space-y-6">
            {renderRentalAgreementDocument(agreementInfo)}
          </div>
        </div>

        <div className="hidden print:block print:bg-white print:overflow-visible">
          {renderRentalAgreementDocument(agreementInfo)}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Print-only rental agreement document - normal flow so signature block and footer print (no fixed clipping) */}
      {selectedAgreement && rentalDetail && (
        <div
          id="rental-agreement-print"
          className="hidden print:block print:bg-white print:z-[9999] print:overflow-visible"
        >
          {renderRentalAgreementDocument(rentalDetail)}
        </div>
      )}

      {/* Print-only gatepass document */}
      {generatedGatePass && (
        <div className="hidden print:block print:fixed print:inset-0 print:z-[9999] print:bg-white">
          {renderGatePassDocument(generatedGatePass)}
        </div>
      )}

      <div className="min-h-screen bg-gray-100 dark:bg-slate-950 print:hidden">
        {/* Top navbar */}
        <Navbar onMenuClick={handleMenuClick} />

        {/* Left sidebar */}
        <Sidebar
          onLogout={handleLogout}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={handleMobileSidebarClose}
          onExpandedChange={setIsSidebarExpanded}
        />

        {/* Main content area */}
        <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
          }`}>
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Page header */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Hiring Machine Agreement</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Overview of all rental agreements with their details, customer information, and
                outstanding balances. Rental agreements can be created from purchase requests.
              </p>
            </div>

            {/* Rental Agreement table card */}
            {fetchError && (
              <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                <span className="text-sm text-red-700 dark:text-red-300">{fetchError}</span>
                <button
                  type="button"
                  onClick={() => fetchRentals()}
                  className="ml-auto px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg"
                >
                  Retry
                </button>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 dark:text-indigo-400" />
              </div>
            ) : (
              <Table
                data={agreements}
                columns={columns}
                actions={actions}
                itemsPerPage={10}
                searchable
                filterable
                onCreateClick={handleCreateAgreement}
                createButtonLabel="Create Hiring Machine Agreement"
                getRowClassName={getRowClassName}
                emptyMessage="No rental agreements found."
              />
            )}
          </div>
        </main>

        {/* View Rental Agreement Modal */}
        {isViewModalOpen && selectedAgreement && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Hiring Machine Agreement Details
                  </h2>
                  
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrintAgreement}
                    className="px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 flex items-center space-x-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={handleCloseViewModal}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">{renderAgreementDetails()}</div>
            </div>
          </div>
        )}




        {/* Create Rental Agreement Modal - Document-style (matches print Hiring Machine Agreement) */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-2 border-slate-700 dark:border-slate-600" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              {/* Modal header bar - close only */}
              <div className="flex-shrink-0 flex items-center justify-end px-4 py-2 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
                <button
                  onClick={handleCloseCreateModal}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitCreate(); }} className="p-6 sm:p-8">
                  {/* Document-style header: NEEDLE / Supplier text / HIRING MACHINE AGREEMENT */}
                  <div className="mb-6">
                    <div className="flex flex-row items-center justify-between gap-4 mb-2">
                      <div className="flex-shrink-0">
                        <div className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">NEEDLE</div>
                        <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-0.5">TECHNOLOGIES CO.(PVT) LTD.</div>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-400 text-right flex-1">
                        {LETTERHEAD_COMPANY_INFO.tagline}
                      </p>
                    </div>
                    <div className="border-b-2 border-gray-800 dark:border-slate-600 mt-3 mb-4" />
                    <h1 className="text-center text-xl sm:text-2xl font-bold uppercase text-gray-900 dark:text-white tracking-wide">
                      Hiring Machine Agreement
                    </h1>
                  </div>

                  {/* Agreement details: Customer | Agreement No & Date of Issue */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Customer: </span>
                        <div className="mt-1">
                          <SearchableSelect
                            value={customerId}
                            onChange={setCustomerId}
                            options={customerOptions}
                            placeholder="Select a customer"
                            error={formErrors.customerId}
                            className="max-w-full"
                          />
                          {formErrors.customerId && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.customerId}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Address: </span>
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="Enter address"
                          className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-3 sm:text-right">
                      <div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Agreement: </span>
                        <span className="text-sm text-gray-900 dark:text-white">-{agreementNo || '—'}</span>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date of Issue: </span>
                        <input
                          type="date"
                          value={agreementDate}
                          onChange={(e) => setAgreementDate(e.target.value)}
                          className={`ml-1 px-2 py-1 border rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.agreementDate ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                        />
                        {formErrors.agreementDate && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.agreementDate}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-left sm:text-right">
                        <div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Start: </span>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className={`w-full mt-0.5 px-2 py-1 border rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.startDate ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                          />
                          {formErrors.startDate && <p className="text-xs text-red-600">{formErrors.startDate}</p>}
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">End: </span>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className={`w-full mt-0.5 px-2 py-1 border rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.endDate ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                          />
                          {formErrors.endDate && <p className="text-xs text-red-600">{formErrors.endDate}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hired Machines table - matches print layout */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Hired Machines</h3>
                      <button
                        type="button"
                        onClick={handleAddMachine}
                        className="px-3 py-1.5 bg-blue-600 dark:bg-indigo-600 text-white text-xs font-medium rounded hover:bg-blue-700 dark:hover:bg-indigo-700 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Machine
                      </button>
                    </div>
                    <div className="border border-gray-800 dark:border-slate-600 rounded overflow-visible">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="bg-gray-100 dark:bg-slate-700">
                            <th className="border border-gray-800 dark:border-slate-600 px-2 py-2 text-left font-semibold text-gray-900 dark:text-white overflow-visible">
                              Model - Description
                            </th>
                            <th className="border border-gray-800 dark:border-slate-600 px-2 py-2 text-center font-semibold text-gray-900 dark:text-white w-28">
                              Serial No
                            </th>
                            <th className="border border-gray-800 dark:border-slate-600 px-2 py-2 text-center font-semibold text-gray-900 dark:text-white w-28">
                              Motor / Box No
                            </th>
                            <th className="border border-gray-800 dark:border-slate-600 px-2 py-2 text-center font-semibold text-gray-900 dark:text-white w-24">
                              Monthly Res
                            </th>
                            <th className="border border-gray-800 dark:border-slate-600 w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {machines.map((machine, index) => (
                            <tr key={machine.id} className="bg-white dark:bg-slate-800">
                              <td className="border border-gray-800 dark:border-slate-600 px-2 py-1.5 align-top overflow-visible relative">
                                <div className="flex flex-wrap gap-1">
                                  <SearchableSelect
                                    value={machine.brand}
                                    onChange={(v) => handleMachineChange(machine.id, 'brand', v)}
                                    options={brandOptions}
                                    placeholder="Brand"
                                    error={formErrors[`machine_brand_${index}`]}
                                    className="min-w-[80px] flex-1"
                                    dropdownClassName="z-[100]"
                                    usePortal
                                  />
                                  <SearchableSelect
                                    value={machine.model}
                                    onChange={(v) => handleMachineChange(machine.id, 'model', v)}
                                    options={getModelOptions(machine.brand)}
                                    placeholder="Model"
                                    disabled={!machine.brand}
                                    error={formErrors[`machine_model_${index}`]}
                                    className="min-w-[80px] flex-1"
                                    dropdownClassName="z-[100]"
                                    usePortal
                                  />
                                  <SearchableSelect
                                    value={machine.type}
                                    onChange={(v) => handleMachineChange(machine.id, 'type', v)}
                                    options={typeOptions}
                                    placeholder="Type"
                                    error={formErrors[`machine_type_${index}`]}
                                    className="min-w-[80px] flex-1"
                                    dropdownClassName="z-[100]"
                                    usePortal
                                  />
                                </div>
                                {getMachineDescription(machine) && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">
                                    {getMachineDescription(machine)}
                                  </div>
                                )}
                                {formErrors[`machine_brand_${index}`] && (
                                  <p className="text-xs text-red-600 mt-0.5">{formErrors[`machine_brand_${index}`]}</p>
                                )}
                              </td>
                              <td className="border border-gray-800 dark:border-slate-600 px-2 py-1 align-top">
                                <input
                                  type="text"
                                  value={machine.serialNo}
                                  onChange={(e) => handleMachineChange(machine.id, 'serialNo', e.target.value)}
                                  placeholder="e.g. SN-2024-001"
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-white bg-white dark:bg-slate-700 text-center text-sm"
                                />
                              </td>
                              <td className="border border-gray-800 dark:border-slate-600 px-2 py-1 align-top">
                                <input
                                  type="text"
                                  value={machine.motorBoxNo}
                                  onChange={(e) => handleMachineChange(machine.id, 'motorBoxNo', e.target.value)}
                                  placeholder="e.g. BOX-2024-001"
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-white bg-white dark:bg-slate-700 text-center text-sm"
                                />
                              </td>
                              <td className="border border-gray-800 dark:border-slate-600 px-2 py-1 align-top">
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={machine.standardPrice || ''}
                                  onChange={(e) => handleMachineChange(machine.id, 'standardPrice', parseFloat(e.target.value) || 0)}
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-white bg-white dark:bg-slate-700 text-right text-sm"
                                  placeholder="0"
                                />
                              </td>
                              <td className="border border-gray-800 dark:border-slate-600 px-1 py-1 align-middle text-center">
                                {machines.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMachine(machine.id)}
                                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                    aria-label="Remove row"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Add-ons (Optional) - after machines, before Total */}
                  <div className="mb-6 border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Add-ons (Optional)</span>
                      <button
                        type="button"
                        onClick={handleAddAddOn}
                        className="px-3 py-1.5 bg-gray-600 dark:bg-slate-600 text-white text-xs font-medium rounded hover:bg-gray-700 dark:hover:bg-slate-700 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Add-on
                      </button>
                    </div>
                    <div className="p-4 space-y-3">
                      {addOns.length > 0 ? (
                        addOns.map((addOn) => (
                          <div key={addOn.id} className="p-3 border border-gray-200 dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-700/30 flex flex-wrap items-center gap-3">
                            <select
                              value={addOn.addOnId}
                              onChange={(e) => handleAddOnChange(addOn.id, 'addOnId', e.target.value)}
                              className="px-2 py-1 border rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            >
                              <option value="">Select add-on</option>
                              {mockAddOns.map((ao) => (
                                <option key={ao.id} value={ao.id}>{ao.name} - Rs. {ao.price.toLocaleString('en-LK')}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="1"
                              value={addOn.quantity}
                              onChange={(e) => handleAddOnChange(addOn.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 border rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                            <button type="button" onClick={() => handleRemoveAddOn(addOn.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">No add-ons added.</p>
                      )}
                    </div>
                    {/* Total: after machines + add-ons */}
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/30">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Total: {pricing.totalPrice.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  {/* Terms & Conditions - read-only (same as print) */}
                  <div className="mb-6">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Terms & Conditions</h3>
                    <div className="space-y-1.5 text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-slate-700/40 rounded p-4 border border-gray-200 dark:border-slate-600">
                      <p><span className="font-semibold">(01)</span> You have to be paid in cash double monthly rental fee on the date of rent machine issues. The excess payment would be immediately return to you as and when you returned the hired machine within the stipulated period.</p>
                      <p><span className="font-semibold">(02)</span> Above payment has to be paid 05 days prior to next month.</p>
                      <p><span className="font-semibold">(03)</span> Customer has to take total responsibility with regard to security of the machine.</p>
                      <p><span className="font-semibold">(04)</span> Both the parties can withdraw or return the machine with one month prior notice.</p>
                      <p><span className="font-semibold">(05)</span> Company will examine the machine at the point of returning and will release due security deposit.</p>
                    </div>
                  </div>

                  {/* Signature section - two columns (signature empty by default; only user-entered value shown/printed) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Customer Signature</div>
                      <div className="text-sm text-gray-900 dark:text-white border-b border-gray-800 dark:border-slate-600 pb-2 min-h-[2rem] print:min-h-[2rem]">
                        {signature || ''}
                      </div>
                      <input
                        type="text"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        placeholder="Enter signature (leave blank for print)"
                        className="mt-1 w-full px-2 py-1 border border-gray-300 dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                      />
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">(Agreed upon the terms & Conditions)</div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">ID NO: </span>
                        <input
                          type="text"
                          value={customerIdNo}
                          onChange={(e) => setCustomerIdNo(e.target.value)}
                          placeholder="e.g. 123456789V"
                          className={`ml-1 px-2 py-1 border rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white inline-block min-w-[140px] ${formErrors.customerIdNo ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                        />
                        {formErrors.customerIdNo && <p className="text-xs text-red-600 mt-0.5">{formErrors.customerIdNo}</p>}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Full Name: </span>
                        <input
                          type="text"
                          value={customerFullName}
                          onChange={(e) => setCustomerFullName(e.target.value)}
                          placeholder="Full name"
                          className={`ml-1 px-2 py-1 border rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white inline-block min-w-[140px] ${formErrors.customerFullName ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                        />
                        {formErrors.customerFullName && <p className="text-xs text-red-600 mt-0.5">{formErrors.customerFullName}</p>}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date: </span>
                        <input
                          type="date"
                          value={customerSignatureDate}
                          onChange={(e) => setCustomerSignatureDate(e.target.value)}
                          className={`ml-1 px-2 py-1 border rounded text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors.customerSignatureDate ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                        />
                        {formErrors.customerSignatureDate && <p className="text-xs text-red-600 mt-0.5">{formErrors.customerSignatureDate}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Company footer - matches print */}
                  <div className="bg-slate-700 dark:bg-slate-800 text-white rounded-lg px-4 py-3 mb-6 text-center text-xs">
                    <div>{LETTERHEAD_COMPANY_INFO.address}</div>
                    <div className="mt-0.5">
                      Tel: {LETTERHEAD_COMPANY_INFO.telephone.join(', ')} Fax: {LETTERHEAD_COMPANY_INFO.fax}
                    </div>
                    <div>Email: {LETTERHEAD_COMPANY_INFO.email}</div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={handleCloseCreateModal}
                      className="px-5 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium text-sm"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 dark:bg-indigo-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Create Agreement
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}




        {/* Update Rental Agreement Modal */}
        {isUpdateModalOpen && selectedAgreement && (
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Update Hiring Machine Agreement Details
                </h2>
                <button
                  onClick={handleCloseUpdateModal}
                  className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <UpdateForm
                  title=""
                  fields={updateFields}
                  onSubmit={handleAgreementUpdate}
                  onClear={handleClear}
                  submitButtonLabel="Update Agreement"
                  clearButtonLabel="Reset"
                  loading={isSubmitting}
                  initialData={getUpdateInitialData(selectedAgreement)}
                  className="shadow-none border-0 p-0"
                  customSections={renderMachineManagementSection()}
                />
              </div>
            </div>
          </div>
        )}

        {/* QR Scanner popup: separate modal when scanning a category (mobile responsive) */}
        {isUpdateModalOpen && selectedAgreement && activeScanCategoryIndex !== null && (() => {
          const categories = getExpectedCategories(selectedAgreement);
          const cat = categories[activeScanCategoryIndex];
          const scanned = machinesForAgreement.filter((m) => m.categoryIndex === activeScanCategoryIndex).length;
          const required = cat?.quantity ?? 0;
          const categoryLabel = cat ? [cat.brand, cat.model, cat.type].filter(Boolean).join(' ') || 'Machine' : 'Machine';
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm print:hidden">
              <div className="flex flex-col w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                      Scan — {categoryLabel}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {scanned} of {required} scanned
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveScanCategoryIndex(null)}
                    className="flex-shrink-0 p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors"
                    aria-label="Close scanner"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 min-h-[240px] sm:min-h-[320px] max-h-[50vh] sm:max-h-[55vh] rounded-b-xl overflow-hidden bg-gray-900 dark:bg-black">
                    <QRScannerComponent
                      key={scannerKey}
                      onScanSuccess={handleInlineQRScanSuccess}
                      autoClose={false}
                      showCloseButton={false}
                      title="Scan machine QR"
                      subtitle={`${scanned}/${required} for this category`}
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:px-5 sm:py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                  <button
                    type="button"
                    onClick={() => setActiveScanCategoryIndex(null)}
                    className="w-full sm:w-auto order-2 sm:order-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                  >
                    Back to categories
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveScanCategoryIndex(null)}
                    className="w-full sm:flex-1 order-1 sm:order-2 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 dark:bg-green-700 rounded-xl hover:bg-green-700 dark:hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Generate Gatepass Modal */}
        {isGatePassModalOpen && selectedAgreement && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Generate Gatepass
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Agreement: {selectedAgreement.agreementNo}
                  </p>
                </div>
                <button
                  onClick={handleCloseGatePassModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 relative">
                {!generatedGatePass ? (
                  // Gatepass Form
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Vehicle Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                          placeholder="Enter vehicle number"
                          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Driver Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                          placeholder="Enter driver name"
                          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Returnable
                        </label>
                        <select
                          value={returnable ? 'true' : 'false'}
                          onChange={(e) => setReturnable(e.target.value === 'true')}
                          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                        >
                          <option value="true">YES</option>
                          <option value="false">NO</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Entry
                        </label>
                        <select
                          value={entry}
                          onChange={(e) => setEntry(e.target.value as 'IN' | 'OUT')}
                          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                        >
                          <option value="OUT">OUT</option>
                          <option value="IN">IN</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Issued By
                        </label>
                        <input
                          type="text"
                          value={issuedBy}
                          onChange={(e) => setIssuedBy(e.target.value)}
                          placeholder="Enter issuer name (optional)"
                          className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={handleCloseGatePassModal}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateGatePass}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 dark:bg-green-700 rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
                      >
                        Generate Gatepass
                      </button>
                    </div>
                  </div>
                ) : (
                  // Generated Gatepass View with sticky buttons
                  <div className="relative">
                    {/* Sticky Header with Buttons */}
                    <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 pb-4 mb-4 border-b border-gray-200 dark:border-slate-700 -mx-6 px-6 pt-2 -mt-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Gatepass Generated
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Gatepass No: {generatedGatePass.gatepassNo}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={handlePrintGatePass}
                            className="px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 flex items-center space-x-2"
                          >
                            <Printer className="w-4 h-4" />
                            <span>Print</span>
                          </button>
                          <button
                            onClick={() => setGeneratedGatePass(null)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                          >
                            Edit Details
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Gatepass Content */}
                    <div className="print:hidden">
                      {renderGatePassDocument(generatedGatePass)}
                    </div>
                    <div className="hidden print:block">
                      {renderGatePassDocument(generatedGatePass)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RentalAgreementPage;