'use client';

import React, { useState, useMemo } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import UpdateForm from '@/src/components/form-popup/update';
import QRScannerComponent from '@/src/components/qr-scanner';
import { Eye, Pencil, X, Plus, Trash2, Printer } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';

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
}

// Rental Agreement Detail Data Types
interface RentalAgreementInfo {
  id: number;
  agreementNo: string;
  customerNo: string;
  customerName: string;
  customerAddress?: string;
  serialNo: string;
  machineBrand: string;
  machineModel: string;
  machineType: string;
  machineDescription: string;
  motorBoxNo?: string;
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
  description: string; // brandName + modelName + typeName
  serialNumber: string;
  boxNumber: string;
  brandName?: string;
  modelName?: string;
  typeName?: string;
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
    agreementNo: 'RA-2024-001',
    customerNo: 'CUST-001',
    customerName: 'ABC Holdings (Pvt) Ltd',
    serialNo: 'SN-2024-002',
    startDate: '2024-01-15',
    endDate: '2024-04-15',
    monthlyRent: 50000,
    outstanding: 120000,
    status: 'Active',
  },
  {
    id: 2,
    agreementNo: 'RA-2024-002',
    customerNo: 'CUST-002',
    customerName: 'John Perera',
    serialNo: 'SN-2024-004',
    startDate: '2024-03-01',
    endDate: '2024-06-01',
    monthlyRent: 35000,
    outstanding: 70000,
    status: 'Active',
  },
  {
    id: 3,
    agreementNo: 'RA-2024-003',
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
    agreementNo: 'RA-2024-004',
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
    agreementNo: 'RA-2024-005',
    customerNo: 'CUST-005',
    customerName: 'Mega Constructions',
    serialNo: 'SN-2024-005',
    startDate: '2024-04-01',
    endDate: '2024-07-01',
    monthlyRent: 60000,
    outstanding: 180000,
    status: 'Active',
  },
  {
    id: 6,
    agreementNo: 'RA-2024-006',
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

// Mock function to get rental agreement detail data (replace with API call later)
const getRentalAgreementInfo = (agreementId: number): RentalAgreementInfo => {
  const agreement = mockRentalAgreements.find((r) => r.id === agreementId);
  const customer = mockCustomers.find((c) => c.id === agreement?.customerNo);
  
  // Special handling for the example agreement from image
  if (agreementId === 6) {
    return {
      id: agreement?.id || 0,
      agreementNo: agreement?.agreementNo || '',
      customerNo: agreement?.customerNo || '',
      customerName: agreement?.customerName || '',
      customerAddress: customer?.address || '',
      serialNo: agreement?.serialNo || '',
      machineBrand: 'Juki',
      machineModel: 'LK-1903A-SS',
      machineType: 'Electronic Bar Tack Machine',
      machineDescription: 'JUKI LK-1903A-SS - ELECTRONIC BAR TACK MACHINE',
      motorBoxNo: 'NMBDH01171',
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
    };
  }
  
  return {
    id: agreement?.id || 0,
    agreementNo: agreement?.agreementNo || '',
    customerNo: agreement?.customerNo || '',
    customerName: agreement?.customerName || '',
    customerAddress: customer?.address || '',
    serialNo: agreement?.serialNo || '',
    machineBrand: 'Brother',
    machineModel: 'XL2600i',
    machineType: 'Domestic',
    machineDescription: 'BROTHER XL2600i - DOMESTIC SEWING MACHINE',
    motorBoxNo: 'BOX-2024-001',
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
  };
};

// Table column configuration
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
    key: 'serialNo',
    label: 'Serial No',
    sortable: true,
    filterable: true,
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
    render: (value: RentalStatus) => {
      const base =
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
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
  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreement | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  // New fields for customer signature section
  const [customerIdNo, setCustomerIdNo] = useState('');
  const [customerFullName, setCustomerFullName] = useState('');
  const [customerSignatureDate, setCustomerSignatureDate] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Machine management state for update form
  const [machinesForAgreement, setMachinesForAgreement] = useState<MachineForAgreement[]>([]);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [manualMachineInput, setManualMachineInput] = useState({
    description: '',
    serialNumber: '',
    boxNumber: '',
  });
  const [machineErrors, setMachineErrors] = useState<Record<string, string>>({});

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
      .filter((m) => m.label.includes(':')); // Only show if machine is selected
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
    // Reset form
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
      // Remove add-ons associated with this machine
      setAddOns(addOns.filter((a) => a.machineId !== id));
    }
  };

  const handleMachineChange = (id: string, field: keyof MachineItem, value: any) => {
    setMachines(
      machines.map((m) => {
        if (m.id === id) {
          const updated = { ...m, [field]: value };
          // Reset model when brand changes
          if (field === 'brand') {
            updated.model = '';
          }
          // Update standard price when type changes
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
          // Update price when add-on ID changes
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

  const handleUpdateAgreement = (agreement: RentalAgreement) => {
    setSelectedAgreement(agreement);
    setIsUpdateModalOpen(true);
    // Initialize machines from agreement (if any exist)
    // For now, we'll start with empty array
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
  };

  // Machine management handlers for update form
  const handleAddMachineManually = () => {
    const errors: Record<string, string> = {};
    
    if (!manualMachineInput.description.trim()) {
      errors.description = 'Description is required';
    }
    if (!manualMachineInput.serialNumber.trim()) {
      errors.serialNumber = 'Serial number is required';
    }
    if (!manualMachineInput.boxNumber.trim()) {
      errors.boxNumber = 'Box number is required';
    }

    setMachineErrors(errors);

    if (Object.keys(errors).length === 0) {
      const newMachine: MachineForAgreement = {
        id: Date.now().toString(),
        description: manualMachineInput.description.trim(),
        serialNumber: manualMachineInput.serialNumber.trim(),
        boxNumber: manualMachineInput.boxNumber.trim(),
      };

      setMachinesForAgreement([...machinesForAgreement, newMachine]);
      setManualMachineInput({ description: '', serialNumber: '', boxNumber: '' });
      setMachineErrors({});
    }
  };

  const handleRemoveMachineFromAgreement = (machineId: string) => {
    setMachinesForAgreement(machinesForAgreement.filter((m) => m.id !== machineId));
  };

  const handleQRScanSuccess = (qrData: string) => {
    try {
      // Parse QR code data - assuming it's JSON format
      // Format: {"serialNumber": "SN-001", "boxNumber": "BOX-001", "brandName": "Brother", "modelName": "XL2600i", "typeName": "Domestic"}
      const machineData = JSON.parse(qrData);
      
      const newMachine: MachineForAgreement = {
        id: Date.now().toString(),
        description: `${machineData.brandName || ''} ${machineData.modelName || ''} ${machineData.typeName || ''}`.trim(),
        serialNumber: machineData.serialNumber || '',
        boxNumber: machineData.boxNumber || '',
        brandName: machineData.brandName,
        modelName: machineData.modelName,
        typeName: machineData.typeName,
      };

      setMachinesForAgreement([...machinesForAgreement, newMachine]);
      setIsQRScannerOpen(false);
    } catch (error) {
      console.error('Error parsing QR code:', error);
      alert('Invalid QR code format. Please try again.');
    }
  };

  const handleOpenQRScanner = () => {
    setIsQRScannerOpen(true);
  };

  const handleCloseQRScanner = () => {
    setIsQRScannerOpen(false);
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
      name: 'serialNo',
      label: 'Serial Number',
      type: 'text' as const,
      placeholder: 'Enter serial number',
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
      ],
    },
  ];

  // Get initial data for update form
  const getUpdateInitialData = (agreement: RentalAgreement | null) => {
    if (!agreement) return {};

    return {
      agreementNo: agreement.agreementNo,
      customerName: agreement.customerName,
      serialNo: agreement.serialNo,
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
    if (agreement.outstanding > 0) return 'bg-yellow-50/60 dark:bg-yellow-950/20';
    return '';
  };

  // Action buttons
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
  ];

  // Render Rental Agreement Document for Printing (matches the image format exactly)
  const renderRentalAgreementDocument = (agreementInfo: RentalAgreementInfo) => {
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
                  Monthly Res
                </th>
                <th className="border border-gray-800 px-4 py-2 text-center text-sm font-semibold text-gray-900">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-800 px-4 py-2 text-sm text-gray-900">
                  {agreementInfo.machineDescription}
                </td>
                <td className="border border-gray-800 px-4 py-2 text-center text-sm text-gray-900">
                  {agreementInfo.serialNo}
                </td>
                <td className="border border-gray-800 px-4 py-2 text-center text-sm text-gray-900">
                  {agreementInfo.motorBoxNo || 'N/A'}
                </td>
                <td className="border border-gray-800 px-4 py-2 text-center text-sm text-gray-900">
                  Rs. {agreementInfo.monthlyRent.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="border border-gray-800 px-4 py-2 text-center text-sm text-gray-900">
                  Rs. {agreementInfo.monthlyRent.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
    return (
      <div className="space-y-4">
        <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Machines for this Agreement
          </h3>

          {/* Manual Input Method */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Add Machine Manually
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualMachineInput.description}
                  onChange={(e) =>
                    setManualMachineInput({ ...manualMachineInput, description: e.target.value })
                  }
                  placeholder="e.g., Brother XL2600i Domestic"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                    machineErrors.description
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-slate-600'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                />
                {machineErrors.description && (
                  <p className="mt-1 text-sm text-red-500">{machineErrors.description}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Serial Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualMachineInput.serialNumber}
                  onChange={(e) =>
                    setManualMachineInput({ ...manualMachineInput, serialNumber: e.target.value })
                  }
                  placeholder="Enter serial number"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                    machineErrors.serialNumber
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-slate-600'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                />
                {machineErrors.serialNumber && (
                  <p className="mt-1 text-sm text-red-500">{machineErrors.serialNumber}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Box Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualMachineInput.boxNumber}
                  onChange={(e) =>
                    setManualMachineInput({ ...manualMachineInput, boxNumber: e.target.value })
                  }
                  placeholder="Enter box number"
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                    machineErrors.boxNumber
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-slate-600'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                />
                {machineErrors.boxNumber && (
                  <p className="mt-1 text-sm text-red-500">{machineErrors.boxNumber}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddMachineManually}
              className="mt-4 px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 transition-colors"
            >
              Add Machine
            </button>
          </div>

          {/* QR Scanner Method */}
          <div className="mb-4">
            <button
              type="button"
              onClick={handleOpenQRScanner}
              className="w-full px-4 py-3 bg-green-600 dark:bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors flex items-center justify-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              <span>Scan QR Code to Add Machine</span>
            </button>
          </div>

          {/* Added Machines List */}
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
        </div>
      </div>
    );
  };

  // QR Scanner Modal Component
  const renderQRScannerModal = () => {
    if (!isQRScannerOpen) return null;

    return (
      <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-[60] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Scan QR Code
            </h2>
            <button
              onClick={handleCloseQRScanner}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <QRScannerComponent 
              onScanSuccess={handleQRScanSuccess} 
              onClose={handleCloseQRScanner}
            />
          </div>
        </div>
      </div>
    );
  };

  // View Rental Agreement Content - Updated to match image format
  const renderAgreementDetails = () => {
    if (!selectedAgreement) return null;

    const agreementInfo = getRentalAgreementInfo(selectedAgreement.id);

    return (
      <div>
        {/* Screen View */}
        <div className="print:hidden">{renderRentalAgreementDocument(agreementInfo)}</div>
        
        {/* Print View - Only visible when printing */}
        <div className="hidden print:block print:fixed print:inset-0 print:z-50 print:bg-white print:p-0 print:m-0">
          {renderRentalAgreementDocument(agreementInfo)}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Print-only rental agreement document - hidden on screen, visible when printing */}
      {selectedAgreement && (
        <div className="hidden print:block print:fixed print:inset-0 print:z-[9999] print:bg-white">
          {renderRentalAgreementDocument(getRentalAgreementInfo(selectedAgreement.id))}
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
                  outstanding balances.
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

        {/* Create Rental Agreement Modal - UPDATED */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Create Rental Agreement
                </h2>
                <button
                  onClick={handleCloseCreateModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Agreement Details Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Agreement Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Customer <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={customerId}
                          onChange={(e) => setCustomerId(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                            formErrors.customerId
                              ? 'border-red-500'
                              : 'border-gray-300 dark:border-slate-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                        >
                          <option value="">Select Customer</option>
                          {mockCustomers.map((customer) => (
                            <option key={customer.id} value={customer.id}>
                              {customer.name}
                            </option>
                          ))}
                        </select>
                        {formErrors.customerId && (
                          <p className="mt-1 text-sm text-red-500">{formErrors.customerId}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                            formErrors.startDate
                              ? 'border-red-500'
                              : 'border-gray-300 dark:border-slate-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                        />
                        {formErrors.startDate && (
                          <p className="mt-1 text-sm text-red-500">{formErrors.startDate}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          End Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate}
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                            formErrors.endDate
                              ? 'border-red-500'
                              : 'border-gray-300 dark:border-slate-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                        />
                        {formErrors.endDate && (
                          <p className="mt-1 text-sm text-red-500">{formErrors.endDate}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Machines Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Machines</h3>
                      <button
                        type="button"
                        onClick={handleAddMachine}
                        className="inline-flex items-center px-3 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Machine
                      </button>
                    </div>
                    {machines.map((machine, index) => (
                      <div
                        key={machine.id}
                        className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Machine {index + 1}
                          </span>
                          {machines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMachine(machine.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Brand <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={machine.brand}
                              onChange={(e) => handleMachineChange(machine.id, 'brand', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                                formErrors[`machine_brand_${index}`]
                                  ? 'border-red-500'
                                  : 'border-gray-300 dark:border-slate-600'
                              } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                            >
                              <option value="">Select Brand</option>
                              {mockMachineBrands.map((brand) => (
                                <option key={brand} value={brand}>
                                  {brand}
                                </option>
                              ))}
                            </select>
                            {formErrors[`machine_brand_${index}`] && (
                              <p className="mt-1 text-sm text-red-500">
                                {formErrors[`machine_brand_${index}`]}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Model <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={machine.model}
                              onChange={(e) => handleMachineChange(machine.id, 'model', e.target.value)}
                              disabled={!machine.brand}
                              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                                formErrors[`machine_model_${index}`]
                                  ? 'border-red-500'
                                  : 'border-gray-300 dark:border-slate-600'
                              } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <option value="">Select Model</option>
                              {getAvailableModels(machine.brand).map((model) => (
                                <option key={model} value={model}>
                                  {model}
                                </option>
                              ))}
                            </select>
                            {formErrors[`machine_model_${index}`] && (
                              <p className="mt-1 text-sm text-red-500">
                                {formErrors[`machine_model_${index}`]}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={machine.type}
                              onChange={(e) => handleMachineChange(machine.id, 'type', e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                                formErrors[`machine_type_${index}`]
                                  ? 'border-red-500'
                                  : 'border-gray-300 dark:border-slate-600'
                              } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                            >
                              <option value="">Select Type</option>
                              {mockMachineTypes.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                            {formErrors[`machine_type_${index}`] && (
                              <p className="mt-1 text-sm text-red-500">
                                {formErrors[`machine_type_${index}`]}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Number of Machines <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={machine.quantity}
                              onChange={(e) =>
                                handleMachineChange(machine.id, 'quantity', parseInt(e.target.value) || 1)
                              }
                              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                                formErrors[`machine_quantity_${index}`]
                                  ? 'border-red-500'
                                  : 'border-gray-300 dark:border-slate-600'
                              } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                            />
                            {formErrors[`machine_quantity_${index}`] && (
                              <p className="mt-1 text-sm text-red-500">
                                {formErrors[`machine_quantity_${index}`]}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add-ons Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add-ons</h3>
                      <button
                        type="button"
                        onClick={handleAddAddOn}
                        className="inline-flex items-center px-3 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Add-on
                      </button>
                    </div>
                    {addOns.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        No add-ons added. Click "Add Add-on" to add one.
                      </p>
                    ) : (
                      addOns.map((addOn, index) => (
                        <div
                          key={addOn.id}
                          className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Add-on {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAddOn(addOn.id)}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Machine ID <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={addOn.machineId}
                                onChange={(e) => handleAddOnChange(addOn.id, 'machineId', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                                  formErrors[`addon_machine_${index}`]
                                    ? 'border-red-500'
                                    : 'border-gray-300 dark:border-slate-600'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                              >
                                <option value="">Select Machine</option>
                                {getAvailableMachineIds().map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.label}
                                  </option>
                                ))}
                              </select>
                              {formErrors[`addon_machine_${index}`] && (
                                <p className="mt-1 text-sm text-red-500">
                                  {formErrors[`addon_machine_${index}`]}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Add-on ID <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={addOn.addOnId}
                                onChange={(e) => handleAddOnChange(addOn.id, 'addOnId', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                                  formErrors[`addon_id_${index}`]
                                    ? 'border-red-500'
                                    : 'border-gray-300 dark:border-slate-600'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                              >
                                <option value="">Select Add-on</option>
                                {mockAddOns.map((ao) => (
                                  <option key={ao.id} value={ao.id}>
                                    {ao.name} (Rs. {ao.price.toLocaleString('en-LK')})
                                  </option>
                                ))}
                              </select>
                              {formErrors[`addon_id_${index}`] && (
                                <p className="mt-1 text-sm text-red-500">
                                  {formErrors[`addon_id_${index}`]}
                                </p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Number of Add-ons <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={addOn.quantity}
                                onChange={(e) =>
                                  handleAddOnChange(addOn.id, 'quantity', parseInt(e.target.value) || 1)
                                }
                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                                  formErrors[`addon_quantity_${index}`]
                                    ? 'border-red-500'
                                    : 'border-gray-300 dark:border-slate-600'
                                } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                              />
                              {formErrors[`addon_quantity_${index}`] && (
                                <p className="mt-1 text-sm text-red-500">
                                  {formErrors[`addon_quantity_${index}`]}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Pricing Section */}
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pricing</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          Standard Price Per Machine:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Rs.{' '}
                          {pricing.standardPricePerMachine.toLocaleString('en-LK', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          Total Price for Machines:
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Rs.{' '}
                          {pricing.totalMachinePrice.toLocaleString('en-LK', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      {addOns.length > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Total Price with Add-ons:
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            Rs.{' '}
                            {pricing.totalPrice.toLocaleString('en-LK', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Terms & Conditions Section - UPDATED */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Terms and Conditions
                    </h3>
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
                      <div className="text-sm text-gray-900 dark:text-white space-y-3">
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
                  </div>

                  {/* Customer Signature Section - UPDATED */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Customer Signature
                    </h3>
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Customer Signature <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={signature}
                          onChange={(e) => setSignature(e.target.value)}
                          placeholder="Enter customer signature"
                          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                            formErrors.signature
                              ? 'border-red-500'
                              : 'border-gray-300 dark:border-slate-600'
                          } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                        />
                        {formErrors.signature && (
                          <p className="mt-1 text-sm text-red-500">{formErrors.signature}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">
                          (Agreed upon the terms & Conditions)
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            ID NO <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={customerIdNo}
                            onChange={(e) => setCustomerIdNo(e.target.value)}
                            placeholder="e.g., 72348.961V"
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                              formErrors.customerIdNo
                                ? 'border-red-500'
                                : 'border-gray-300 dark:border-slate-600'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                          />
                          {formErrors.customerIdNo && (
                            <p className="mt-1 text-sm text-red-500">{formErrors.customerIdNo}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Full Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={customerFullName}
                            onChange={(e) => setCustomerFullName(e.target.value)}
                            placeholder="Enter full name"
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                              formErrors.customerFullName
                                ? 'border-red-500'
                                : 'border-gray-300 dark:border-slate-600'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                          />
                          {formErrors.customerFullName && (
                            <p className="mt-1 text-sm text-red-500">{formErrors.customerFullName}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={customerSignatureDate}
                            onChange={(e) => setCustomerSignatureDate(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                              formErrors.customerSignatureDate
                                ? 'border-red-500'
                                : 'border-gray-300 dark:border-slate-600'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                          />
                          {formErrors.customerSignatureDate && (
                            <p className="mt-1 text-sm text-red-500">{formErrors.customerSignatureDate}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCreate}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Agreement & Download'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Rental Agreement Modal - Updated with print functionality */}
        {isViewModalOpen && selectedAgreement && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4 print:hidden">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
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

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">{renderAgreementDetails()}</div>
            </div>
          </div>
        )}

        {/* Update Rental Agreement Modal */}
        {isUpdateModalOpen && selectedAgreement && (
          <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
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

              {/* Modal Content - Scrollable */}
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

        {/* QR Scanner Modal */}
        {renderQRScannerModal()}
      </div>
    </>
  );
};

export default RentalAgreementPage;