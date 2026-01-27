'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import UpdateForm from '@/src/components/form-popup/update';
import { Eye, Pencil, X, Plus, Trash2, Printer, FileText, ExternalLink, QrCode, Truck } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import { useRouter } from 'next/navigation';

type RentalStatus = 'Active' | 'Completed' | 'Cancelled' | 'Pending';

interface RentalAgreement {
  id: number;
  agreementNo: string;
  customerNo: string;
  customerName: string;
  serialNo: string;
  startDate: string;
  endDate: string | null;
  monthlyRent: number;
  outstanding: number;
  status: RentalStatus;
  purchaseRequestId?: number;
  purchaseRequestNumber?: string;
  expectedMachines?: number;
  addedMachines?: number;
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
  id: number;
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
  purchaseRequestId?: number;
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

// Machine interface for create form
interface MachineItem {
  id: string;
  brand: string;
  model: string;
  type: string;
  quantity: number;
  standardPrice: number;
}

// Add-on interface for create form
interface AddOnItem {
  id: string;
  machineId: string;
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
}

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

// Mock rental agreement data
const mockRentalAgreements: RentalAgreement[] = [
  {
    id: 1,
    agreementNo: 'RA24010001',
    customerNo: 'CUST-001',
    customerName: 'ABC Holdings (Pvt) Ltd',
    serialNo: 'SN-2024-002',
    startDate: '2024-01-15',
    endDate: '2024-04-15',
    monthlyRent: 50000,
    outstanding: 120000,
    status: 'Active',
    purchaseRequestId: 1,
    purchaseRequestNumber: 'PO24010001',
    expectedMachines: 2,
    addedMachines: 2,
  },
  {
    id: 2,
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
    id: 3,
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
    id: 4,
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
    id: 5,
    agreementNo: 'RA24010005',
    customerNo: 'CUST-005',
    customerName: 'Mega Constructions',
    serialNo: 'SN-2024-005',
    startDate: '2024-04-01',
    endDate: '2024-07-01',
    monthlyRent: 60000,
    outstanding: 180000,
    status: 'Pending',
    purchaseRequestId: 3,
    purchaseRequestNumber: 'PO24010003',
    expectedMachines: 15,
    addedMachines: 10,
  },
  {
    id: 6,
    agreementNo: 'RA24010006',
    customerNo: 'CUST-006',
    customerName: 'VIHANGA SHADE STRUCTURES',
    serialNo: '2LIDH01733',
    startDate: '2026-01-02',
    endDate: '2026-08-01',
    monthlyRent: 17000,
    outstanding: 0,
    status: 'Active',
  },
];

// Mock function to get rental agreement detail data with multiple machines
const getRentalAgreementInfo = (agreementId: number): RentalAgreementInfo => {
  const agreement = mockRentalAgreements.find((r) => r.id === agreementId);
  const customer = mockCustomers.find((c) => c.id === agreement?.customerNo);
  
  if (agreementId === 6) {
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
      id: agreement?.id || 0,
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
    id: agreement?.id || 0,
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
    label: 'Purchase Request',
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
  const router = useRouter();
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
    { id: '1', brand: '', model: '', type: '', quantity: 1, standardPrice: 0 },
  ]);
  const [addOns, setAddOns] = useState<AddOnItem[]>([]);
  const [signature, setSignature] = useState('');
  const [agreementDate, setAgreementDate] = useState('');
  const [customerIdNo, setCustomerIdNo] = useState('');
  const [customerFullName, setCustomerFullName] = useState('');
  const [customerSignatureDate, setCustomerSignatureDate] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Machine management state for update form
  const [machinesForAgreement, setMachinesForAgreement] = useState<MachineForAgreement[]>([]);
  const [qrScannerWindow, setQrScannerWindow] = useState<Window | null>(null);
  const [manualMachineInput, setManualMachineInput] = useState({
    description: '',
    serialNumber: '',
    boxNumber: '',
  });
  const [machineErrors, setMachineErrors] = useState<Record<string, string>>({});

  // Listen for messages from QR scanner popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'QR_SCAN_RESULT') {
        handleQRScanSuccess(event.data.qrData);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Calculate pricing
  const pricing = useMemo(() => {
    let totalMachinePrice = 0;
    machines.forEach((machine) => {
      if (machine.type && machine.quantity > 0) {
        const pricePerMachine = standardPrices[machine.type] || 0;
        machine.standardPrice = pricePerMachine;
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

  const handleCreateAgreement = () => {
    setIsCreateModalOpen(true);
    setCustomerId('');
    setStartDate('');
    setEndDate('');
    setMachines([{ id: '1', brand: '', model: '', type: '', quantity: 1, standardPrice: 0 }]);
    setAddOns([]);
    setSignature('');
    setAgreementDate('');
    setCustomerIdNo('');
    setCustomerFullName('');
    setCustomerSignatureDate('');
    setFormErrors({});
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setCustomerId('');
    setStartDate('');
    setEndDate('');
    setMachines([{ id: '1', brand: '', model: '', type: '', quantity: 1, standardPrice: 0 }]);
    setAddOns([]);
    setSignature('');
    setAgreementDate('');
    setCustomerIdNo('');
    setCustomerFullName('');
    setCustomerSignatureDate('');
    setFormErrors({});
  };

  const handleAddMachine = () => {
    setMachines([
      ...machines,
      { id: Date.now().toString(), brand: '', model: '', type: '', quantity: 1, standardPrice: 0 },
    ]);
  };

  const handleRemoveMachine = (id: string) => {
    if (machines.length > 1) {
      setMachines(machines.filter((m) => m.id !== id));
      setAddOns(addOns.filter((a) => a.machineId !== id));
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

  const handleAddAddOn = () => {
    setAddOns([
      ...addOns,
      { id: Date.now().toString(), machineId: '', addOnId: '', quantity: 1, price: 0 },
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
      if (!addOn.machineId) errors[`addon_machine_${index}`] = 'Machine ID is required';
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
      const selectedCustomer = mockCustomers.find((c) => c.id === customerId);
      const payload = {
        customerId,
        customerName: selectedCustomer?.name || '',
        startDate,
        endDate,
        machines,
        addOns,
        pricing,
        signature,
        agreementDate,
        customerIdNo,
        customerFullName,
        customerSignatureDate,
      };

      console.log('Create rental agreement payload:', payload);
      alert(`Rental Agreement created successfully (frontend only).`);
      handleCloseCreateModal();
    } catch (error) {
      console.error('Error creating rental agreement:', error);
      alert('Failed to create rental agreement. Please try again.');
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
  };

  const handlePrintAgreement = () => {
    window.print();
  };

  const handleViewPurchaseRequest = (purchaseRequestId?: number) => {
    if (purchaseRequestId) {
      router.push(`/purchase-order?highlight=${purchaseRequestId}`);
    }
  };

  const handleUpdateAgreement = (agreement: RentalAgreement) => {
    setSelectedAgreement(agreement);
    setIsUpdateModalOpen(true);
    setMachinesForAgreement([]);
    setManualMachineInput({ description: '', serialNumber: '', boxNumber: '' });
    setMachineErrors({});
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedAgreement(null);
    setMachinesForAgreement([]);
    setManualMachineInput({ description: '', serialNumber: '', boxNumber: '' });
    setMachineErrors({});
    if (qrScannerWindow && !qrScannerWindow.closed) {
      qrScannerWindow.close();
      setQrScannerWindow(null);
    }
  };

  const handleRemoveMachineFromAgreement = (machineId: string) => {
    const updated = machinesForAgreement.filter((m) => m.id !== machineId);
    setMachinesForAgreement(updated);
    checkAndUpdateStatus(updated);
  };

  const checkAndUpdateStatus = (currentMachines: MachineForAgreement[]) => {
    if (!selectedAgreement || selectedAgreement.status !== 'Pending') return;
    
    const expected = selectedAgreement.expectedMachines || 0;
    const added = currentMachines.length;
    
    if (expected > 0 && added >= expected) {
      setSelectedAgreement({
        ...selectedAgreement,
        status: 'Active',
        addedMachines: added,
      });
    } else {
      setSelectedAgreement({
        ...selectedAgreement,
        addedMachines: added,
      });
    }
  };

  const handleQRScanSuccess = (qrData: string) => {
    try {
      const machineData = JSON.parse(qrData);
      
      const newMachine: MachineForAgreement = {
        id: Date.now().toString(),
        description: `${machineData.brandName || ''} ${machineData.modelName || ''} ${machineData.typeName || ''}`.trim(),
        serialNumber: machineData.serialNumber || '',
        boxNumber: machineData.boxNumber || '',
        brandName: machineData.brandName,
        modelName: machineData.modelName,
        typeName: machineData.typeName,
        scannedAt: new Date().toISOString(),
      };

      setMachinesForAgreement([...machinesForAgreement, newMachine]);
      
      if (qrScannerWindow && !qrScannerWindow.closed) {
        qrScannerWindow.close();
        setQrScannerWindow(null);
      }
      
      checkAndUpdateStatus([...machinesForAgreement, newMachine]);
    } catch (error) {
      console.error('Error parsing QR code:', error);
      alert('Invalid QR code format. Please try again.');
    }
  };

  const handleOpenQRScanner = () => {
    const flutterAppUrl = process.env.NEXT_PUBLIC_QR_SCANNER_URL || 'http://localhost:8080';
    
    const width = 600;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open(
      flutterAppUrl,
      'QRScanner',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    
    if (popup) {
      setQrScannerWindow(popup);
      
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setQrScannerWindow(null);
        }
      }, 500);
    } else {
      alert('Please allow popups for this site to use the QR scanner.');
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

  const handleCreateGatePass = () => {
    if (!selectedAgreement) return;

    // Validate required fields
    if (!vehicleNumber.trim() || !driverName.trim()) {
      alert('Please fill in Vehicle Number and Driver Name');
      return;
    }

    const agreementInfo = getRentalAgreementInfo(selectedAgreement.id);
    const customer = mockCustomers.find((c) => c.id === selectedAgreement.customerNo);
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
      toAddress: customer?.address || agreementInfo.customerAddress || '',
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
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        machines: machinesForAgreement,
        addedMachines: machinesForAgreement.length,
      };
      console.log('Update rental agreement payload:', payload);
      alert(`Rental Agreement "${data.agreementNo}" updated with ${machinesForAgreement.length} machine(s) (frontend only).`);
      handleCloseUpdateModal();
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

  // Render Rental Agreement Document for Printing
  const renderRentalAgreementDocument = (agreementInfo: RentalAgreementInfo) => {
    const totalMonthlyRent = agreementInfo.machines.reduce((sum, machine) => sum + machine.monthlyRent, 0);
    
    return (
      <div className="bg-white p-8 max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
          <div className="flex items-center justify-center mb-2">
            <div className="text-3xl font-bold text-gray-900">NEEDLE TECHNOLOGIES</div>
          </div>
          <div className="text-sm text-gray-700 mt-1">
            Supplier of industrial Sewing Machines and Accessories
          </div>
          <div className="text-4xl font-bold text-gray-900 mt-2">HIRING MACHINE AGREEMENT</div>
        </div>

        {/* Agreement Details */}
        <div className="mb-6 space-y-3">
          <div>
            <span className="text-sm font-semibold text-gray-700">Customer:</span>
            <span className="ml-2 text-sm text-gray-900">{agreementInfo.customerName}</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-700">Address:</span>
            <span className="ml-2 text-sm text-gray-900">{agreementInfo.customerAddress || 'N/A'}</span>
          </div>
          <div className="flex space-x-6">
            <div>
              <span className="text-sm font-semibold text-gray-700">Agreement:</span>
              <span className="ml-2 text-sm text-gray-900">{agreementInfo.agreementNo || 'TBD'}</span>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-700">Date of Issue:</span>
              <span className="ml-2 text-sm text-gray-900">
                {agreementInfo.startDate ? new Date(agreementInfo.startDate).toLocaleDateString('en-LK', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                }) : 'TBD'}
              </span>
            </div>
            {agreementInfo.purchaseRequestNumber && (
              <div>
                <span className="text-sm font-semibold text-gray-700">Purchase Request:</span>
                <span className="ml-2 text-sm text-gray-900">{agreementInfo.purchaseRequestNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Machines Table */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-gray-800">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-800 px-4 py-2 text-left text-sm font-semibold text-gray-900">
                  Model - Description
                </th>
                <th className="border border-gray-800 px-4 py-2 text-center text-sm font-semibold text-gray-900">
                  Serial No
                </th>
                <th className="border border-gray-800 px-4 py-2 text-center text-sm font-semibold text-gray-900">
                  Motor / Box No
                </th>
                <th className="border border-gray-800 px-4 py-2 text-center text-sm font-semibold text-gray-900">
                  Monthly Rent
                </th>
                <th className="border border-gray-800 px-4 py-2 text-center text-sm font-semibold text-gray-900">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {agreementInfo.machines.map((machine, index) => (
                <tr key={index}>
                  <td className="border border-gray-800 px-4 py-2 text-sm text-gray-900">
                    {machine.machineDescription}
                  </td>
                  <td className="border border-gray-800 px-4 py-2 text-center text-sm text-gray-900">
                    {machine.serialNo}
                  </td>
                  <td className="border border-gray-800 px-4 py-2 text-center text-sm text-gray-900">
                    {machine.motorBoxNo || 'N/A'}
                  </td>
                  <td className="border border-gray-800 px-4 py-2 text-center text-sm text-gray-900">
                    Rs. {machine.monthlyRent.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-gray-800 px-4 py-2 text-center text-sm text-gray-900">
                    Rs. {machine.monthlyRent.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={3} className="border border-gray-800 px-4 py-2 text-right text-sm text-gray-900">
                  Total Monthly Rent:
                </td>
                <td className="border border-gray-800 px-4 py-2 text-center text-sm text-gray-900">
                  Rs. {totalMonthlyRent.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-gray-800 px-4 py-2 text-center text-sm text-gray-900">
                  Rs. {totalMonthlyRent.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
          
          {agreementInfo.additionalParts && (
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-700 mb-1">Additional Parts:</div>
              <div className="text-sm text-gray-900">{agreementInfo.additionalParts}</div>
            </div>
          )}
        </div>

        {/* Terms & Conditions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h3>
          <div className="space-y-3 text-sm text-gray-900">
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

        {/* Customer Signature Section */}
        <div className="mb-6">
          <div className="mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-2">Customer Signature:</div>
            <div className="border-b border-gray-800 pb-2 min-h-[50px]">
              {agreementInfo.customerSignature && (
                <div className="text-sm text-gray-900">{agreementInfo.customerSignature}</div>
              )}
            </div>
            <div className="text-xs text-gray-600 mt-1">(Agreed upon the terms & Conditions)</div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">ID NO:</div>
              <div className="text-sm text-gray-900">{agreementInfo.customerIdNo || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Full Name:</div>
              <div className="text-sm text-gray-900">{agreementInfo.customerFullName || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Date:</div>
              <div className="text-sm text-gray-900">
                {agreementInfo.customerSignatureDate 
                  ? new Date(agreementInfo.customerSignatureDate).toLocaleDateString('en-LK', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-300 pt-4 mt-6">
          <div className="text-xs text-gray-700 text-center">
            No. 137M, Colombo Road, Biyagama, Tel: 0112488735, 011-5737712 Fax: 2487623, Email: needletec@sitnet.lk
          </div>
        </div>
      </div>
    );
  };

  // Machine Management Section Component
  const renderMachineManagementSection = () => {
    if (!selectedAgreement) return null;

    const expectedMachines = selectedAgreement.expectedMachines || 0;
    const addedMachines = machinesForAgreement.length;
    const remainingMachines = expectedMachines - addedMachines;
    const isComplete = expectedMachines > 0 && addedMachines >= expectedMachines;

    return (
      <div className="space-y-4">
        <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Machines for this Agreement
            </h3>
            {expectedMachines > 0 && (
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Progress: <span className="font-semibold text-gray-900 dark:text-white">{addedMachines}/{expectedMachines}</span>
                </div>
                {isComplete && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
                    All Machines Added
                  </span>
                )}
              </div>
            )}
          </div>

          {expectedMachines > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Machine Addition Progress
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {Math.round((addedMachines / expectedMachines) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    isComplete
                      ? 'bg-green-600 dark:bg-green-500'
                      : 'bg-blue-600 dark:bg-blue-500'
                  }`}
                  style={{ width: `${Math.min((addedMachines / expectedMachines) * 100, 100)}%` }}
                />
              </div>
              {remainingMachines > 0 && (
                <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                  {remainingMachines} machine(s) remaining to be added
                </p>
              )}
            </div>
          )}

          <div className="mb-4">
            <button
              type="button"
              onClick={handleOpenQRScanner}
              disabled={isComplete || qrScannerWindow !== null}
              className="w-full px-4 py-3 bg-green-600 dark:bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <QrCode className="w-5 h-5" />
              <span>
                {qrScannerWindow && !qrScannerWindow.closed
                  ? 'QR Scanner Window Open'
                  : 'Open QR Scanner (Flutter App)'}
              </span>
            </button>
            {qrScannerWindow && !qrScannerWindow.closed && (
              <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 text-center">
                QR Scanner window is open. Scan a QR code to add a machine.
              </p>
            )}
          </div>

          {machinesForAgreement.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Added Machines ({machinesForAgreement.length})
              </h4>
              <div className="space-y-2">
                {machinesForAgreement.map((machine) => (
                  <div
                    key={machine.id}
                    className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {machine.description}
                      </p>
                      <div className="flex space-x-4 mt-1 text-xs text-gray-600 dark:text-gray-400">
                        <span>Serial: {machine.serialNumber}</span>
                        <span>Box: {machine.boxNumber}</span>
                        {machine.scannedAt && (
                          <span>
                            Scanned: {new Date(machine.scannedAt).toLocaleString('en-LK')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMachineFromAgreement(machine.id)}
                      className="ml-4 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isComplete && selectedAgreement.status === 'Pending' && (
            <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>✓ All machines have been added!</strong> The agreement status will be automatically updated to "Active" when you save.
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

    const agreementInfo = getRentalAgreementInfo(selectedAgreement.id);

    return (
      <div>
        <div className="print:hidden">
          <div className="space-y-6">
            {renderRentalAgreementDocument(agreementInfo)}
          </div>
        </div>
        
        <div className="hidden print:block print:fixed print:inset-0 print:z-50 print:bg-white print:p-0 print:m-0">
          {renderRentalAgreementDocument(agreementInfo)}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Print-only rental agreement document */}
      {selectedAgreement && (
        <div className="hidden print:block print:fixed print:inset-0 print:z-[9999] print:bg-white">
          {renderRentalAgreementDocument(getRentalAgreementInfo(selectedAgreement.id))}
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
        <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${
          isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
        }`}>
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Page header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Rental Agreement</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Overview of all rental agreements with their details, customer information, and
                  outstanding balances. Rental agreements can be created from purchase requests.
                </p>
              </div>
              <Tooltip content="Create Rental Agreement">
                <button
                  onClick={handleCreateAgreement}
                  className="px-6 py-2.5 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
                >
                  Create Rental Agreement
                </button>
              </Tooltip>
            </div>

            {/* Rental Agreement table card */}
            <Table
              data={mockRentalAgreements}
              columns={columns}
              actions={actions}
              itemsPerPage={10}
              searchable
              filterable
              getRowClassName={getRowClassName}
              emptyMessage="No rental agreements found."
            />
          </div>
        </main>

        {/* View Rental Agreement Modal */}
        {isViewModalOpen && selectedAgreement && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Rental Agreement Details
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {selectedAgreement.agreementNo}
                  </p>
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

        {/* Update Rental Agreement Modal */}
        {isUpdateModalOpen && selectedAgreement && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Update Rental Agreement
                </h2>
                <button
                  onClick={handleCloseUpdateModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <UpdateForm
                  title="Update Rental Agreement Details"
                  fields={updateFields}
                  onSubmit={handleAgreementUpdate}
                  onClear={handleClear}
                  submitButtonLabel="Update"
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