'use client';

import React, { useState, useMemo } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import CreateForm, { FormField } from '@/src/components/form-popup/create';
import UpdateForm from '@/src/components/form-popup/update';
import DeleteForm from '@/src/components/form-popup/delete';
import { Eye, Pencil, Trash2, X, Plus } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';

type CustomerType = 'Company' | 'Individual';
type CustomerStatus = 'Active' | 'Inactive' | 'Blocked';

interface Customer {
  id: number;
  name: string;
  type: CustomerType;
  outstandingBalance: number;
  status: CustomerStatus;
}

// Customer Profile Data Types
interface CustomerInfo {
  id: number;
  name: string;
  type: 'Company' | 'Individual';
  nicNumber?: string;
  vatTin?: string;
  address: string;
  phone: string;
  email: string;
  creditStatus: 'Active' | 'Locked';
  totalOutstanding: number;
}

interface RentalHistory {
  id: number;
  machineName: string;
  rentalDate: string;
  returnDate: string | null;
  status: 'Active' | 'Completed' | 'Cancelled';
  totalAmount: number;
}

interface Payment {
  id: number;
  machineName: string;
  dueDate: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Overdue';
}

interface DamageRecord {
  id: number;
  machineName: string;
  rentalDate: string;
  returnDate: string;
  damageDescription: string;
  repairCost: number;
  status: 'Repaired' | 'Pending';
}

interface Agreement {
  id: number;
  agreementNumber: string;
  machineName: string;
  startDate: string;
  endDate: string;
  rentalPeriod: string;
  monthlyRate: number;
  totalAmount: number;
  status: 'Active' | 'Expired' | 'Terminated';
}

interface OutstandingAlert {
  id: number;
  alertType: 'Payment Overdue' | 'High Balance' | 'Credit Limit Exceeded' | 'Agreement Expiring';
  description: string;
  amount: number;
  dueDate: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Active' | 'Resolved';
}

// Rental Agreement Types (from rental-agreement page)
interface MachineItem {
  id: string;
  brand: string;
  model: string;
  type: string;
  quantity: number;
  standardPrice: number;
}

interface AddOnItem {
  id: string;
  machineId: string;
  addOnId: string;
  quantity: number;
  price: number;
}

// Mock customer data
const mockCustomers: Customer[] = [
  {
    id: 1,
    name: 'ABC Holdings (Pvt) Ltd',
    type: 'Company',
    outstandingBalance: 120000.5,
    status: 'Active',
  },
  {
    id: 2,
    name: 'John Perera',
    type: 'Individual',
    outstandingBalance: 3500,
    status: 'Active',
  },
  {
    id: 3,
    name: 'XYZ Engineering',
    type: 'Company',
    outstandingBalance: 0,
    status: 'Inactive',
  },
  {
    id: 4,
    name: 'Kamal Silva',
    type: 'Individual',
    outstandingBalance: 78000,
    status: 'Blocked',
  },
  {
    id: 5,
    name: 'Mega Constructions',
    type: 'Company',
    outstandingBalance: 245000.75,
    status: 'Active',
  },
];

// Mock machine data (from rental-agreement page)
const mockMachineBrands = ['Brother', 'Singer', 'Janome', 'Juki', 'Pfaff', 'Bernina'];
const mockMachineModels = [
  { brand: 'Brother', models: ['XL2600i', 'SE600', 'CS6000i'] },
  { brand: 'Singer', models: ['Heavy Duty 4423', 'Buttonhole 160'] },
  { brand: 'Janome', models: ['HD3000', 'MB-4S'] },
  { brand: 'Juki', models: ['MO-654DE'] },
];
const mockMachineTypes = ['Industrial', 'Domestic', 'Embroidery', 'Overlock', 'Buttonhole', 'Other'];

// Mock add-ons data (from rental-agreement page)
const mockAddOns = [
  { id: 'ADDON-001', name: 'Thread Stand', price: 5000 },
  { id: 'ADDON-002', name: 'Extension Table', price: 8000 },
  { id: 'ADDON-003', name: 'Presser Foot Set', price: 3000 },
  { id: 'ADDON-004', name: 'Bobbin Case', price: 2000 },
  { id: 'ADDON-005', name: 'Needle Set', price: 1500 },
];

// Mock standard prices per machine type (from rental-agreement page)
const standardPrices: Record<string, number> = {
  Industrial: 50000,
  Domestic: 35000,
  Embroidery: 45000,
  Overlock: 40000,
  Buttonhole: 30000,
  Other: 35000,
};

// Mock function to get customer profile data (replace with API call later)
const getCustomerProfileData = (customerId: number): CustomerInfo => {
  const customer = mockCustomers.find((c) => c.id === customerId);
  return {
    id: customer?.id || 0,
    name: customer?.name || '',
    type: customer?.type || 'Company',
    vatTin: customer?.type === 'Company' ? 'VAT-123456789' : undefined,
    nicNumber: customer?.type === 'Individual' ? '123456789V' : undefined,
    address: '123 Business Street, Colombo 05',
    phone: '+94 11 2345678',
    email: 'contact@example.lk',
    creditStatus: customer?.status === 'Blocked' ? 'Locked' : 'Active',
    totalOutstanding: customer?.outstandingBalance || 0,
  };
};

// Mock rental history data
const getRentalHistory = (customerId: number): RentalHistory[] => {
  return [
    {
      id: 1,
      machineName: 'Excavator CAT 320',
      rentalDate: '2024-01-15',
      returnDate: '2024-02-15',
      status: 'Completed',
      totalAmount: 150000,
    },
    {
      id: 2,
      machineName: 'Bulldozer CAT D6',
      rentalDate: '2024-03-01',
      returnDate: null,
      status: 'Active',
      totalAmount: 200000,
    },
  ];
};

// Mock payments data
const getPayments = (customerId: number): Payment[] => {
  return [
    {
      id: 1,
      machineName: 'Bulldozer CAT D6',
      dueDate: '2024-04-01',
      amount: 50000,
      status: 'Pending',
    },
    {
      id: 2,
      machineName: 'Bulldozer CAT D6',
      dueDate: '2024-05-01',
      amount: 50000,
      status: 'Pending',
    },
  ];
};

// Mock damage records data
const getDamageRecords = (customerId: number): DamageRecord[] => {
  return [
    {
      id: 1,
      machineName: 'Excavator CAT 320',
      rentalDate: '2024-01-15',
      returnDate: '2024-02-15',
      damageDescription: 'Minor scratch on hydraulic arm',
      repairCost: 5000,
      status: 'Repaired',
    },
  ];
};

// Mock agreements data
const getAgreements = (customerId: number): Agreement[] => {
  return [
    {
      id: 1,
      agreementNumber: 'AGR-2024-001',
      machineName: 'Excavator CAT 320',
      startDate: '2024-01-15',
      endDate: '2024-07-15',
      rentalPeriod: '6 months',
      monthlyRate: 25000,
      totalAmount: 150000,
      status: 'Active',
    },
    {
      id: 2,
      agreementNumber: 'AGR-2024-002',
      machineName: 'Bulldozer CAT D6',
      startDate: '2024-03-01',
      endDate: '2024-09-01',
      rentalPeriod: '6 months',
      monthlyRate: 33333.33,
      totalAmount: 200000,
      status: 'Active',
    },
    {
      id: 3,
      agreementNumber: 'AGR-2023-045',
      machineName: 'Loader CAT 950',
      startDate: '2023-06-01',
      endDate: '2023-12-01',
      rentalPeriod: '6 months',
      monthlyRate: 20000,
      totalAmount: 120000,
      status: 'Expired',
    },
  ];
};

// Mock outstanding alerts data
const getOutstandingAlerts = (customerId: number): OutstandingAlert[] => {
  return [
    {
      id: 1,
      alertType: 'Payment Overdue',
      description: 'Monthly payment for Bulldozer CAT D6 is overdue by 15 days',
      amount: 50000,
      dueDate: '2024-04-01',
      severity: 'High',
      status: 'Active',
    },
    {
      id: 2,
      alertType: 'High Balance',
      description: 'Total outstanding balance exceeds warning threshold',
      amount: 120000.5,
      dueDate: '2024-04-15',
      severity: 'Medium',
      status: 'Active',
    },
    {
      id: 3,
      alertType: 'Agreement Expiring',
      description: 'Agreement AGR-2024-001 will expire in 30 days',
      amount: 0,
      dueDate: '2024-07-15',
      severity: 'Low',
      status: 'Active',
    },
  ];
};

// Table column configuration
const columns: TableColumn[] = [
  {
    key: 'name',
    label: 'Customer Name',
    sortable: true,
    filterable: false,
  },
  {
    key: 'type',
    label: 'Type',
    sortable: true,
    filterable: true,
  },
  {
    key: 'outstandingBalance',
    label: 'Outstanding Balance',
    sortable: true,
    filterable: false,
    render: (value: number) => (
      <span className={value > 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-green-600 dark:text-green-400 font-medium'}>
        Rs. {value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    filterable: true,
    render: (value: CustomerStatus) => {
      const base =
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
      if (value === 'Active') {
        return (
          <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
            Active
          </span>
        );
      }
      if (value === 'Inactive') {
        return (
          <span className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200`}>
            Inactive
          </span>
        );
      }
      return (
        <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>
          Blocked
        </span>
      );
    },
  },
];

const CustomerListPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCreateRentalAgreementModalOpen, setIsCreateRentalAgreementModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'overview' | 'rental-history' | 'payments' | 'damage-records' | 'agreements' | 'outstanding-alerts'>('overview');
  const [activeCreateTab, setActiveCreateTab] = useState<'company' | 'individual'>('company');
  const [activeUpdateTab, setActiveUpdateTab] = useState<'company' | 'individual'>('company');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rental Agreement Form State
  const [customerId, setCustomerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [machines, setMachines] = useState<MachineItem[]>([
    { id: '1', brand: '', model: '', type: '', quantity: 1, standardPrice: 0 },
  ]);
  const [addOns, setAddOns] = useState<AddOnItem[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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

  const handleCreateCustomer = () => {
    setIsCreateModalOpen(true);
    setActiveCreateTab('company');
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setActiveCreateTab('company');
  };

  const handleCreateHiringAgreement = () => {
    setIsCreateRentalAgreementModalOpen(true);
    // Reset form
    setCustomerId('');
    setStartDate('');
    setEndDate('');
    setMachines([{ id: '1', brand: '', model: '', type: '', quantity: 1, standardPrice: 0 }]);
    setAddOns([]);
    setFormErrors({});
  };

  const handleCloseCreateRentalAgreementModal = () => {
    setIsCreateRentalAgreementModalOpen(false);
    setCustomerId('');
    setStartDate('');
    setEndDate('');
    setMachines([{ id: '1', brand: '', model: '', type: '', quantity: 1, standardPrice: 0 }]);
    setAddOns([]);
    setFormErrors({});
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
    setActiveProfileTab('overview');
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedCustomer(null);
    setActiveProfileTab('overview');
  };

  const handleUpdateCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setActiveUpdateTab(customer.type === 'Company' ? 'company' : 'individual');
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedCustomer(null);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedCustomer(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;
    
    setIsSubmitting(true);
    try {
      console.log('Delete customer payload:', selectedCustomer);
      // Replace with actual API call
      // await deleteCustomerAPI(selectedCustomer.id);
      alert(`Customer "${selectedCustomer.name}" deleted (frontend only).`);
      handleCloseDeleteModal();
      // Optionally refresh the customer list here
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rental Agreement Handlers
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

  const validateRentalAgreementForm = (): boolean => {
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

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitRentalAgreement = async () => {
    if (!validateRentalAgreementForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCustomer = mockCustomers.find((c) => c.id === Number(customerId));
      const payload = {
        customerId,
        customerName: selectedCustomer?.name || '',
        startDate,
        endDate,
        machines,
        addOns,
        pricing,
      };

      console.log('Create rental agreement payload:', payload);
      alert(`Rental Agreement created successfully (frontend only).`);
      handleCloseCreateRentalAgreementModal();
    } catch (error) {
      console.error('Error creating rental agreement:', error);
      alert('Failed to create rental agreement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form fields for Company
  const companyFields: FormField[] = [
    {
      name: 'companyName',
      label: 'Company Name',
      type: 'text',
      placeholder: 'Enter company name',
      required: true,
    },
    {
      name: 'vatTin',
      label: 'VAT / TIN Number',
      type: 'text',
      placeholder: 'Enter VAT or TIN number',
      required: true,
    },
    {
      name: 'businessAddress',
      label: 'Business Address',
      type: 'textarea',
      placeholder: 'Enter full business address',
      required: true,
      rows: 3,
    },
    {
      name: 'contactPerson',
      label: 'Contact Person',
      type: 'text',
      placeholder: 'Enter contact person name',
      required: true,
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'phone',
      placeholder: 'Enter contact number',
      required: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'Enter contact email',
      required: true,
    },
  ];

  // Form fields for Individual
  const individualFields: FormField[] = [
    {
      name: 'fullName',
      label: 'Full Name',
      type: 'text',
      placeholder: 'Enter full name',
      required: true,
    },
    {
      name: 'nicNumber',
      label: 'NIC Number',
      type: 'text',
      placeholder: 'Enter NIC number',
      required: true,
    },
    {
      name: 'address',
      label: 'Address',
      type: 'textarea',
      placeholder: 'Enter full address',
      required: true,
      rows: 3,
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'phone',
      placeholder: 'Enter contact number',
      required: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'Enter email address',
      required: true,
    },
  ];

  // Get initial data for update form
  const getUpdateInitialData = (customer: Customer | null) => {
    if (!customer) return {};

    const customerInfo = getCustomerProfileData(customer.id);

    if (customer.type === 'Company') {
      return {
        companyName: customerInfo.name,
        vatTin: customerInfo.vatTin || '',
        businessAddress: customerInfo.address,
        contactPerson: 'Contact Person Name', // This should come from API
        phone: customerInfo.phone,
        email: customerInfo.email,
      };
    } else {
      return {
        fullName: customerInfo.name,
        nicNumber: customerInfo.nicNumber || '',
        address: customerInfo.address,
        phone: customerInfo.phone,
        email: customerInfo.email,
      };
    }
  };

  // Get delete confirmation details
  const getDeleteDetails = (customer: Customer | null) => {
    if (!customer) return [];

    return [
      { label: 'Type', value: customer.type },
      { label: 'Status', value: customer.status },
      {
        label: 'Outstanding Balance',
        value: `Rs. ${customer.outstandingBalance.toLocaleString('en-LK', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      },
    ];
  };

  const handleCompanySubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      console.log('Create company payload:', data);
      alert(`Company "${data.companyName}" created (frontend only).`);
      handleCloseCreateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIndividualSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      console.log('Create individual payload:', data);
      alert(`Individual customer "${data.fullName}" created (frontend only).`);
      handleCloseCreateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompanyUpdate = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      console.log('Update company payload:', data);
      alert(`Company "${data.companyName}" updated (frontend only).`);
      handleCloseUpdateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIndividualUpdate = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      console.log('Update individual payload:', data);
      alert(`Individual customer "${data.fullName}" updated (frontend only).`);
      handleCloseUpdateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    console.log('Form cleared');
  };

  const getRowClassName = (customer: Customer) => {
    if (customer.status === 'Blocked') return 'bg-red-50/60 dark:bg-red-950/40';
    if (customer.status === 'Inactive') return 'bg-gray-50 dark:bg-slate-900/40';
    return '';
  };

  // Action buttons
    // Action buttons
    const actions: ActionButton[] = [
      {
        label: '',
        icon: <Eye className="w-4 h-4" />,
        variant: 'secondary',
        onClick: handleViewCustomer,
        tooltip: 'View Customer',
        className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
      },
      {
        label: '',
        icon: <Pencil className="w-4 h-4" />,
        variant: 'primary',
        onClick: handleUpdateCustomer,
        tooltip: 'Update Customer',
        className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500',
      },
      {
        label: '',
        icon: <Trash2 className="w-4 h-4" />,
        variant: 'danger',
        onClick: handleDeleteCustomer,
        tooltip: 'Delete Customer',
        className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500 dark:focus:ring-red-500',
      },
    ];

  // Profile Content Components
  const renderProfileContent = () => {
    if (!selectedCustomer) return null;

    const customerInfo = getCustomerProfileData(selectedCustomer.id);
    const rentalHistory = getRentalHistory(selectedCustomer.id);
    const payments = getPayments(selectedCustomer.id);
    const damageRecords = getDamageRecords(selectedCustomer.id);
    const agreements = getAgreements(selectedCustomer.id);
    const outstandingAlerts = getOutstandingAlerts(selectedCustomer.id);

    // Overview Content
    const overviewContent = (
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Overview</h3>
        
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Customer Info
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Name:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {customerInfo.name}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Type:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {customerInfo.type}
                </span>
              </div>
              {customerInfo.vatTin && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">VAT/TIN:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {customerInfo.vatTin}
                  </span>
                </div>
              )}
              {customerInfo.nicNumber && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">NIC:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {customerInfo.nicNumber}
                  </span>
                </div>
              )}
              <div className="md:col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Address:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {customerInfo.address}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {customerInfo.phone}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Email:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {customerInfo.email}
                </span>
              </div>
            </div>
          </div>

          {/* Credit Status */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Credit Status
            </h4>
            <div>
              <span
                className={`px-3 py-1.5 rounded-full text-sm font-semibold inline-flex items-center ${
                  customerInfo.creditStatus === 'Active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                }`}
              >
                {customerInfo.creditStatus}
              </span>
            </div>
          </div>

          {/* Total Outstanding */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Total Outstanding
            </h4>
            <div>
              <span
                className={`text-2xl font-bold ${
                  customerInfo.totalOutstanding > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                Rs. {customerInfo.totalOutstanding.toLocaleString('en-LK', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );

    // Rental History Columns
    const rentalHistoryColumns: TableColumn[] = [
      {
        key: 'machineName',
        label: 'Machine Name',
        sortable: true,
      },
      {
        key: 'rentalDate',
        label: 'Rental Date',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
      },
      {
        key: 'returnDate',
        label: 'Return Date',
        sortable: true,
        render: (value: string | null) =>
          value ? new Date(value).toLocaleDateString('en-LK') : 'N/A',
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value: string) => {
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
          return (
            <span className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200`}>
              Cancelled
            </span>
          );
        },
      },
      {
        key: 'totalAmount',
        label: 'Total Amount',
        sortable: true,
        render: (value: number) => (
          <span className="font-medium text-gray-900 dark:text-white">
            Rs. {value.toLocaleString('en-LK', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
    ];

    // Payments Columns
    const paymentsColumns: TableColumn[] = [
      {
        key: 'machineName',
        label: 'Machine Name',
        sortable: true,
      },
      {
        key: 'dueDate',
        label: 'Due Date',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
      },
      {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        render: (value: number) => (
          <span className="font-medium text-gray-900 dark:text-white">
            Rs. {value.toLocaleString('en-LK', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value: string) => {
          const base =
            'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
          if (value === 'Paid') {
            return (
              <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
                Paid
              </span>
            );
          }
          if (value === 'Overdue') {
            return (
              <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>
                Overdue
              </span>
            );
          }
          return (
            <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
              Pending
            </span>
          );
        },
      },
    ];

    // Damage Records Columns
    const damageRecordsColumns: TableColumn[] = [
      {
        key: 'machineName',
        label: 'Machine Name',
        sortable: true,
      },
      {
        key: 'rentalDate',
        label: 'Rental Date',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
      },
      {
        key: 'returnDate',
        label: 'Return Date',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
      },
      {
        key: 'damageDescription',
        label: 'Damage Description',
        sortable: false,
      },
      {
        key: 'repairCost',
        label: 'Repair Cost',
        sortable: true,
        render: (value: number) => (
          <span className="font-medium text-red-600 dark:text-red-400">
            Rs. {value.toLocaleString('en-LK', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value: string) => {
          const base =
            'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
          if (value === 'Repaired') {
            return (
              <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
                Repaired
              </span>
            );
          }
          return (
            <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
              Pending
            </span>
          );
        },
      },
    ];

    // Agreements Columns
    const agreementsColumns: TableColumn[] = [
      {
        key: 'agreementNumber',
        label: 'Agreement Number',
        sortable: true,
      },
      {
        key: 'machineName',
        label: 'Machine Name',
        sortable: true,
      },
      {
        key: 'startDate',
        label: 'Start Date',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
      },
      {
        key: 'endDate',
        label: 'End Date',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
      },
      {
        key: 'rentalPeriod',
        label: 'Rental Period',
        sortable: true,
      },
      {
        key: 'monthlyRate',
        label: 'Monthly Rate',
        sortable: true,
        render: (value: number) => (
          <span className="font-medium text-gray-900 dark:text-white">
            Rs. {value.toLocaleString('en-LK', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        key: 'totalAmount',
        label: 'Total Amount',
        sortable: true,
        render: (value: number) => (
          <span className="font-medium text-gray-900 dark:text-white">
            Rs. {value.toLocaleString('en-LK', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value: string) => {
          const base =
            'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
          if (value === 'Active') {
            return (
              <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
                Active
              </span>
            );
          }
          if (value === 'Expired') {
            return (
              <span className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200`}>
                Expired
              </span>
            );
          }
          return (
            <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>
              Terminated
            </span>
          );
        },
      },
    ];

    // Outstanding Alerts Columns
    const outstandingAlertsColumns: TableColumn[] = [
      {
        key: 'alertType',
        label: 'Alert Type',
        sortable: true,
      },
      {
        key: 'description',
        label: 'Description',
        sortable: false,
      },
      {
        key: 'amount',
        label: 'Amount',
        sortable: true,
        render: (value: number) => (
          value > 0 ? (
            <span className="font-medium text-red-600 dark:text-red-400">
              Rs. {value.toLocaleString('en-LK', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">N/A</span>
          )
        ),
      },
      {
        key: 'dueDate',
        label: 'Due Date',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
      },
      {
        key: 'severity',
        label: 'Severity',
        sortable: true,
        render: (value: string) => {
          const base =
            'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
          if (value === 'Critical') {
            return (
              <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>
                Critical
              </span>
            );
          }
          if (value === 'High') {
            return (
              <span className={`${base} bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300`}>
                High
              </span>
            );
          }
          if (value === 'Medium') {
            return (
              <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
                Medium
              </span>
            );
          }
          return (
            <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}>
              Low
            </span>
          );
        },
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (value: string) => {
          const base =
            'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
          if (value === 'Resolved') {
            return (
              <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
                Resolved
              </span>
            );
          }
          return (
            <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
              Active
            </span>
          );
        },
      },
    ];

    const rentalHistoryContent = (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Rental History</h3>
        <Table
          data={rentalHistory}
          columns={rentalHistoryColumns}
          itemsPerPage={10}
          searchable={false}
          filterable={false}
          emptyMessage="No rental history found."
        />
      </div>
    );

    const paymentsContent = (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Payments</h3>
        <Table
          data={payments}
          columns={paymentsColumns}
          itemsPerPage={10}
          searchable={false}
          filterable={false}
          emptyMessage="No upcoming payments found."
        />
      </div>
    );

    const damageRecordsContent = (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Damage Records</h3>
        <Table
          data={damageRecords}
          columns={damageRecordsColumns}
          itemsPerPage={10}
          searchable={false}
          filterable={false}
          emptyMessage="No damage records found."
        />
      </div>
    );

    const agreementsContent = (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Agreements</h3>
        <Table
          data={agreements}
          columns={agreementsColumns}
          itemsPerPage={10}
          searchable={false}
          filterable={false}
          emptyMessage="No agreements found."
        />
      </div>
    );

    const outstandingAlertsContent = (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Outstanding Alerts</h3>
        <Table
          data={outstandingAlerts}
          columns={outstandingAlertsColumns}
          itemsPerPage={10}
          searchable={false}
          filterable={false}
          emptyMessage="No outstanding alerts found."
        />
      </div>
    );

    switch (activeProfileTab) {
      case 'rental-history':
        return rentalHistoryContent;
      case 'payments':
        return paymentsContent;
      case 'damage-records':
        return damageRecordsContent;
      case 'agreements':
        return agreementsContent;
      case 'outstanding-alerts':
        return outstandingAlertsContent;
      default:
        return overviewContent;
    }
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
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Customer List
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Overview of all customers with their type, outstanding balances, and status.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Tooltip content="Create Hiring Agreement">
              <button
                onClick={handleCreateHiringAgreement}
                className="px-6 py-2.5 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
              >
                Create Hiring Agreement
              </button>
              </Tooltip>
            </div>
          </div>

          {/* Customer table card */}
          <Table
            data={mockCustomers}
            columns={columns}
            actions={actions}
            itemsPerPage={10}
            searchable
            filterable
            onCreateClick={handleCreateCustomer}
            createButtonLabel="Create Customer"
            getRowClassName={getRowClassName}
            emptyMessage="No customers found."
          />
        </div>
      </main>

      {/* Create Customer Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Create Customer
              </h2>
              <button
                onClick={handleCloseCreateModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-700 px-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveCreateTab('company')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeCreateTab === 'company'
                      ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Company
                </button>
                <button
                  onClick={() => setActiveCreateTab('individual')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeCreateTab === 'individual'
                      ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Individual
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeCreateTab === 'company' ? (
                <CreateForm
                  title="Company Details"
                  fields={companyFields}
                  onSubmit={handleCompanySubmit}
                  onClear={handleClear}
                  submitButtonLabel="Save"
                  clearButtonLabel="Clear"
                  loading={isSubmitting}
                  enableDynamicSpecs={false}
                  className="shadow-none border-0 p-0"
                />
              ) : (
                <CreateForm
                  title="Individual Details"
                  fields={individualFields}
                  onSubmit={handleIndividualSubmit}
                  onClear={handleClear}
                  submitButtonLabel="Save"
                  clearButtonLabel="Clear"
                  loading={isSubmitting}
                  enableDynamicSpecs={false}
                  className="shadow-none border-0 p-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Rental Agreement Modal */}
      {isCreateRentalAgreementModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Create Rental Agreement
              </h2>
              <button
                onClick={handleCloseCreateRentalAgreementModal}
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
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handleCloseCreateRentalAgreementModal}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRentalAgreement}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Agreement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Customer Modal */}
      {isUpdateModalOpen && selectedCustomer && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Update Customer
              </h2>
              <button
                onClick={handleCloseUpdateModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-700 px-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveUpdateTab('company')}
                  disabled={selectedCustomer.type === 'Individual'}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeUpdateTab === 'company'
                      ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  } ${selectedCustomer.type === 'Individual' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Company
                </button>
                <button
                  onClick={() => setActiveUpdateTab('individual')}
                  disabled={selectedCustomer.type === 'Company'}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeUpdateTab === 'individual'
                      ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  } ${selectedCustomer.type === 'Company' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Individual
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedCustomer.type === 'Company' ? (
                <UpdateForm
                  title="Update Company Details"
                  fields={companyFields}
                  onSubmit={handleCompanyUpdate}
                  onClear={handleClear}
                  submitButtonLabel="Update"
                  clearButtonLabel="Reset"
                  loading={isSubmitting}
                  initialData={getUpdateInitialData(selectedCustomer)}
                  className="shadow-none border-0 p-0"
                />
              ) : (
                <UpdateForm
                  title="Update Individual Details"
                  fields={individualFields}
                  onSubmit={handleIndividualUpdate}
                  onClear={handleClear}
                  submitButtonLabel="Update"
                  clearButtonLabel="Reset"
                  loading={isSubmitting}
                  initialData={getUpdateInitialData(selectedCustomer)}
                  className="shadow-none border-0 p-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Modal */}
      {isDeleteModalOpen && selectedCustomer && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Delete Customer
              </h2>
              <button
                onClick={handleCloseDeleteModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <DeleteForm
                title="Delete Customer"
                message="This will permanently delete the customer and all associated data. This action cannot be undone."
                itemName={selectedCustomer.name}
                itemDetails={getDeleteDetails(selectedCustomer)}
                onConfirm={handleConfirmDelete}
                onCancel={handleCloseDeleteModal}
                confirmButtonLabel="Delete Customer"
                cancelButtonLabel="Cancel"
                loading={isSubmitting}
                className="shadow-none border-0 p-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* View Customer Profile Modal */}
      {isViewModalOpen && selectedCustomer && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Customer Profile
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedCustomer.name}
                </p>
              </div>
              <button
                onClick={handleCloseViewModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-700 px-6">
              <div className="flex space-x-4">
                {[
                  { key: 'overview', label: 'Overview' },
                  { key: 'rental-history', label: 'Rental History' },
                  { key: 'payments', label: 'Payments' },
                  { key: 'damage-records', label: 'Damage Records' },
                  { key: 'agreements', label: 'Agreements' },
                  { key: 'outstanding-alerts', label: 'Outstanding Alerts' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveProfileTab(tab.key as any)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeProfileTab === tab.key
                        ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderProfileContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerListPage;