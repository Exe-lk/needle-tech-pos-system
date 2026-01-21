'use client';

import React, { useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import { Eye, X, QrCode, Camera, Printer, CheckCircle2, Calendar, User, FileText, DollarSign, ArrowRight, ArrowLeft, Package, MapPin, Building2 } from 'lucide-react';

type ReturnType = 'Standard' | 'Damage' | 'Missing' | 'Exchange';
type ReturnStatus = 'Pending' | 'Completed' | 'Under Review';

interface Return {
  id: number;
  returnNumber: string;
  machineName: string;
  machineId: string;
  customerName: string;
  returnDate: string;
  returnType: ReturnType;
  status: ReturnStatus;
  damageNote?: string;
  photosCount?: number;
  repairCost?: number;
  inspectedBy: string;
  // Enhanced fields for view modal
  machineDetails?: {
    model: string;
    serialNumber: string;
    manufacturer: string;
    year: number;
    category: string;
    location?: string;
  };
  rentalDetails?: {
    agreementNumber: string;
    customerPhone: string;
    customerEmail: string;
    rentalStartDate: string;
    rentalEndDate: string;
    rentalPeriod: string;
    monthlyRate: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    securityDeposit: number;
    dispatchedDate: string;
    expectedReturnDate: string;
  };
}

// Mock return data with enhanced details
const mockReturns: Return[] = [
  {
    id: 1,
    returnNumber: 'RET-2024-001',
    machineName: 'Excavator CAT 320',
    machineId: 'MACH-001',
    customerName: 'ABC Holdings (Pvt) Ltd',
    returnDate: '2024-04-15',
    returnType: 'Standard',
    status: 'Completed',
    inspectedBy: 'John Doe',
    machineDetails: {
      model: 'CAT 320',
      serialNumber: 'SN-CAT320-2023-001',
      manufacturer: 'Caterpillar',
      year: 2023,
      category: 'Excavator',
      location: 'Warehouse A',
    },
    rentalDetails: {
      agreementNumber: 'AGR-2024-001',
      customerPhone: '+94 11 2345678',
      customerEmail: 'contact@abcholdings.lk',
      rentalStartDate: '2024-01-15',
      rentalEndDate: '2024-07-15',
      rentalPeriod: '6 months',
      monthlyRate: 25000,
      totalAmount: 150000,
      paidAmount: 100000,
      outstandingAmount: 50000,
      securityDeposit: 50000,
      dispatchedDate: '2024-01-15',
      expectedReturnDate: '2024-07-15',
    },
  },
  {
    id: 2,
    returnNumber: 'RET-2024-002',
    machineName: 'Bulldozer CAT D6',
    machineId: 'MACH-002',
    customerName: 'Mega Constructions',
    returnDate: '2024-04-16',
    returnType: 'Damage',
    status: 'Under Review',
    damageNote: 'Minor scratch on hydraulic arm. Requires repainting and minor repair.',
    photosCount: 3,
    repairCost: 5000,
    inspectedBy: 'Jane Smith',
    machineDetails: {
      model: 'CAT D6',
      serialNumber: 'SN-CATD6-2023-002',
      manufacturer: 'Caterpillar',
      year: 2023,
      category: 'Bulldozer',
      location: 'Site Location',
    },
    rentalDetails: {
      agreementNumber: 'AGR-2024-002',
      customerPhone: '+94 11 3456789',
      customerEmail: 'info@megaconstructions.lk',
      rentalStartDate: '2024-03-01',
      rentalEndDate: '2024-09-01',
      rentalPeriod: '6 months',
      monthlyRate: 33333.33,
      totalAmount: 200000,
      paidAmount: 100000,
      outstandingAmount: 100000,
      securityDeposit: 75000,
      dispatchedDate: '2024-03-01',
      expectedReturnDate: '2024-09-01',
    },
  },
  {
    id: 3,
    returnNumber: 'RET-2024-003',
    machineName: 'Loader CAT 950',
    machineId: 'MACH-003',
    customerName: 'XYZ Engineering',
    returnDate: '2024-04-17',
    returnType: 'Missing',
    status: 'Pending',
    damageNote: 'Missing hydraulic hose. Customer claims it was not included during dispatch.',
    photosCount: 2,
    inspectedBy: 'Bob Wilson',
    machineDetails: {
      model: 'CAT 950',
      serialNumber: 'SN-CAT950-2022-003',
      manufacturer: 'Caterpillar',
      year: 2022,
      category: 'Loader',
      location: 'Construction Site',
    },
    rentalDetails: {
      agreementNumber: 'AGR-2024-003',
      customerPhone: '+94 11 4567890',
      customerEmail: 'contact@xyzengineering.lk',
      rentalStartDate: '2024-02-01',
      rentalEndDate: '2024-08-01',
      rentalPeriod: '6 months',
      monthlyRate: 20000,
      totalAmount: 120000,
      paidAmount: 60000,
      outstandingAmount: 60000,
      securityDeposit: 40000,
      dispatchedDate: '2024-02-01',
      expectedReturnDate: '2024-08-01',
    },
  },
  {
    id: 4,
    returnNumber: 'RET-2024-004',
    machineName: 'Excavator CAT 320',
    machineId: 'MACH-004',
    customerName: 'Kamal Silva',
    returnDate: '2024-04-18',
    returnType: 'Exchange',
    status: 'Completed',
    inspectedBy: 'Alice Brown',
    machineDetails: {
      model: 'CAT 320',
      serialNumber: 'SN-CAT320-2023-004',
      manufacturer: 'Caterpillar',
      year: 2023,
      category: 'Excavator',
      location: 'Warehouse B',
    },
  },
];

// Enhanced machine data with rental details
interface MachineInfo {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  manufacturer: string;
  year: number;
  category: string;
  status: string;
  location?: string;
  // Rental Information
  isRented: boolean;
  rentalDetails?: {
    agreementNumber: string;
    customerId: number;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    rentalStartDate: string;
    rentalEndDate: string;
    rentalPeriod: string; // e.g., "6 months"
    monthlyRate: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    securityDeposit: number;
    status: 'Active' | 'Completed' | 'Cancelled';
    dispatchedDate: string;
    expectedReturnDate: string;
  };
}

const getMachineByQR = (qrCode: string): MachineInfo | null => {
  // Mock function - in real app, this would be an API call
  const machines: Record<string, MachineInfo> = {
    'MACH-001': {
      id: 'MACH-001',
      name: 'Excavator CAT 320',
      model: 'CAT 320',
      serialNumber: 'SN-CAT320-2023-001',
      manufacturer: 'Caterpillar',
      year: 2023,
      category: 'Excavator',
      status: 'On Rent',
      location: 'Warehouse A',
      isRented: true,
      rentalDetails: {
        agreementNumber: 'AGR-2024-001',
        customerId: 1,
        customerName: 'ABC Holdings (Pvt) Ltd',
        customerPhone: '+94 11 2345678',
        customerEmail: 'contact@abcholdings.lk',
        rentalStartDate: '2024-01-15',
        rentalEndDate: '2024-07-15',
        rentalPeriod: '6 months',
        monthlyRate: 25000,
        totalAmount: 150000,
        paidAmount: 100000,
        outstandingAmount: 50000,
        securityDeposit: 50000,
        status: 'Active',
        dispatchedDate: '2024-01-15',
        expectedReturnDate: '2024-07-15',
      },
    },
    'MACH-002': {
      id: 'MACH-002',
      name: 'Bulldozer CAT D6',
      model: 'CAT D6',
      serialNumber: 'SN-CATD6-2023-002',
      manufacturer: 'Caterpillar',
      year: 2023,
      category: 'Bulldozer',
      status: 'On Rent',
      location: 'Site Location',
      isRented: true,
      rentalDetails: {
        agreementNumber: 'AGR-2024-002',
        customerId: 2,
        customerName: 'Mega Constructions',
        customerPhone: '+94 11 3456789',
        customerEmail: 'info@megaconstructions.lk',
        rentalStartDate: '2024-03-01',
        rentalEndDate: '2024-09-01',
        rentalPeriod: '6 months',
        monthlyRate: 33333.33,
        totalAmount: 200000,
        paidAmount: 100000,
        outstandingAmount: 100000,
        securityDeposit: 75000,
        status: 'Active',
        dispatchedDate: '2024-03-01',
        expectedReturnDate: '2024-09-01',
      },
    },
    'MACH-003': {
      id: 'MACH-003',
      name: 'Loader CAT 950',
      model: 'CAT 950',
      serialNumber: 'SN-CAT950-2022-003',
      manufacturer: 'Caterpillar',
      year: 2022,
      category: 'Loader',
      status: 'On Rent',
      location: 'Construction Site',
      isRented: true,
      rentalDetails: {
        agreementNumber: 'AGR-2024-003',
        customerId: 3,
        customerName: 'XYZ Engineering',
        customerPhone: '+94 11 4567890',
        customerEmail: 'contact@xyzengineering.lk',
        rentalStartDate: '2024-02-01',
        rentalEndDate: '2024-08-01',
        rentalPeriod: '6 months',
        monthlyRate: 20000,
        totalAmount: 120000,
        paidAmount: 60000,
        outstandingAmount: 60000,
        securityDeposit: 40000,
        status: 'Active',
        dispatchedDate: '2024-02-01',
        expectedReturnDate: '2024-08-01',
      },
    },
    'MACH-004': {
      id: 'MACH-004',
      name: 'Excavator CAT 320',
      model: 'CAT 320',
      serialNumber: 'SN-CAT320-2023-004',
      manufacturer: 'Caterpillar',
      year: 2023,
      category: 'Excavator',
      status: 'Available',
      location: 'Warehouse B',
      isRented: false,
    },
  };

  return machines[qrCode] || null;
};

// Table column configuration
const columns: TableColumn[] = [
  {
    key: 'returnNumber',
    label: 'Return Number',
    sortable: true,
    filterable: false,
  },
  {
    key: 'machineName',
    label: 'Machine Name',
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
    key: 'returnDate',
    label: 'Return Date',
    sortable: true,
    filterable: false,
    render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
  },
  {
    key: 'returnType',
    label: 'Return Type',
    sortable: true,
    filterable: true,
    render: (value: ReturnType) => {
      const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
      if (value === 'Standard') {
        return (
          <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
            Standard
          </span>
        );
      }
      if (value === 'Damage') {
        return (
          <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>
            Damage
          </span>
        );
      }
      if (value === 'Missing') {
        return (
          <span className={`${base} bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300`}>
            Missing
          </span>
        );
      }
      return (
        <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}>
          Exchange
        </span>
      );
    },
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    filterable: true,
    render: (value: ReturnStatus) => {
      const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
      if (value === 'Completed') {
        return (
          <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
            Completed
          </span>
        );
      }
      if (value === 'Under Review') {
        return (
          <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}>
            Under Review
          </span>
        );
      }
      return (
        <span className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200`}>
          Pending
        </span>
      );
    },
  },
  {
    key: 'repairCost',
    label: 'Repair Cost',
    sortable: true,
    filterable: false,
    render: (value: number | undefined) => {
      if (!value) return <span className="text-gray-400 dark:text-gray-500">N/A</span>;
      return (
        <span className="font-medium text-red-600 dark:text-red-400">
          Rs. {value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    },
  },
];

const ReturnsPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);

  // Step-based form state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [qrCode, setQrCode] = useState('');
  const [scannedMachine, setScannedMachine] = useState<MachineInfo | null>(null);
  const [returnType, setReturnType] = useState<ReturnType | ''>('');
  const [damageNote, setDamageNote] = useState('');
  const [damagePhotos, setDamagePhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleCreateReturn = () => {
    setIsCreateModalOpen(true);
    setCurrentStep(1);
    setQrCode('');
    setScannedMachine(null);
    setReturnType('');
    setDamageNote('');
    setDamagePhotos([]);
    setPhotoPreviews([]);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setCurrentStep(1);
    setQrCode('');
    setScannedMachine(null);
    setReturnType('');
    setDamageNote('');
    setDamagePhotos([]);
    photoPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    setPhotoPreviews([]);
  };

  const handleQRScan = () => {
    if (!qrCode.trim()) {
      alert('Please enter a QR code');
      return;
    }

    const machine = getMachineByQR(qrCode.trim());
    if (machine) {
      setScannedMachine(machine);
      // DON'T move to step 2 automatically - keep on step 1 to show details
    } else {
      alert('Machine not found. Please check the QR code.');
      setScannedMachine(null);
    }
  };

  const handleContinueToStep2 = () => {
    if (!scannedMachine) {
      alert('Please scan a machine first');
      return;
    }
    setCurrentStep(2);
  };

  const handleBackToStep1 = () => {
    setCurrentStep(1);
  };

  const handleBackToStep2 = () => {
    // Clear damage-related fields when going back
    setDamageNote('');
    setDamagePhotos([]);
    photoPreviews.forEach((preview) => URL.revokeObjectURL(preview));
    setPhotoPreviews([]);
    setCurrentStep(2);
  };

  const handleReturnTypeSelect = (type: ReturnType) => {
    setReturnType(type);
    if (type === 'Damage' || type === 'Missing') {
      setCurrentStep(3);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newPhotos = [...damagePhotos, ...files];
      setDamagePhotos(newPhotos);

      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setPhotoPreviews([...photoPreviews, ...newPreviews]);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = damagePhotos.filter((_, i) => i !== index);
    const newPreviews = photoPreviews.filter((_, i) => i !== index);
    
    // Revoke URL for removed photo
    URL.revokeObjectURL(photoPreviews[index]);
    
    setDamagePhotos(newPhotos);
    setPhotoPreviews(newPreviews);
  };

  const handleSaveAndPrint = async () => {
    // Validation
    if (!returnType) {
      alert('Please select a return type');
      return;
    }

    if ((returnType === 'Damage' || returnType === 'Missing') && !damageNote.trim()) {
      alert('Please enter a damage note');
      return;
    }

    if ((returnType === 'Damage' || returnType === 'Missing') && damagePhotos.length === 0) {
      alert('Please add at least one photo as proof');
      return;
    }

    setIsSubmitting(true);
    try {
      // In real app, this would be an API call
      console.log('Return data:', {
        machineId: scannedMachine?.id,
        returnType,
        damageNote: returnType === 'Damage' || returnType === 'Missing' ? damageNote : undefined,
        photos: damagePhotos,
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert('Return created successfully! Printing receipt...');
      handleCloseCreateModal();
      // In real app, trigger print dialog here
    } catch (error) {
      console.error('Error creating return:', error);
      alert('Failed to create return. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewReturn = (returnItem: Return) => {
    setSelectedReturn(returnItem);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedReturn(null);
  };

  // Action buttons
  const actions: ActionButton[] = [
    {
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewReturn,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
      {/* Top navbar */}
      <Navbar onMenuClick={handleMenuClick} />

      {/* Left sidebar */}
      <Sidebar
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={handleMobileSidebarClose}
      />

      {/* Main content area */}
      <main className="pt-[70px] lg:ml-[300px] p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Returns Management
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Quality control and inspection of returned machines.
              </p>
            </div>
          </div>

          {/* Returns table card */}
          <Table
            data={mockReturns}
            columns={columns}
            actions={actions}
            itemsPerPage={10}
            searchable
            filterable
            onCreateClick={handleCreateReturn}
            createButtonLabel="Create Return"
            emptyMessage="No returns found."
          />
        </div>
      </main>

      {/* Create Return Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Create Return
              </h2>
              <button
                onClick={handleCloseCreateModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps Indicator */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((step) => (
                  <React.Fragment key={step}>
                    <div className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                          currentStep >= step
                            ? 'bg-blue-600 dark:bg-indigo-600 text-white'
                            : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {currentStep > step ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          step
                        )}
                      </div>
                      <span
                        className={`ml-2 text-sm font-medium ${
                          currentStep >= step
                            ? 'text-blue-600 dark:text-indigo-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {step === 1
                          ? 'Scan QR'
                          : step === 2
                          ? 'Return Type'
                          : 'Damage Details'}
                      </span>
                    </div>
                    {step < 3 && (
                      <div
                        className={`flex-1 h-0.5 mx-4 ${
                          currentStep > step
                            ? 'bg-blue-600 dark:bg-indigo-600'
                            : 'bg-gray-200 dark:bg-slate-700'
                        }`}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Step 1: Scan QR */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Step 1: Scan QR Code
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Scan or enter the QR code of the machine being returned.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        QR Code
                      </label>
                      <div className="flex items-center space-x-3">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <QrCode className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                          </div>
                          <input
                            type="text"
                            value={qrCode}
                            onChange={(e) => setQrCode(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleQRScan();
                              }
                            }}
                            placeholder="Enter or scan QR code"
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500 dark:focus:border-indigo-500"
                            autoFocus
                          />
                        </div>
                        <button
                          onClick={handleQRScan}
                          className="px-6 py-3 bg-blue-600 dark:bg-indigo-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors font-medium"
                        >
                          Scan
                        </button>
                      </div>
                    </div>

                    {/* Machine Details - Show after scanning */}
                    {scannedMachine && (
                      <div className="mt-6 space-y-4">
                        {/* Machine Information Card */}
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold text-green-800 dark:text-green-300 flex items-center">
                              <CheckCircle2 className="w-5 h-5 mr-2" />
                              Machine Found
                            </h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              scannedMachine.status === 'On Rent'
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            }`}>
                              {scannedMachine.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Machine Name:</span>
                              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                {scannedMachine.name}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Model:</span>
                              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                {scannedMachine.model}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Serial Number:</span>
                              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                {scannedMachine.serialNumber}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Manufacturer:</span>
                              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                {scannedMachine.manufacturer}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Year:</span>
                              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                {scannedMachine.year}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Category:</span>
                              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                {scannedMachine.category}
                              </span>
                            </div>
                            {scannedMachine.location && (
                              <div>
                                <span className="text-gray-600 dark:text-gray-400">Location:</span>
                                <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                  {scannedMachine.location}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rental Information Card */}
                        {scannedMachine.isRented && scannedMachine.rentalDetails && (
                          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center">
                              <FileText className="w-5 h-5 mr-2" />
                              Rental Information
                            </h4>
                            
                            <div className="space-y-4">
                              {/* Agreement Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Agreement Number:</span>
                                  <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                    {scannedMachine.rentalDetails.agreementNumber}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600 dark:text-gray-400">Rental Status:</span>
                                  <span className="ml-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                      scannedMachine.rentalDetails.status === 'Active'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                        : scannedMachine.rentalDetails.status === 'Completed'
                                        ? 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                    }`}>
                                      {scannedMachine.rentalDetails.status}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {/* Customer Details */}
                              <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                                <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                                  <User className="w-4 h-4 mr-2" />
                                  Customer Details
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Customer Name:</span>
                                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                      {scannedMachine.rentalDetails.customerName}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                      {scannedMachine.rentalDetails.customerPhone}
                                    </span>
                                  </div>
                                  <div className="md:col-span-2">
                                    <span className="text-gray-600 dark:text-gray-400">Email:</span>
                                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                      {scannedMachine.rentalDetails.customerEmail}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Rental Period */}
                              <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                                <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Rental Period
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                      {new Date(scannedMachine.rentalDetails.rentalStartDate).toLocaleDateString('en-LK', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                      {new Date(scannedMachine.rentalDetails.rentalEndDate).toLocaleDateString('en-LK', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Rental Period:</span>
                                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                      {scannedMachine.rentalDetails.rentalPeriod}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Expected Return:</span>
                                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                      {new Date(scannedMachine.rentalDetails.expectedReturnDate).toLocaleDateString('en-LK', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Dispatched Date:</span>
                                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                      {new Date(scannedMachine.rentalDetails.dispatchedDate).toLocaleDateString('en-LK', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Financial Details */}
                              <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                                <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                                  <DollarSign className="w-4 h-4 mr-2" />
                                  Financial Details
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Monthly Rate:</span>
                                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                      Rs. {scannedMachine.rentalDetails.monthlyRate.toLocaleString('en-LK', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                      Rs. {scannedMachine.rentalDetails.totalAmount.toLocaleString('en-LK', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Paid Amount:</span>
                                    <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                                      Rs. {scannedMachine.rentalDetails.paidAmount.toLocaleString('en-LK', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Outstanding:</span>
                                    <span className="ml-2 font-semibold text-red-600 dark:text-red-400">
                                      Rs. {scannedMachine.rentalDetails.outstandingAmount.toLocaleString('en-LK', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600 dark:text-gray-400">Security Deposit:</span>
                                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                      Rs. {scannedMachine.rentalDetails.securityDeposit.toLocaleString('en-LK', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Not Rented Message */}
                        {!scannedMachine.isRented && (
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <p className="text-sm text-yellow-800 dark:text-yellow-300">
                              <strong>Note:</strong> This machine is currently not rented. It may be available in inventory or not assigned to any customer.
                            </p>
                          </div>
                        )}

                        {/* Continue Button - Only show after machine is scanned */}
                        <div className="mt-6">
                          <button
                            onClick={handleContinueToStep2}
                            className="w-full px-6 py-3 bg-blue-600 dark:bg-indigo-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors font-medium flex items-center justify-center"
                          >
                            Continue to Return Type
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Select Return Type */}
              {currentStep === 2 && scannedMachine && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Step 2: Select Return Type
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Choose the appropriate return type based on the machine condition.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {(['Standard', 'Damage', 'Missing', 'Exchange'] as ReturnType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => handleReturnTypeSelect(type)}
                        className={`p-6 border-2 rounded-lg text-left transition-all ${
                          returnType === type
                            ? 'border-blue-600 dark:border-indigo-600 bg-blue-50 dark:bg-indigo-900/20'
                            : 'border-gray-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{type}</h4>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              {type === 'Standard'
                                ? 'Machine returned in good condition'
                                : type === 'Damage'
                                ? 'Machine has visible damage'
                                : type === 'Missing'
                                ? 'Machine has missing parts'
                                : 'Machine exchange requested'}
                            </p>
                          </div>
                          {returnType === type && (
                            <CheckCircle2 className="w-6 h-6 text-blue-600 dark:text-indigo-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex items-center gap-4">
                    <button
                      onClick={handleBackToStep1}
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-slate-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Back
                    </button>
                    {returnType && returnType !== 'Damage' && returnType !== 'Missing' && (
                      <button
                        onClick={handleSaveAndPrint}
                        disabled={isSubmitting}
                        className="flex-1 px-6 py-3 bg-blue-600 dark:bg-indigo-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Printer className="w-5 h-5 mr-2" />
                            Save & Print
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Damage/Missing Details */}
              {currentStep === 3 && scannedMachine && (returnType === 'Damage' || returnType === 'Missing') && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Step 3: {returnType === 'Damage' ? 'Damage' : 'Missing Parts'} Details
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Please provide detailed notes and photo evidence of the {returnType.toLowerCase()}.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {returnType === 'Damage' ? 'Damage Note' : 'Missing Parts Note'} *
                      </label>
                      <textarea
                        value={damageNote}
                        onChange={(e) => setDamageNote(e.target.value)}
                        placeholder={`Describe the ${returnType.toLowerCase()} in detail...`}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500 dark:focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Add Photos (as proof) *
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="photo-upload"
                      />
                      <label
                        htmlFor="photo-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Camera className="w-8 h-8 mb-2 text-gray-400 dark:text-gray-500" />
                          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            PNG, JPG, GIF (add photos to prove {returnType.toLowerCase()})
                          </p>
                        </div>
                      </label>

                      {/* Photo Previews */}
                      {photoPreviews.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          {photoPreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-gray-300 dark:border-slate-600"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex items-center gap-4">
                    <button
                      onClick={handleBackToStep2}
                      disabled={isSubmitting}
                      className="flex-1 px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-slate-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <ArrowLeft className="w-5 h-5 mr-2" />
                      Back
                    </button>
                    <button
                      onClick={handleSaveAndPrint}
                      disabled={isSubmitting || !damageNote.trim() || damagePhotos.length === 0}
                      className="flex-1 px-6 py-3 bg-blue-600 dark:bg-indigo-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Printer className="w-5 h-5 mr-2" />
                          Save & Print
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced View Return Modal */}
      {isViewModalOpen && selectedReturn && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Package className="w-6 h-6 mr-2" />
                  Return Details
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedReturn.returnNumber}
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
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Return Information Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Return Information
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Return Number:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium">
                          {selectedReturn.returnNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Return Date:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium">
                          {new Date(selectedReturn.returnDate).toLocaleDateString('en-LK', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Return Type:</span>
                        <span className="ml-2">
                          {selectedReturn.returnType === 'Standard' ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              Standard
                            </span>
                          ) : selectedReturn.returnType === 'Damage' ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                              Damage
                            </span>
                          ) : selectedReturn.returnType === 'Missing' ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                              Missing
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              Exchange
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Status:</span>
                        <span className="ml-2">
                          {selectedReturn.status === 'Completed' ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                              Completed
                            </span>
                          ) : selectedReturn.status === 'Under Review' ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                              Under Review
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200">
                              Pending
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Inspected By:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium">
                          {selectedReturn.inspectedBy}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide flex items-center">
                      <Building2 className="w-4 h-4 mr-2" />
                      Customer Information
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Customer Name:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium">
                          {selectedReturn.customerName}
                        </span>
                      </div>
                      {selectedReturn.rentalDetails && (
                        <>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                            <span className="ml-2 text-gray-900 dark:text-white font-medium">
                              {selectedReturn.rentalDetails.customerPhone}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Email:</span>
                            <span className="ml-2 text-gray-900 dark:text-white font-medium">
                              {selectedReturn.rentalDetails.customerEmail}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Machine Information Section */}
                {selectedReturn.machineDetails && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-4 flex items-center">
                      <Package className="w-5 h-5 mr-2" />
                      Machine Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Machine Name:</span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineName}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Machine ID:</span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineId}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Model:</span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineDetails.model}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Serial Number:</span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineDetails.serialNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Manufacturer:</span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineDetails.manufacturer}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Year:</span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineDetails.year}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Category:</span>
                        <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                          {selectedReturn.machineDetails.category}
                        </span>
                      </div>
                      {selectedReturn.machineDetails.location && (
                        <div className="flex items-start">
                          <MapPin className="w-4 h-4 mr-1 mt-0.5 text-gray-500 dark:text-gray-400" />
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Location:</span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {selectedReturn.machineDetails.location}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rental Information Section */}
                {selectedReturn.rentalDetails && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2" />
                      Rental Information
                    </h4>
                    
                    <div className="space-y-4">
                      {/* Agreement Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Agreement Number:</span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                            {selectedReturn.rentalDetails.agreementNumber}
                          </span>
                        </div>
                      </div>

                      {/* Rental Period */}
                      <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                        <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          Rental Period
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {new Date(selectedReturn.rentalDetails.rentalStartDate).toLocaleDateString('en-LK', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {new Date(selectedReturn.rentalDetails.rentalEndDate).toLocaleDateString('en-LK', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Rental Period:</span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {selectedReturn.rentalDetails.rentalPeriod}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Expected Return:</span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {new Date(selectedReturn.rentalDetails.expectedReturnDate).toLocaleDateString('en-LK', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Dispatched Date:</span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {new Date(selectedReturn.rentalDetails.dispatchedDate).toLocaleDateString('en-LK', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Financial Details */}
                      <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                        <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center">
                          <DollarSign className="w-4 h-4 mr-2" />
                          Financial Details
                        </h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Monthly Rate:</span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              Rs. {selectedReturn.rentalDetails.monthlyRate.toLocaleString('en-LK', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              Rs. {selectedReturn.rentalDetails.totalAmount.toLocaleString('en-LK', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Paid Amount:</span>
                            <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                              Rs. {selectedReturn.rentalDetails.paidAmount.toLocaleString('en-LK', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Outstanding:</span>
                            <span className="ml-2 font-semibold text-red-600 dark:text-red-400">
                              Rs. {selectedReturn.rentalDetails.outstandingAmount.toLocaleString('en-LK', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Security Deposit:</span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              Rs. {selectedReturn.rentalDetails.securityDeposit.toLocaleString('en-LK', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Damage/Missing Details Section */}
                {(selectedReturn.returnType === 'Damage' || selectedReturn.returnType === 'Missing') && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-4 flex items-center">
                      <Camera className="w-5 h-5 mr-2" />
                      {selectedReturn.returnType === 'Damage' ? 'Damage' : 'Missing Parts'} Details
                    </h4>
                    <div className="space-y-4">
                      {selectedReturn.damageNote && (
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Note:</span>
                          <p className="mt-2 p-3 bg-white dark:bg-slate-700 rounded-lg text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-slate-600">
                            {selectedReturn.damageNote}
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {selectedReturn.photosCount && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Photos Attached:</span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {selectedReturn.photosCount} photo(s)
                            </span>
                          </div>
                        )}
                        {selectedReturn.repairCost && (
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Repair Cost:</span>
                            <span className="ml-2 font-semibold text-red-600 dark:text-red-400">
                              Rs. {selectedReturn.repairCost.toLocaleString('en-LK', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsPage;