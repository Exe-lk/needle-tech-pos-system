'use client';

import React, { useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import UpdateForm from '@/src/components/form-popup/update';
import { Eye, Pencil, X, Plus, Trash2, Printer } from 'lucide-react';

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

// Mock rental agreements for dropdown (you can fetch from API later)
const mockRentalAgreements = [
  { 
    id: 'RA-2024-001', 
    customerName: 'ABC Holdings (Pvt) Ltd',
    customerAddress: '123 Main Street, Colombo 05'
  },
  { 
    id: 'RA-2024-002', 
    customerName: 'John Perera',
    customerAddress: '456 Galle Road, Mount Lavinia'
  },
  { 
    id: 'RA-2024-003', 
    customerName: 'XYZ Engineering',
    customerAddress: '789 Kandy Road, Peradeniya'
  },
  { 
    id: 'RA-2024-004', 
    customerName: 'Kamal Silva',
    customerAddress: '321 Negombo Road, Wattala'
  },
  { 
    id: 'RA-2024-005', 
    customerName: 'Mega Constructions',
    customerAddress: '654 High Level Road, Maharagama'
  },
  {
    id: 'RA-2024-006',
    customerName: 'VIHANGA SHADE STRUCTURES',
    customerAddress: '317/2, NEW KANDY ROAD, BIYAGAMA'
  }
];

// Mock gate pass data
const mockGatePasses: GatePass[] = [
  {
    id: 1,
    gatepassNo: '016633',
    agreementReference: 'RA-2024-001',
    dateOfIssue: '2024-01-20',
    returnable: true,
    entry: 'OUT',
    from: 'Needle Technologies',
    to: 'ABC Holdings (Pvt) Ltd',
    toAddress: '123 Main Street, Colombo 05',
    vehicleNumber: 'ABC-1234',
    driverName: 'Nimal Perera',
    items: [
      {
        id: '1',
        description: 'JUKI LX-1903A-SS - ELECTRONIC BAR TACK MACHINE',
        status: 'GOOD',
        serialNo: '2LIDH01733',
        motorBoxNo: 'NMBDH01171',
      },
    ],
    issuedBy: 'Admin User',
    receivedBy: 'Nimal Perera',
  },
  {
    id: 2,
    gatepassNo: '016634',
    agreementReference: 'RA-2024-002',
    dateOfIssue: '2024-03-05',
    returnable: false,
    entry: 'OUT',
    from: 'Needle Technologies',
    to: 'John Perera',
    toAddress: '456 Galle Road, Mount Lavinia',
    vehicleNumber: 'XYZ-5678',
    driverName: 'Kamal Silva',
    items: [
      {
        id: '1',
        description: 'BROTHER XL2600i - DOMESTIC SEWING MACHINE',
        status: 'GOOD',
        serialNo: 'BR-2024-001',
        motorBoxNo: 'BOX-2024-001',
      },
    ],
    issuedBy: 'Admin User',
  },
];

// Table column configuration
const columns: TableColumn[] = [
  {
    key: 'gatepassNo',
    label: 'Gatepass No',
    sortable: true,
    filterable: true,
  },
  {
    key: 'agreementReference',
    label: 'Agreement Reference',
    sortable: true,
    filterable: true,
  },
  {
    key: 'driverName',
    label: 'Driver Name',
    sortable: true,
    filterable: true,
  },
  {
    key: 'vehicleNumber',
    label: 'Vehicle Number',
    sortable: true,
    filterable: true,
  },
  {
    key: 'dateOfIssue',
    label: 'Date of Issue',
    sortable: true,
    filterable: false,
    render: (value: string) => {
      const date = new Date(value);
      return (
        <span className="text-gray-900 dark:text-white">
          {date.toLocaleDateString('en-LK', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      );
    },
  },
  {
    key: 'entry',
    label: 'Entry',
    sortable: true,
    filterable: true,
    render: (value: 'IN' | 'OUT') => {
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            value === 'OUT'
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          }`}
        >
          {value}
        </span>
      );
    },
  },
];

const GatePassPage: React.FC = () => {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedGatePass, setSelectedGatePass] = useState<GatePass | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [agreementReference, setAgreementReference] = useState('');
  const [dateOfIssue, setDateOfIssue] = useState('');
  const [returnable, setReturnable] = useState(true);
  const [entry, setEntry] = useState<'IN' | 'OUT'>('OUT');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [items, setItems] = useState<GatePassItem[]>([
    { id: '1', description: '', status: 'GOOD', serialNo: '', motorBoxNo: '' },
  ]);
  const [issuedBy, setIssuedBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const handleCreateGatePass = () => {
    setIsCreateModalOpen(true);
    // Reset form
    setAgreementReference('');
    setDateOfIssue(new Date().toISOString().split('T')[0]);
    setReturnable(true);
    setEntry('OUT');
    setVehicleNumber('');
    setDriverName('');
    setItems([{ id: '1', description: '', status: 'GOOD', serialNo: '', motorBoxNo: '' }]);
    setIssuedBy('');
    setReceivedBy('');
    setFormErrors({});
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setAgreementReference('');
    setDateOfIssue('');
    setReturnable(true);
    setEntry('OUT');
    setVehicleNumber('');
    setDriverName('');
    setItems([{ id: '1', description: '', status: 'GOOD', serialNo: '', motorBoxNo: '' }]);
    setIssuedBy('');
    setReceivedBy('');
    setFormErrors({});
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), description: '', status: 'GOOD', serialNo: '', motorBoxNo: '' },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof GatePassItem, value: string) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!agreementReference) errors.agreementReference = 'Agreement Reference is required';
    if (!dateOfIssue) errors.dateOfIssue = 'Date of Issue is required';
    if (!vehicleNumber.trim()) errors.vehicleNumber = 'Vehicle Number is required';
    if (!driverName.trim()) errors.driverName = 'Driver Name is required';

    items.forEach((item, index) => {
      if (!item.description.trim()) {
        errors[`item_description_${index}`] = 'Description is required';
      }
      if (!item.serialNo.trim()) {
        errors[`item_serialNo_${index}`] = 'Serial No is required';
      }
      if (!item.motorBoxNo.trim()) {
        errors[`item_motorBoxNo_${index}`] = 'Motor/Box No is required';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateGatepassNo = (): string => {
    // Generate a 6-digit gatepass number
    const num = Math.floor(Math.random() * 1000000);
    return num.toString().padStart(6, '0');
  };

  const handleSubmitCreate = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const agreement = mockRentalAgreements.find((a) => a.id === agreementReference);
      const gatepassNo = generateGatepassNo();

      const payload: GatePass = {
        id: Date.now(),
        gatepassNo,
        agreementReference,
        dateOfIssue,
        returnable,
        entry,
        from: 'Needle Technologies',
        to: agreement?.customerName || '',
        toAddress: agreement?.customerAddress || '',
        vehicleNumber,
        driverName,
        items: items.filter((item) => item.description.trim() !== ''),
        issuedBy: issuedBy || 'System',
        receivedBy: receivedBy || '',
      };

      console.log('Create gate pass payload:', payload);
      alert(`Gate Pass ${gatepassNo} created successfully (frontend only).`);
      handleCloseCreateModal();
    } catch (error) {
      console.error('Error creating gate pass:', error);
      alert('Failed to create gate pass. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewGatePass = (gatePass: GatePass) => {
    setSelectedGatePass(gatePass);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedGatePass(null);
  };

  const handleUpdateGatePass = (gatePass: GatePass) => {
    setSelectedGatePass(gatePass);
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedGatePass(null);
  };

  const handlePrintGatePass = () => {
    window.print();
  };

  // Form fields for Update
  const updateFields = [
    {
      name: 'agreementReference',
      label: 'Agreement Reference',
      type: 'select' as const,
      placeholder: 'Select agreement reference',
      required: true,
      options: mockRentalAgreements.map((agreement) => ({
        label: `${agreement.id} - ${agreement.customerName}`,
        value: agreement.id,
      })),
    },
    {
      name: 'dateOfIssue',
      label: 'Date of Issue',
      type: 'date' as const,
      placeholder: 'Select date of issue',
      required: true,
    },
    {
      name: 'returnable',
      label: 'Returnable',
      type: 'select' as const,
      placeholder: 'Select returnable status',
      required: true,
      options: [
        { label: 'YES', value: 'true' },
        { label: 'NO', value: 'false' },
      ],
    },
    {
      name: 'entry',
      label: 'Entry',
      type: 'select' as const,
      placeholder: 'Select entry type',
      required: true,
      options: [
        { label: 'IN', value: 'IN' },
        { label: 'OUT', value: 'OUT' },
      ],
    },
    {
      name: 'vehicleNumber',
      label: 'Vehicle Number',
      type: 'text' as const,
      placeholder: 'Enter vehicle number',
      required: true,
    },
    {
      name: 'driverName',
      label: 'Driver Name',
      type: 'text' as const,
      placeholder: 'Enter driver name',
      required: true,
    },
  ];

  // Get initial data for update form
  const getUpdateInitialData = (gatePass: GatePass | null) => {
    if (!gatePass) return {};

    return {
      agreementReference: gatePass.agreementReference,
      dateOfIssue: gatePass.dateOfIssue,
      returnable: gatePass.returnable ? 'true' : 'false',
      entry: gatePass.entry,
      vehicleNumber: gatePass.vehicleNumber,
      driverName: gatePass.driverName,
    };
  };

  const handleGatePassUpdate = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const agreement = mockRentalAgreements.find((a) => a.id === data.agreementReference);
      const payload = {
        ...data,
        returnable: data.returnable === 'true',
        from: 'Needle Technologies',
        to: agreement?.customerName || '',
        toAddress: agreement?.customerAddress || '',
      };

      console.log('Update gate pass payload:', payload);
      alert(`Gate Pass "${data.agreementReference}" updated (frontend only).`);
      handleCloseUpdateModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action buttons
  const actions: ActionButton[] = [
    {
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewGatePass,
    },
    {
      label: 'Update',
      icon: <Pencil className="w-4 h-4" />,
      variant: 'primary',
      onClick: handleUpdateGatePass,
    },
  ];

  // Render Gate Pass Document (matches the image format)
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

  // View Gate Pass Content
  const renderGatePassDetails = () => {
    if (!selectedGatePass) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Gate Pass Details
          </h3>
          <button
            onClick={handlePrintGatePass}
            className="px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>

        {/* Printable Gate Pass Document */}
        <div className="hidden print:block">{renderGatePassDocument(selectedGatePass)}</div>

        {/* Screen View */}
        <div className="print:hidden">{renderGatePassDocument(selectedGatePass)}</div>
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
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Gate Pass List</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Overview of all gate passes with agreement references, driver information, and dispatch
                details.
              </p>
            </div>
            <button
              onClick={handleCreateGatePass}
              className="px-6 py-2.5 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
            >
              Create Gate Pass
            </button>
          </div>

          {/* Gate Pass table card */}
          <Table
            data={mockGatePasses}
            columns={columns}
            actions={actions}
            itemsPerPage={10}
            searchable
            filterable
            emptyMessage="No gate passes found."
          />
        </div>
      </main>

      {/* Create Gate Pass Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Gate Pass Form
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
                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Agreement Reference */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Agreement Reference <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={agreementReference}
                      onChange={(e) => setAgreementReference(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        formErrors.agreementReference
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                    >
                      <option value="">Select Agreement Reference</option>
                      {mockRentalAgreements.map((agreement) => (
                        <option key={agreement.id} value={agreement.id}>
                          {agreement.id} - {agreement.customerName}
                        </option>
                      ))}
                    </select>
                    {formErrors.agreementReference && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.agreementReference}</p>
                    )}
                  </div>

                  {/* Date of Issue */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date of Issue <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dateOfIssue}
                      onChange={(e) => setDateOfIssue(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        formErrors.dateOfIssue
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                    />
                    {formErrors.dateOfIssue && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.dateOfIssue}</p>
                    )}
                  </div>

                  {/* Returnable */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Returnable <span className="text-red-500">*</span>
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

                  {/* Entry */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Entry <span className="text-red-500">*</span>
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

                  {/* Vehicle Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Vehicle Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                      placeholder="Enter vehicle number"
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        formErrors.vehicleNumber
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                    />
                    {formErrors.vehicleNumber && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.vehicleNumber}</p>
                    )}
                  </div>

                  {/* Driver Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Driver Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Enter driver name"
                      className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                        formErrors.driverName
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-slate-600'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                    />
                    {formErrors.driverName && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.driverName}</p>
                    )}
                  </div>

                  {/* Issued By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Issued By
                    </label>
                    <input
                      type="text"
                      value={issuedBy}
                      onChange={(e) => setIssuedBy(e.target.value)}
                      placeholder="Enter issuer name"
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                    />
                  </div>

                  {/* Received By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Received By
                    </label>
                    <input
                      type="text"
                      value={receivedBy}
                      onChange={(e) => setReceivedBy(e.target.value)}
                      placeholder="Enter receiver name"
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Items Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Items</h3>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Item
                    </button>
                  </div>
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Item {index + 1}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            placeholder="e.g., JUKI LX-1903A-SS - ELECTRONIC BAR TACK MACHINE"
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                              formErrors[`item_description_${index}`]
                                ? 'border-red-500'
                                : 'border-gray-300 dark:border-slate-600'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                          />
                          {formErrors[`item_description_${index}`] && (
                            <p className="mt-1 text-sm text-red-500">
                              {formErrors[`item_description_${index}`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Status <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={item.status}
                            onChange={(e) => handleItemChange(item.id, 'status', e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                          >
                            <option value="GOOD">GOOD</option>
                            <option value="FAIR">FAIR</option>
                            <option value="POOR">POOR</option>
                            <option value="DAMAGED">DAMAGED</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Serial No <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.serialNo}
                            onChange={(e) => handleItemChange(item.id, 'serialNo', e.target.value)}
                            placeholder="Enter serial number"
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                              formErrors[`item_serialNo_${index}`]
                                ? 'border-red-500'
                                : 'border-gray-300 dark:border-slate-600'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                          />
                          {formErrors[`item_serialNo_${index}`] && (
                            <p className="mt-1 text-sm text-red-500">
                              {formErrors[`item_serialNo_${index}`]}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Motor / Box No <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.motorBoxNo}
                            onChange={(e) => handleItemChange(item.id, 'motorBoxNo', e.target.value)}
                            placeholder="Enter motor/box number"
                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                              formErrors[`item_motorBoxNo_${index}`]
                                ? 'border-red-500'
                                : 'border-gray-300 dark:border-slate-600'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                          />
                          {formErrors[`item_motorBoxNo_${index}`] && (
                            <p className="mt-1 text-sm text-red-500">
                              {formErrors[`item_motorBoxNo_${index}`]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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
                {isSubmitting ? 'Creating...' : 'Create & Print'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Gate Pass Modal */}
      {isViewModalOpen && selectedGatePass && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Gate Pass Details
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {selectedGatePass.gatepassNo}
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
                  onClick={handleCloseViewModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">{renderGatePassDetails()}</div>
          </div>
        </div>
      )}

      {/* Update Gate Pass Modal */}
      {isUpdateModalOpen && selectedGatePass && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Update Gate Pass
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
                title="Update Gate Pass Details"
                fields={updateFields}
                onSubmit={handleGatePassUpdate}
                submitButtonLabel="Update"
                clearButtonLabel="Reset"
                loading={isSubmitting}
                initialData={getUpdateInitialData(selectedGatePass)}
                className="shadow-none border-0 p-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatePassPage;