'use client';

import React, { useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import CreateForm, { FormField } from '@/src/components/form-popup/create';
import UpdateForm from '@/src/components/form-popup/update';
import DeleteForm from '@/src/components/form-popup/delete';
import { Eye, Pencil, Trash2, X, History, Image as ImageIcon, ChevronLeft, ChevronRight, QrCode, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Tooltip from '@/src/components/common/tooltip';
import { validateSerialNumber, validateBoxNumber } from '@/src/utils/validation';

type MachineType = 'Industrial' | 'Domestic' | 'Embroidery' | 'Overlock' | 'Buttonhole' | 'Other';

interface Machine {
  id: number;
  barcode: string;
  serialNumber: string;
  boxNo: string;
  brand: string;
  model: string;
  type: MachineType;
}

// Machine Profile Data Types
interface MachineInfo {
  id: number;
  barcode: string;
  serialNumber: string;
  boxNo: string;
  brand: string;
  model: string;
  type: MachineType;
  status: 'Available' | 'Rented' | 'Maintenance' | 'Retired';
  currentCustomer?: string;
  photos?: string[]; // URLs or paths to photos
  purchaseDate?: string;
  warrantyExpiry?: string;
  location?: string;
  notes?: string;
  manufactureYear?: string;
  country?: string;
  conditionOnArrival?: string;
  warrantyStatus?: string;
  registrationLocation?: string;
}

// Machine Rental History Data Types
interface MachineRentalHistory {
  id: number;
  serialNumber: string;
  brand: string;
  model: string;
  type: MachineType;
  customer: string;
  rentingPeriod: string; // e.g., "2024-01-15 to 2024-02-15"
  startDate: string;
  endDate: string | null;
  status: 'Active' | 'Completed' | 'Cancelled';
}


// Mock machine data
const mockMachines: Machine[] = [
  {
    id: 1,
    barcode: 'BROTHER-XL2600I-SN-2024-001',
    serialNumber: 'SN-2024-001',
    boxNo: 'BOX-2024-001',
    brand: 'Brother',
    model: 'XL2600i',
    type: 'Domestic',
  },
  {
    id: 2,
    barcode: 'SINGER-HEAVY-DUTY-4423-SN-2024-002',
    serialNumber: 'SN-2024-002',
    boxNo: 'BOX-2024-002',
    brand: 'Singer',
    model: 'Heavy Duty 4423',
    type: 'Industrial',
  },
  {
    id: 3,
    barcode: 'JANOME-HD3000-SN-2024-003',
    serialNumber: 'SN-2024-003',
    boxNo: 'BOX-2024-003',
    brand: 'Janome',
    model: 'HD3000',
    type: 'Domestic',
  },
  {
    id: 4,
    barcode: 'BROTHER-SE600-SN-2024-004',
    serialNumber: 'SN-2024-004',
    boxNo: 'BOX-2024-004',
    brand: 'Brother',
    model: 'SE600',
    type: 'Embroidery',
  },
  {
    id: 5,
    barcode: 'JUKI-MO-654DE-SN-2024-005',
    serialNumber: 'SN-2024-005',
    boxNo: 'BOX-2024-005',
    brand: 'Juki',
    model: 'MO-654DE',
    type: 'Overlock',
  },
  {
    id: 6,
    barcode: 'SINGER-BUTTONHOLE-160-SN-2024-006',
    serialNumber: 'SN-2024-006',
    boxNo: 'BOX-2024-006',
    brand: 'Singer',
    model: 'Buttonhole 160',
    type: 'Buttonhole',
  },
  {
    id: 7,
    barcode: 'BROTHER-CS6000I-SN-2024-007',
    serialNumber: 'SN-2024-007',
    boxNo: 'BOX-2024-007',
    brand: 'Brother',
    model: 'CS6000i',
    type: 'Domestic',
  },
  {
    id: 8,
    barcode: 'JANOME-MB-4S-SN-2024-008',
    serialNumber: 'SN-2024-008',
    boxNo: 'BOX-2024-008',
    brand: 'Janome',
    model: 'MB-4S',
    type: 'Industrial',
  },
];

// Mock function to get machine profile data (replace with API call later)
const getMachineProfileData = (machineId: number): MachineInfo => {
  const machine = mockMachines.find((m) => m.id === machineId);
  return {
    id: machine?.id || 0,
    barcode: machine?.barcode || '',
    serialNumber: machine?.serialNumber || '',
    boxNo: machine?.boxNo || '',
    brand: machine?.brand || '',
    model: machine?.model || '',
    type: machine?.type || 'Domestic',
    status: machineId === 2 || machineId === 4 ? 'Rented' : 'Available',
    currentCustomer: machineId === 2 ? 'ABC Holdings (Pvt) Ltd' : machineId === 4 ? 'John Perera' : undefined,
    photos: [
      'https://via.placeholder.com/800x600?text=Photo+1',
      'https://via.placeholder.com/800x600?text=Photo+2',
      'https://via.placeholder.com/800x600?text=Photo+3',
    ],
    purchaseDate: '2024-01-15',
    warrantyExpiry: '2027-01-15',
    location: 'Main Warehouse',
    notes: 'Regular maintenance required every 200 hours of operation.',
    manufactureYear: '2024',
    country: 'Sri Lanka',
    conditionOnArrival: 'New',
    warrantyStatus: 'Active',
    registrationLocation: 'Main Warehouse',
  };
};

// Mock function to get machine rental history (replace with API call later)
const getMachineRentalHistory = (machineId: number): MachineRentalHistory[] => {
  const machine = mockMachines.find((m) => m.id === machineId);
  if (!machine) return [];

  // Generate mock rental history based on machine
  const history: MachineRentalHistory[] = [
    {
      id: 1,
      serialNumber: machine.serialNumber,
      brand: machine.brand,
      model: machine.model,
      type: machine.type,
      customer: 'ABC Holdings (Pvt) Ltd',
      rentingPeriod: '2024-01-15 to 2024-02-15',
      startDate: '2024-01-15',
      endDate: '2024-02-15',
      status: 'Completed',
    },
    {
      id: 2,
      serialNumber: machine.serialNumber,
      brand: machine.brand,
      model: machine.model,
      type: machine.type,
      customer: 'XYZ Engineering',
      rentingPeriod: '2024-03-01 to 2024-03-31',
      startDate: '2024-03-01',
      endDate: '2024-03-31',
      status: 'Completed',
    },
    {
      id: 3,
      serialNumber: machine.serialNumber,
      brand: machine.brand,
      model: machine.model,
      type: machine.type,
      customer: machineId === 2 ? 'ABC Holdings (Pvt) Ltd' : machineId === 4 ? 'John Perera' : 'Mega Constructions',
      rentingPeriod: machineId === 2 || machineId === 4 ? '2024-04-01 to Present' : '2024-04-10 to 2024-05-10',
      startDate: '2024-04-01',
      endDate: machineId === 2 || machineId === 4 ? null : '2024-05-10',
      status: machineId === 2 || machineId === 4 ? 'Active' : 'Completed',
    },
  ];

  return history;
};

// Table column configuration
const columns: TableColumn[] = [
  {
    key: 'barcode',
    label: 'Description',
    sortable: true,
    filterable: true,
  },
  {
    key: 'brand',
    label: 'Brand',
    sortable: true,
    filterable: true,
  },
  {
    key: 'model',
    label: 'Model',
    sortable: true,
    filterable: true,
  },
  {
    key: 'type',
    label: 'Type',
    sortable: true,
    filterable: true,
    render: (value: MachineType) => {
      const base =
        'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
      const typeColors: Record<MachineType, string> = {
        Industrial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        Domestic: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        Embroidery: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
        Overlock: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        Buttonhole: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
        Other: 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200',
      };
      return (
        <span className={`${base} ${typeColors[value] || typeColors.Other}`}>
          {value}
        </span>
      );
    },
  },
];

const MachineListPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [activeCreateTab, setActiveCreateTab] = useState<'machine' | 'tool'>('machine');
  const qrCodeRef = React.useRef<HTMLDivElement>(null);

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleCreateMachine = () => {
    setIsCreateModalOpen(true);
    setActiveCreateTab('machine');
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setActiveCreateTab('machine');
  };

  const handleViewMachine = (machine: Machine) => {
    setSelectedMachine(machine);
    setCurrentPhotoIndex(0); // Reset photo index when opening view
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedMachine(null);
    setCurrentPhotoIndex(0);
  };

  const handleUpdateMachine = (machine: Machine) => {
    setSelectedMachine(machine);
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedMachine(null);
  };

  const handleDeleteMachine = (machine: Machine) => {
    setSelectedMachine(machine);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedMachine(null);
  };

  const handleGenerateQR = (machine: Machine) => {
    setSelectedMachine(machine);
    setIsQRModalOpen(true);
  };

  const handleCloseQRModal = () => {
    setIsQRModalOpen(false);
    setSelectedMachine(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMachine) return;
    
    setIsSubmitting(true);
    try {
      console.log('Delete machine payload:', selectedMachine);
      // Replace with actual API call
      // await deleteMachineAPI(selectedMachine.id);
      alert(`Machine "${selectedMachine.brand} ${selectedMachine.model}" deleted (frontend only).`);
      handleCloseDeleteModal();
      // Optionally refresh the machine list here
    } catch (error) {
      console.error('Error deleting machine:', error);
      alert('Failed to delete machine. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewFullHistory = () => {
    setIsHistoryModalOpen(true);
  };

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
  };

  const handlePreviousPhoto = () => {
    if (!selectedMachine) return;
    const machineInfo = getMachineProfileData(selectedMachine.id);
    const photos = machineInfo.photos || [];
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNextPhoto = () => {
    if (!selectedMachine) return;
    const machineInfo = getMachineProfileData(selectedMachine.id);
    const photos = machineInfo.photos || [];
    setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  // Generate QR code data with all machine details
  const generateQRCodeData = (machine: Machine | null): string => {
    if (!machine) return '';
    
    const machineInfo = getMachineProfileData(machine.id);
    const qrData = {
      id: machineInfo.id,
      barcode: machineInfo.barcode,
      serialNumber: machineInfo.serialNumber,
      boxNo: machineInfo.boxNo,
      brand: machineInfo.brand,
      model: machineInfo.model,
      type: machineInfo.type,
      status: machineInfo.status,
      currentCustomer: machineInfo.currentCustomer || null,
      purchaseDate: machineInfo.purchaseDate || null,
      warrantyExpiry: machineInfo.warrantyExpiry || null,
      location: machineInfo.location || null,
      manufactureYear: machineInfo.manufactureYear || null,
      country: machineInfo.country || null,
      conditionOnArrival: machineInfo.conditionOnArrival || null,
      warrantyStatus: machineInfo.warrantyStatus || null,
      registrationLocation: machineInfo.registrationLocation || null,
      notes: machineInfo.notes || null,
    };
    
    return JSON.stringify(qrData, null, 2);
  };

  // Download QR code as PNG
  const handleDownloadQR = () => {
    if (!qrCodeRef.current || !selectedMachine) return;

    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${selectedMachine.brand}-${selectedMachine.model}-${selectedMachine.serialNumber}-QR.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Form fields for Machine Registration
  const machineFields: FormField[] = [
    {
      name: 'brand',
      label: 'Brand',
      type: 'select',
      placeholder: 'Select brand',
      required: true,
      options: [
        { label: 'Brother', value: 'Brother' },
        { label: 'Singer', value: 'Singer' },
        { label: 'Janome', value: 'Janome' },
        { label: 'Juki', value: 'Juki' },
        { label: 'Pfaff', value: 'Pfaff' },
        { label: 'Bernina', value: 'Bernina' },
        { label: 'Other', value: 'Other' },
      ],
    },
    {
      name: 'model',
      label: 'Model',
      type: 'select',
      placeholder: 'Select model',
      required: true,
      options: [
        { label: 'XL2600i', value: 'XL2600i' },
        { label: 'Heavy Duty 4423', value: 'Heavy Duty 4423' },
        { label: 'HD3000', value: 'HD3000' },
        { label: 'SE600', value: 'SE600' },
        { label: 'MO-654DE', value: 'MO-654DE' },
        { label: 'CS6000i', value: 'CS6000i' },
        { label: 'Other', value: 'Other' },
      ],
    },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      placeholder: 'Select machine type',
      required: true,
      options: [
        { label: 'Industrial', value: 'Industrial' },
        { label: 'Domestic', value: 'Domestic' },
        { label: 'Embroidery', value: 'Embroidery' },
        { label: 'Overlock', value: 'Overlock' },
        { label: 'Buttonhole', value: 'Buttonhole' },
        { label: 'Other', value: 'Other' },
      ],
    },
    {
      name: 'serialNumber',
      label: 'Serial Number',
      type: 'text',
      placeholder: 'Enter serial number',
      required: true,
      validation: validateSerialNumber,
    },
    {
      name: 'boxNo',
      label: 'BOX No',
      type: 'text',
      placeholder: 'Enter BOX number',
      required: true,
      validation: validateBoxNumber,
    },
    {
      name: 'manufactureYear',
      label: 'Manufact Year',
      type: 'date',
      placeholder: 'Select date',
      required: true,
    },
    {
      name: 'country',
      label: 'Country',
      type: 'text',
      placeholder: 'Enter country',
      required: true,
    },
    {
      name: 'conditionOnArrival',
      label: 'Condition on Arrival',
      type: 'select',
      placeholder: 'Select condition',
      required: true,
      options: [
        { label: 'New', value: 'New' },
        { label: 'Used', value: 'Used' },
        { label: 'Refurbished', value: 'Refurbished' },
      ],
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'Select status',
      required: true,
      options: [
        { label: 'Available', value: 'Available' },
        { label: 'Rented', value: 'Rented' },
        { label: 'Maintenance', value: 'Maintenance' },
        { label: 'Retired', value: 'Retired' },
      ],
    },
    {
      name: 'warrantyStatus',
      label: 'Warranty Status',
      type: 'select',
      placeholder: 'Select warranty status',
      required: true,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Expired', value: 'Expired' },
        { label: 'No Warranty', value: 'No Warranty' },
      ],
    },
    {
      name: 'registrationLocation',
      label: 'Registration Location',
      type: 'select',
      placeholder: 'Select location',
      required: true,
      options: [
        { label: 'Main Warehouse', value: 'Main Warehouse' },
        { label: 'Branch Office 1', value: 'Branch Office 1' },
        { label: 'Branch Office 2', value: 'Branch Office 2' },
        { label: 'Storage Facility', value: 'Storage Facility' },
      ],
    },
    {
      name: 'warrantyExpiryDate',
      label: 'Warranty Expires Date',
      type: 'date',
      placeholder: 'Select date',
      required: false,
    },
    // File upload fields
    {
      name: 'referencePhoto',
      label: 'Reference Photo',
      type: 'file-multiple',
      accept: 'image/*',
      required: false,
      multiple: true,
    },
    {
      name: 'serialPlatePhoto',
      label: 'Serial Plate Photo',
      type: 'file-multiple',
      accept: 'image/*',
      required: false,
      multiple: true,
    },
    {
      name: 'invoiceGrn',
      label: 'Invoice/GRN',
      type: 'file-multiple',
      accept: 'application/pdf,image/*',
      required: false,
      multiple: true,
    },
  ];

  // Form fields for Tool Registration
  const toolFields: FormField[] = [
    {
      name: 'toolName',
      label: 'Tool Name',
      type: 'text',
      placeholder: 'Enter tool name',
      required: true,
    },
    {
      name: 'toolType',
      label: 'Tool Type',
      type: 'select',
      placeholder: 'Select tool type',
      required: true,
      options: [
        { label: 'Thread Stand', value: 'Thread Stand' },
        { label: 'Extension Table', value: 'Extension Table' },
        { label: 'Presser Foot Set', value: 'Presser Foot Set' },
        { label: 'Bobbin Case', value: 'Bobbin Case' },
        { label: 'Needle Set', value: 'Needle Set' },
        { label: 'Thread Spool', value: 'Thread Spool' },
        { label: 'Seam Ripper', value: 'Seam Ripper' },
        { label: 'Measuring Tape', value: 'Measuring Tape' },
        { label: 'Scissors', value: 'Scissors' },
        { label: 'Other', value: 'Other' },
      ],
    },
    {
      name: 'brand',
      label: 'Brand',
      type: 'text',
      placeholder: 'Enter brand name',
      required: false,
    },
    {
      name: 'model',
      label: 'Model',
      type: 'text',
      placeholder: 'Enter model number',
      required: false,
    },
    {
      name: 'serialNumber',
      label: 'Serial Number',
      type: 'text',
      placeholder: 'Enter serial number (if applicable)',
      required: false,
    },
    {
      name: 'quantity',
      label: 'Quantity',
      type: 'number',
      placeholder: 'Enter quantity',
      required: true,
    },
    {
      name: 'unitPrice',
      label: 'Unit Price',
      type: 'number',
      placeholder: 'Enter unit price',
      required: false,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'Select status',
      required: true,
      options: [
        { label: 'Available', value: 'Available' },
        { label: 'In Use', value: 'In Use' },
        { label: 'Maintenance', value: 'Maintenance' },
        { label: 'Retired', value: 'Retired' },
      ],
    },
    {
      name: 'location',
      label: 'Location',
      type: 'select',
      placeholder: 'Select location',
      required: true,
      options: [
        { label: 'Main Warehouse', value: 'Main Warehouse' },
        { label: 'Branch Office 1', value: 'Branch Office 1' },
        { label: 'Branch Office 2', value: 'Branch Office 2' },
        { label: 'Storage Facility', value: 'Storage Facility' },
      ],
    },
    {
      name: 'purchaseDate',
      label: 'Purchase Date',
      type: 'date',
      placeholder: 'Select date',
      required: false,
    },
    {
      name: 'condition',
      label: 'Condition',
      type: 'select',
      placeholder: 'Select condition',
      required: true,
      options: [
        { label: 'New', value: 'New' },
        { label: 'Good', value: 'Good' },
        { label: 'Fair', value: 'Fair' },
        { label: 'Poor', value: 'Poor' },
      ],
    },
    {
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
      placeholder: 'Enter any additional notes',
      required: false,
      rows: 3,
    },
    {
      name: 'toolPhoto',
      label: 'Tool Photo',
      type: 'file-multiple',
      accept: 'image/*',
      required: false,
      multiple: true,
    },
  ];

  // Auto-generate QR/Barcode from Brand + Model + Serial Number
  const generateBarcode = (brand: string, model: string, serialNumber: string): string => {
    if (!brand || !model || !serialNumber) return '';
    return `${brand}-${model}-${serialNumber}`.replace(/\s+/g, '-').toUpperCase();
  };

  // Get initial data for update form
  const getUpdateInitialData = (machine: Machine | null) => {
    if (!machine) return {};

    return {
      barcode: machine.barcode,
      serialNumber: machine.serialNumber,
      boxNo: machine.boxNo,
      brand: machine.brand,
      model: machine.model,
      type: machine.type,
    };
  };

  // Get delete confirmation details
  const getDeleteDetails = (machine: Machine | null) => {
    if (!machine) return [];

    return [
      { label: 'Barcode', value: machine.barcode },
      { label: 'Serial Number', value: machine.serialNumber },
      { label: 'BOX No', value: machine.boxNo },
      { label: 'Brand', value: machine.brand },
      { label: 'Model', value: machine.model },
      { label: 'Type', value: machine.type },
    ];
  };

  const handleMachineSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      // Auto-generate barcode
      const barcode = generateBarcode(data.brand, data.model, data.serialNumber);
      
      const submissionData = {
        ...data,
        barcode,
      };
      
      console.log('Create machine payload:', submissionData);
      alert(`Machine "${data.brand} ${data.model}" registered successfully (frontend only).`);
      handleCloseCreateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToolSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      console.log('Create tool payload:', data);
      alert(`Tool "${data.toolName}" registered successfully (frontend only).`);
      handleCloseCreateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMachineUpdate = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      console.log('Update machine payload:', data);
      alert(`Machine "${data.brand} ${data.model}" updated (frontend only).`);
      handleCloseUpdateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    console.log('Form cleared');
  };

  
    // Action buttons
    const actions: ActionButton[] = [
      {
        label: '',
        icon: <Eye className="w-4 h-4" />,
        variant: 'secondary',
        onClick: handleViewMachine,
        tooltip: 'View Machine',
        className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
      },
      {
        label: '',
        icon: <Pencil className="w-4 h-4" />,
        variant: 'primary',
        onClick: handleUpdateMachine,
        tooltip: 'Update Machine',
        className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500',
      },
      {
        label: '',
        icon: <QrCode className="w-4 h-4" />,
        variant: 'secondary',
        onClick: handleGenerateQR,
        tooltip: 'Generate QR Code',
        className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
      },
      {
        label: '',
        icon: <Trash2 className="w-4 h-4" />,
        variant: 'danger',
        onClick: handleDeleteMachine,
        tooltip: 'Delete Machine',
        className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500 dark:focus:ring-red-500',
      },
    ];

  // Rental History Table Columns
  const rentalHistoryColumns: TableColumn[] = [
    {
      key: 'serialNumber',
      label: 'Serial Number',
      sortable: true,
      filterable: true,
    },
    {
      key: 'brand',
      label: 'Brand',
      sortable: true,
      filterable: true,
    },
    {
      key: 'model',
      label: 'Model',
      sortable: true,
      filterable: true,
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      filterable: true,
      render: (value: MachineType) => {
        const base =
          'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
        const typeColors: Record<MachineType, string> = {
          Industrial: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
          Domestic: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
          Embroidery: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
          Overlock: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
          Buttonhole: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
          Other: 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200',
        };
        return (
          <span className={`${base} ${typeColors[value] || typeColors.Other}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      filterable: true,
    },
    {
      key: 'rentingPeriod',
      label: 'Renting Period',
      sortable: true,
      filterable: false,
      render: (value: string, row: MachineRentalHistory) => {
        return (
          <span className="text-gray-900 dark:text-white font-medium">
            {value}
          </span>
        );
      },
    },
  ];

  // View Machine Profile Content - Professional Design with Photos at Top
  const renderMachineProfile = () => {
    if (!selectedMachine) return null;

    const machineInfo = getMachineProfileData(selectedMachine.id);
    const photos = machineInfo.photos || [];
    const hasMultiplePhotos = photos.length > 1;
    const currentPhoto = photos[currentPhotoIndex] || null;

    return (
      <div className="space-y-6">
        {/* Photo Section at Top */}
        {photos.length > 0 && (
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">
              Photos
            </h4>
            <div className="relative w-full max-w-2xl mx-auto">
              <div className="relative w-full h-64 bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-slate-600">
                {currentPhoto ? (
                  <img
                    src={currentPhoto}
                    alt={`Photo ${currentPhotoIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                )}

                {/* Navigation Buttons */}
                {hasMultiplePhotos && (
                  <>
                    <button
                      onClick={handlePreviousPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 z-10"
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 z-10"
                      aria-label="Next photo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Photo Counter */}
                {hasMultiplePhotos && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/60 dark:bg-slate-900/80 rounded-full text-white text-sm font-medium">
                    {currentPhotoIndex + 1} / {photos.length}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Machine Details</h3>
        
        <div className="space-y-4">
          {/* Basic Information */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Brand:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {machineInfo.brand}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Model:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {machineInfo.model}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Type:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {machineInfo.type}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Serial Number:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {machineInfo.serialNumber}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">BOX No:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {machineInfo.boxNo}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Barcode:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium font-mono text-xs">
                  {machineInfo.barcode}
                </span>
              </div>
            </div>
          </div>

          {/* Status & Customer */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Current Status
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                <div className="mt-1">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center ${
                      machineInfo.status === 'Available'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : machineInfo.status === 'Rented'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        : machineInfo.status === 'Maintenance'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200'
                    }`}
                  >
                    {machineInfo.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Current Customer:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {machineInfo.currentCustomer || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              Additional Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {machineInfo.manufactureYear && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Manufacture Year:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {machineInfo.manufactureYear}
                  </span>
                </div>
              )}
              {machineInfo.country && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Country:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {machineInfo.country}
                  </span>
                </div>
              )}
              {machineInfo.conditionOnArrival && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Condition on Arrival:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {machineInfo.conditionOnArrival}
                  </span>
                </div>
              )}
              {machineInfo.warrantyStatus && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Warranty Status:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {machineInfo.warrantyStatus}
                  </span>
                </div>
              )}
              {machineInfo.purchaseDate && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Purchase Date:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {new Date(machineInfo.purchaseDate).toLocaleDateString('en-LK')}
                  </span>
                </div>
              )}
              {machineInfo.warrantyExpiry && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Warranty Expiry:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {new Date(machineInfo.warrantyExpiry).toLocaleDateString('en-LK')}
                  </span>
                </div>
              )}
              {machineInfo.location && (
                <div className="md:col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">Location:</span>
                  <span className="ml-2 text-gray-900 dark:text-white font-medium">
                    {machineInfo.location}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {machineInfo.notes && (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Notes
              </h4>
              <p className="text-sm text-gray-900 dark:text-white">
                {machineInfo.notes}
              </p>
            </div>
          )}

          {/* View Full History Button */}
          <div className="pt-2">
            <button
              onClick={handleViewFullHistory}
              className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
            >
              <History className="w-4 h-4 mr-2" />
              View full history
            </button>
          </div>
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
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Machine Management
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Overview of all sewing machines with their details, brand, model, and type.
              </p>
            </div>
          </div>

          {/* Machine table card */}
          <Table
            data={mockMachines}
            columns={columns}
            actions={actions}
            itemsPerPage={10}
            searchable
            filterable
            onCreateClick={handleCreateMachine}
            createButtonLabel="Register"
            emptyMessage="No machines found."
          />
        </div>
      </main>

      {/* Create Machine/Tool Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Register
              </h2>
              <Tooltip content="Close">
                <button
                  onClick={handleCloseCreateModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-slate-700 px-6">
              <div className="flex space-x-4">
                <Tooltip content="Machine">
                  <button
                    onClick={() => setActiveCreateTab('machine')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeCreateTab === 'machine'
                        ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    Machine
                  </button>
                </Tooltip>
                <Tooltip content="Tool">
                  <button
                    onClick={() => setActiveCreateTab('tool')}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeCreateTab === 'tool'
                        ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    Tool
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeCreateTab === 'machine' ? (
                <CreateForm
                  title="Machine Registration"
                  fields={machineFields}
                  onSubmit={handleMachineSubmit}
                  onClear={handleClear}
                  submitButtonLabel="Register"
                  clearButtonLabel="Clear"
                  loading={isSubmitting}
                  enableDynamicSpecs={false}
                  className="shadow-none border-0 p-0"
                />
              ) : (
                <CreateForm
                  title="Tool Registration"
                  fields={toolFields}
                  onSubmit={handleToolSubmit}
                  onClear={handleClear}
                  submitButtonLabel="Register"
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

      {/* Update Machine Modal */}
      {isUpdateModalOpen && selectedMachine && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Update Machine
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
                title="Update Machine Details"
                fields={machineFields}
                onSubmit={handleMachineUpdate}
                onClear={handleClear}
                submitButtonLabel="Update"
                clearButtonLabel="Reset"
                loading={isSubmitting}
                initialData={getUpdateInitialData(selectedMachine)}
                className="shadow-none border-0 p-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Machine Modal */}
      {isDeleteModalOpen && selectedMachine && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Delete Machine
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
                title="Delete Machine"
                message="This will permanently delete the machine and all associated data. This action cannot be undone."
                itemName={`${selectedMachine.brand} ${selectedMachine.model}`}
                itemDetails={getDeleteDetails(selectedMachine)}
                onConfirm={handleConfirmDelete}
                onCancel={handleCloseDeleteModal}
                confirmButtonLabel="Delete Machine"
                cancelButtonLabel="Cancel"
                loading={isSubmitting}
                className="shadow-none border-0 p-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* View Machine Profile Modal - Professional Design */}
      {isViewModalOpen && selectedMachine && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Machine Profile
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedMachine.brand} {selectedMachine.model}
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
              {renderMachineProfile()}
            </div>
          </div>
        </div>
      )}

      {/* Full History Modal */}
      {isHistoryModalOpen && selectedMachine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Full History of Machine
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedMachine.brand} {selectedMachine.model} - {selectedMachine.serialNumber}
                </p>
              </div>
              <button
                onClick={handleCloseHistoryModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <Table
                  data={getMachineRentalHistory(selectedMachine.id)}
                  columns={rentalHistoryColumns}
                  itemsPerPage={10}
                  searchable
                  filterable
                  emptyMessage="No rental history found for this machine."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Generation Modal */}
      {isQRModalOpen && selectedMachine && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Machine QR Code
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedMachine.brand} {selectedMachine.model} - {selectedMachine.serialNumber}
                </p>
              </div>
              <button
                onClick={handleCloseQRModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* QR Code Display */}
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div 
                    ref={qrCodeRef}
                    className="bg-white dark:bg-white p-6 rounded-lg border-2 border-gray-200 dark:border-gray-300 shadow-lg"
                  >
                    <QRCodeSVG
                      value={generateQRCodeData(selectedMachine)}
                      size={300}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  
                  {/* Machine Info Summary */}
                  <div className="w-full bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                      QR Code Contains
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Brand:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium">
                          {selectedMachine.brand}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Model:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium">
                          {selectedMachine.model}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Serial No:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium">
                          {selectedMachine.serialNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">BOX No:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium">
                          {selectedMachine.boxNo}
                        </span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-gray-500 dark:text-gray-400">Barcode:</span>
                        <span className="ml-2 text-gray-900 dark:text-white font-medium font-mono text-xs">
                          {selectedMachine.barcode}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      * This QR code contains complete machine details in JSON format
                    </p>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={handleDownloadQR}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download QR Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineListPage;