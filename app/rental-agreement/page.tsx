'use client';

import React, { useState, useMemo } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import UpdateForm from '@/src/components/form-popup/update';
import QRScannerComponent from '@/src/components/qr-scanner';
import { Eye, Pencil, X, Plus, Trash2 } from 'lucide-react';
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
  serialNo: string;
  machineBrand: string;
  machineModel: string;
  machineType: string;
  startDate: string;
  endDate: string | null;
  monthlyRent: number;
  outstanding: number;
  status: RentalStatus;
  totalAmount: number;
  paidAmount: number;
  deposit: number;
  notes?: string;
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
  { id: 'CUST-001', name: 'ABC Holdings (Pvt) Ltd' },
  { id: 'CUST-002', name: 'John Perera' },
  { id: 'CUST-003', name: 'XYZ Engineering' },
  { id: 'CUST-004', name: 'Kamal Silva' },
  { id: 'CUST-005', name: 'Mega Constructions' },
];

// Mock machine data
const mockMachineBrands = ['Brother', 'Singer', 'Janome', 'Juki', 'Pfaff', 'Bernina'];
const mockMachineModels = [
  { brand: 'Brother', models: ['XL2600i', 'SE600', 'CS6000i'] },
  { brand: 'Singer', models: ['Heavy Duty 4423', 'Buttonhole 160'] },
  { brand: 'Janome', models: ['HD3000', 'MB-4S'] },
  { brand: 'Juki', models: ['MO-654DE'] },
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
    customerName: 'Alpha Constructions',
    serialNo: 'SN-2024-006',
    startDate: '2026-01-01',
    endDate: '2026-08-01',
    monthlyRent: 80000,
    outstanding: 560000,
    status: 'Pending',
  },
];

// Mock function to get rental agreement detail data (replace with API call later)
const getRentalAgreementInfo = (agreementId: number): RentalAgreementInfo => {
  const agreement = mockRentalAgreements.find((r) => r.id === agreementId);
  return {
    id: agreement?.id || 0,
    agreementNo: agreement?.agreementNo || '',
    customerNo: agreement?.customerNo || '',
    customerName: agreement?.customerName || '',
    serialNo: agreement?.serialNo || '',
    machineBrand: 'Brother',
    machineModel: 'XL2600i',
    machineType: 'Domestic',
    startDate: agreement?.startDate || '',
    endDate: agreement?.endDate || null,
    monthlyRent: agreement?.monthlyRent || 0,
    outstanding: agreement?.outstanding || 0,
    status: agreement?.status || 'Active',
    totalAmount: (agreement?.monthlyRent || 0) * 3,
    paidAmount: (agreement?.monthlyRent || 0) * 1,
    deposit: (agreement?.monthlyRent || 0) * 0.5,
    notes: 'Regular maintenance required. Customer has good payment history.',
  };
};

// Generate agreement text
const generateAgreementText = (
  customerName: string,
  machines: MachineItem[],
  addOns: AddOnItem[],
  startDate: string,
  endDate: string,
  totalPrice: number
): string => {
  if (!customerName || machines.length === 0) {
    return 'Please fill in customer and machine details to generate agreement text.';
  }

  const machineList = machines
    .map((m) => `${m.quantity}x ${m.brand} ${m.model} (${m.type})`)
    .join(', ');

  const addOnList =
    addOns.length > 0
      ? addOns
          .map((a) => {
            const addOn = mockAddOns.find((ao) => ao.id === a.addOnId);
            return `${a.quantity}x ${addOn?.name || a.addOnId}`;
          })
          .join(', ')
      : 'None';

  return `RENTAL AGREEMENT

This Rental Agreement is entered into on ${new Date(startDate).toLocaleDateString('en-LK')} between ${customerName} (hereinafter referred to as "Lessee") and Needle Tech POS System (hereinafter referred to as "Lessor").

1. RENTAL ITEMS:
   - Machines: ${machineList}
   ${addOns.length > 0 ? `   - Add-ons: ${addOnList}` : ''}

2. RENTAL PERIOD:
   The rental period shall commence on ${new Date(startDate).toLocaleDateString('en-LK')} and terminate on ${new Date(endDate).toLocaleDateString('en-LK')}.

3. RENTAL FEE:
   The total monthly rental fee is Rs. ${totalPrice.toLocaleString('en-LK', {
     minimumFractionDigits: 2,
     maximumFractionDigits: 2,
   })}.

4. TERMS AND CONDITIONS:
   - The Lessee shall be responsible for the proper care and maintenance of all rented items.
   - Any damage or loss shall be the responsibility of the Lessee.
   - Payment shall be made monthly in advance.
   - Late payment may result in additional charges.

5. SIGNATURE:
   Both parties agree to the terms and conditions set forth in this agreement.

Lessee: _____________________    Lessor: _____________________
Date: _____________________      Date: _____________________`;
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

  // Generate agreement text
  const agreementText = useMemo(() => {
    const selectedCustomer = mockCustomers.find((c) => c.id === customerId);
    return generateAgreementText(
      selectedCustomer?.name || '',
      machines,
      addOns,
      startDate,
      endDate,
      pricing.totalPrice
    );
  }, [customerId, machines, addOns, startDate, endDate, pricing.totalPrice]);

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
        agreementText,
        signature,
        agreementDate,
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

  // View Rental Agreement Content
  const renderAgreementDetails = () => {
    if (!selectedAgreement) return null;

    const agreementInfo = getRentalAgreementInfo(selectedAgreement.id);

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Agreement Details</h3>

        <div className="space-y-4">
          {/* Agreement Information */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Agreement Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Agreement No:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {agreementInfo.agreementNo}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                <div className="mt-1">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center ${
                      agreementInfo.status === 'Active'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : agreementInfo.status === 'Completed'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : agreementInfo.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200'
                    }`}
                  >
                    {agreementInfo.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Customer Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Customer No:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {agreementInfo.customerNo}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Customer Name:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {agreementInfo.customerName}
                </span>
              </div>
            </div>
          </div>

          {/* Machine Information */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Machine Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Serial No:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {agreementInfo.serialNo}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Brand:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {agreementInfo.machineBrand}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Model:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {agreementInfo.machineModel}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Type:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {agreementInfo.machineType}
                </span>
              </div>
            </div>
          </div>

          {/* Rental Period */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Rental Period
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Start Date:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {new Date(agreementInfo.startDate).toLocaleDateString('en-LK')}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">End Date:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {agreementInfo.endDate
                    ? new Date(agreementInfo.endDate).toLocaleDateString('en-LK')
                    : 'Ongoing'}
                </span>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Financial Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Monthly Rent:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  Rs.{' '}
                  {agreementInfo.monthlyRent.toLocaleString('en-LK', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Total Amount:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  Rs.{' '}
                  {agreementInfo.totalAmount.toLocaleString('en-LK', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Paid Amount:</span>
                <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                  Rs.{' '}
                  {agreementInfo.paidAmount.toLocaleString('en-LK', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Outstanding:</span>
                <span
                  className={`ml-2 font-medium ${
                    agreementInfo.outstanding > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  Rs.{' '}
                  {agreementInfo.outstanding.toLocaleString('en-LK', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Deposit:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  Rs.{' '}
                  {agreementInfo.deposit.toLocaleString('en-LK', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {agreementInfo.notes && (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Notes
              </h4>
              <p className="text-sm text-gray-900 dark:text-white">{agreementInfo.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
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
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Rental List</h2>
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

      {/* Create Rental Agreement Modal */}
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
                {/* Customer and Dates Section */}
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

                {/* Auto Generated Agreement Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Auto Generated Agreement Text
                  </label>
                  <textarea
                    value={agreementText}
                    readOnly
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 resize-none"
                  />
                </div>

                {/* T&C Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Terms and Conditions
                  </h3>
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      By signing this agreement, both parties agree to the terms and conditions
                      outlined in the auto-generated agreement text above. Please review all terms
                      carefully before signing.
                    </p>
                  </div>
                </div>

                {/* Signature and Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Signature <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="Enter signature"
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        formErrors.signature
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                    />
                    {formErrors.signature && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.signature}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={agreementDate}
                      onChange={(e) => setAgreementDate(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        formErrors.agreementDate
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                    />
                    {formErrors.agreementDate && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.agreementDate}</p>
                    )}
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

      {/* View Rental Agreement Modal */}
      {isViewModalOpen && selectedAgreement && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
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
              <button
                onClick={handleCloseViewModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
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
  );
};

export default RentalAgreementPage;