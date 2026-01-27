'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import { Eye, X, FileText, CheckCircle2, Clock } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';

type PurchaseRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled' | 'Partially Fulfilled';
type CustomerType = 'Company' | 'Individual';

interface PurchaseRequest {
    id: number;
    requestNumber: string;
    customerId: number;
    customerName: string;
    customerType: CustomerType;
    requestDate: string;
    totalAmount: number;
    status: PurchaseRequestStatus;
    requestedMachines: number;
    machines: MachineRequestItem[];
    rentalAgreementIds?: number[];
}

interface MachineRequestItem {
    id: string;
    brand: string;
    model: string;
    type: string;
    quantity: number;
    availableStock: number;
    unitPrice: number;
    totalPrice: number;
    rentedQuantity?: number;
    pendingQuantity?: number;
}

// Mock customer data (from customers page)
const mockCustomers = [
    {
        id: 1,
        name: 'ABC Holdings (Pvt) Ltd',
        type: 'Company' as CustomerType,
        outstandingBalance: 120000.5,
        status: 'Active',
    },
    {
        id: 2,
        name: 'John Perera',
        type: 'Individual' as CustomerType,
        outstandingBalance: 3500,
        status: 'Active',
    },
    {
        id: 3,
        name: 'XYZ Engineering',
        type: 'Company' as CustomerType,
        outstandingBalance: 0,
        status: 'Inactive',
    },
    {
        id: 4,
        name: 'Kamal Silva',
        type: 'Individual' as CustomerType,
        outstandingBalance: 78000,
        status: 'Blocked',
    },
    {
        id: 5,
        name: 'Mega Constructions',
        type: 'Company' as CustomerType,
        outstandingBalance: 245000.75,
        status: 'Active',
    },
];

// Mock purchase requests data - Updated to include machine details
const mockPurchaseRequests: PurchaseRequest[] = [
    {
        id: 1,
        requestNumber: 'PO24010001',
        customerId: 1,
        customerName: 'ABC Holdings (Pvt) Ltd',
        customerType: 'Company',
        requestDate: '2024-04-15',
        totalAmount: 100000,
        status: 'Approved',
        requestedMachines: 2,
        machines: [
            {
                id: '1',
                brand: 'Brother',
                model: 'XL2600i',
                type: 'Domestic',
                quantity: 2,
                availableStock: 20,
                unitPrice: 35000,
                totalPrice: 70000,
                rentedQuantity: 2,
                pendingQuantity: 0,
            },
        ],
        rentalAgreementIds: [1],
    },
    {
        id: 2,
        requestNumber: 'PO24010002',
        customerId: 2,
        customerName: 'John Perera',
        customerType: 'Individual',
        requestDate: '2024-04-16',
        totalAmount: 35000,
        status: 'Approved',
        requestedMachines: 1,
        machines: [
            {
                id: '1',
                brand: 'Singer',
                model: 'Heavy Duty 4423',
                type: 'Industrial',
                quantity: 1,
                availableStock: 8,
                unitPrice: 50000,
                totalPrice: 50000,
                rentedQuantity: 0,
                pendingQuantity: 1,
            },
        ],
    },
    {
        id: 3,
        requestNumber: 'PO24010003',
        customerId: 5,
        customerName: 'Mega Constructions',
        customerType: 'Company',
        requestDate: '2024-04-17',
        totalAmount: 525000,
        status: 'Partially Fulfilled',
        requestedMachines: 15,
        machines: [
            {
                id: '1',
                brand: 'Brother',
                model: 'XL2600i',
                type: 'Domestic',
                quantity: 10,
                availableStock: 20,
                unitPrice: 35000,
                totalPrice: 350000,
                rentedQuantity: 10,
                pendingQuantity: 0,
            },
            {
                id: '2',
                brand: 'Singer',
                model: 'Heavy Duty 4423',
                type: 'Industrial',
                quantity: 5,
                availableStock: 8,
                unitPrice: 50000,
                totalPrice: 250000,
                rentedQuantity: 0,
                pendingQuantity: 5,
            },
        ],
        rentalAgreementIds: [2],
    },
    {
        id: 4,
        requestNumber: 'PO24010004',
        customerId: 3,
        customerName: 'XYZ Engineering',
        customerType: 'Company',
        requestDate: '2024-04-17',
        totalAmount: 725000,
        status: 'Pending',
        requestedMachines: 20,
        machines: [
            {
                id: '1',
                brand: 'Brother',
                model: 'XL2600i',
                type: 'Domestic',
                quantity: 10,
                availableStock: 20,
                unitPrice: 35000,
                totalPrice: 350000,
                rentedQuantity: 0,
                pendingQuantity: 10,
            },
            {
                id: '2',
                brand: 'Singer',
                model: 'Heavy Duty 4423',
                type: 'Industrial',
                quantity: 5,
                availableStock: 8,
                unitPrice: 50000,
                totalPrice: 250000,
                rentedQuantity: 0,
                pendingQuantity: 5,
            },
            {
                id: '3',
                brand: 'Janome',
                model: 'HD3000',
                type: 'Industrial',
                quantity: 5,
                availableStock: 0,
                unitPrice: 50000,
                totalPrice: 250000,
                rentedQuantity: 0,
                pendingQuantity: 5,
            },
        ],
        rentalAgreementIds: [2],
    },
];

// Table column configuration
const columns: TableColumn[] = [
    {
        key: 'requestNumber',
        label: 'Request Number',
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
        key: 'customerType',
        label: 'Customer Type',
        sortable: true,
        filterable: true,
        render: (value: CustomerType) => (
            <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>
        ),
    },
    {
        key: 'requestDate',
        label: 'Request Date',
        sortable: true,
        filterable: false,
        render: (value: string) => new Date(value).toLocaleDateString('en-LK'),
    },
    {
        key: 'requestedMachines',
        label: 'Machines',
        sortable: true,
        filterable: false,
        render: (value: number, row: PurchaseRequest) => {
            const totalRented = row.machines?.reduce((sum, m) => sum + (m.rentedQuantity || 0), 0) || 0;
            const totalPending = row.machines?.reduce((sum, m) => sum + (m.pendingQuantity || 0), 0) || 0;
            return (
                <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">{value}</span>
                    {totalRented > 0 && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                            {totalRented} rented
                        </span>
                    )}
                    {totalPending > 0 && (
                        <span className="text-xs text-yellow-600 dark:text-yellow-400">
                            {totalPending} pending
                        </span>
                    )}
                </div>
            );
        },
    },
    {
        key: 'totalAmount',
        label: 'Total Amount',
        sortable: true,
        filterable: false,
        render: (value: number) => (
            <span className="font-medium text-gray-900 dark:text-white">
                Rs. {value.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
        ),
    },
    {
        key: 'status',
        label: 'Status',
        sortable: true,
        filterable: true,
        render: (value: PurchaseRequestStatus) => {
            const base =
                'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
            if (value === 'Approved') {
                return (
                    <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
                        Approved
                    </span>
                );
            }
            if (value === 'Completed') {
                return (
                    <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}>
                        Completed
                    </span>
                );
            }
            if (value === 'Partially Fulfilled') {
                return (
                    <span className={`${base} bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`}>
                        Partially Fulfilled
                    </span>
                );
            }
            if (value === 'Rejected') {
                return (
                    <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>
                        Rejected
                    </span>
                );
            }
            if (value === 'Cancelled') {
                return (
                    <span className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200`}>
                        Cancelled
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

const PurchaseOrderPage: React.FC = () => {
    const router = useRouter();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isRentalModalOpen, setIsRentalModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedMachinesForRental, setSelectedMachinesForRental] = useState<Record<string, number>>({});

    // Rental agreement form state
    const [rentalStartDate, setRentalStartDate] = useState('');
    const [rentalEndDate, setRentalEndDate] = useState('');
    const [rentalFormErrors, setRentalFormErrors] = useState<Record<string, string>>({});

    // Helper function to check if a purchase request has available machines for rental
    const hasAvailableMachinesForRental = (request: PurchaseRequest): boolean => {
        if (!request.machines || request.machines.length === 0) return false;
        
        return request.machines.some(m => {
            const available = Math.min(m.availableStock, m.quantity - (m.rentedQuantity || 0));
            return available > 0;
        });
    };

    // Calculate available machines for rental from selected purchase request
    const availableMachinesForRental = useMemo(() => {
        if (!selectedRequest) return [];

        return selectedRequest.machines?.map((machine) => {
            const available = Math.min(machine.availableStock, machine.quantity - (machine.rentedQuantity || 0));
            const pending = machine.quantity - (machine.rentedQuantity || 0) - available;

            return {
                ...machine,
                canRent: available,
                stillPending: pending,
            };
        }).filter(m => m.canRent > 0) || [];
    }, [selectedRequest]);

    const handleMenuClick = () => {
        setIsMobileSidebarOpen((prev) => !prev);
    };

    const handleMobileSidebarClose = () => {
        setIsMobileSidebarOpen(false);
    };

    const handleLogout = () => {
        console.log('Logout clicked');
    };

    const handleCreatePurchaseRequest = () => {
        router.push('/purchase-order/create');
    };

    const handleViewRequest = (request: PurchaseRequest) => {
        setSelectedRequest(request);
        setIsViewModalOpen(true);
    };

    const handleCloseViewModal = () => {
        setIsViewModalOpen(false);
        setSelectedRequest(null);
    };

    const handleCreateRentalAgreement = (request: PurchaseRequest) => {
        setSelectedRequest(request);
        setSelectedMachinesForRental({});
        setRentalStartDate('');
        setRentalEndDate('');
        setRentalFormErrors({});

        // Calculate available machines for this request
        const availableMachines = request.machines?.map((machine) => {
            const available = Math.min(machine.availableStock, machine.quantity - (machine.rentedQuantity || 0));
            return {
                ...machine,
                canRent: available,
            };
        }).filter(m => m.canRent > 0) || [];

        // Pre-select all available machines with max available quantity
        const initialSelection: Record<string, number> = {};
        availableMachines.forEach((machine) => {
            initialSelection[machine.id] = machine.canRent;
        });
        setSelectedMachinesForRental(initialSelection);

        setIsRentalModalOpen(true);
    };

    const handleCloseRentalModal = () => {
        setIsRentalModalOpen(false);
        setSelectedRequest(null);
        setSelectedMachinesForRental({});
        setRentalStartDate('');
        setRentalEndDate('');
        setRentalFormErrors({});
    };

    const validateRentalForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!rentalStartDate) errors.rentalStartDate = 'Start date is required';
        if (!rentalEndDate) errors.rentalEndDate = 'End date is required';
        if (rentalStartDate && rentalEndDate && new Date(rentalEndDate) <= new Date(rentalStartDate)) {
            errors.rentalEndDate = 'End date must be after start date';
        }

        const hasSelection = Object.values(selectedMachinesForRental).some(qty => qty > 0);
        if (!hasSelection) {
            errors.machines = 'Please select at least one machine to rent';
        }

        setRentalFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmitRentalAgreement = async () => {
        if (!validateRentalForm() || !selectedRequest) {
            return;
        }

        setIsSubmitting(true);
        try {
            const machinesToRent = availableMachinesForRental
                .filter(m => selectedMachinesForRental[m.id] > 0)
                .map(m => ({
                    ...m,
                    quantity: selectedMachinesForRental[m.id],
                }));

            const payload = {
                purchaseRequestId: selectedRequest.id,
                purchaseRequestNumber: selectedRequest.requestNumber,
                customerId: selectedRequest.customerId,
                customerName: selectedRequest.customerName,
                startDate: rentalStartDate,
                endDate: rentalEndDate,
                machines: machinesToRent,
            };

            console.log('Create rental agreement from purchase request payload:', payload);
            alert(`Rental Agreement created successfully for ${machinesToRent.length} machine type(s) (frontend only).`);
            handleCloseRentalModal();
        } catch (error) {
            console.error('Error creating rental agreement:', error);
            alert('Failed to create rental agreement. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Action buttons with conditional visibility
    const actions: ActionButton[] = [
        {
            label: '',
            icon: <Eye className="w-4 h-4" />,
            variant: 'secondary',
            onClick: handleViewRequest,
            tooltip: 'View Purchase Request',
            className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
        },
        {
            label: '',
            icon: <FileText className="w-4 h-4" />,
            variant: 'primary',
            onClick: (row: PurchaseRequest) => {
                handleCreateRentalAgreement(row);
            },
            tooltip: 'Create Rental Agreement',
            className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500',
            shouldShow: (row: PurchaseRequest) => {
                // Status can be: 'Pending', 'Approved', or 'Partially Fulfilled'
                const statusEligible = row.status === 'Pending' || row.status === 'Approved' || row.status === 'Partially Fulfilled';
                const hasAvailable = hasAvailableMachinesForRental(row);
                return statusEligible && hasAvailable;
            },
        },
    ];

    // Render Purchase Request Details
    const renderRequestDetails = () => {
        if (!selectedRequest) return null;

        const totalRented = selectedRequest.machines?.reduce((sum, m) => sum + (m.rentedQuantity || 0), 0) || 0;
        const totalPending = selectedRequest.machines?.reduce((sum, m) => sum + (m.pendingQuantity || 0), 0) || 0;

        return (
            <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Purchase Request Details</h3>

                <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                            Request Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Request Number:</span>
                                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                                    {selectedRequest.requestNumber}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Request Date:</span>
                                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                                    {new Date(selectedRequest.requestDate).toLocaleDateString('en-LK')}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                                <span className="ml-2">
                                    {columns.find((c) => c.key === 'status')?.render?.(selectedRequest.status, selectedRequest) || selectedRequest.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                            Customer Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Customer Name:</span>
                                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                                    {selectedRequest.customerName}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Customer Type:</span>
                                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                                    {selectedRequest.customerType}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                            Machine Details
                        </h4>
                        <div className="space-y-3">
                            {selectedRequest.machines?.map((machine, index) => {
                                const available = Math.min(machine.availableStock, machine.quantity - (machine.rentedQuantity || 0));
                                const rented = machine.rentedQuantity || 0;
                                const pending = machine.pendingQuantity || 0;

                                return (
                                    <div key={machine.id} className="border border-gray-200 dark:border-slate-600 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                {machine.brand} {machine.model} ({machine.type})
                                            </span>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                Rs. {machine.unitPrice.toLocaleString('en-LK')} per unit
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Requested:</span>
                                                <span className="ml-2 font-medium text-gray-900 dark:text-white">{machine.quantity}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-500 dark:text-gray-400">Available Stock:</span>
                                                <span className="ml-2 font-medium text-gray-900 dark:text-white">{machine.availableStock}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mr-1" />
                                                <span className="text-gray-500 dark:text-gray-400">Rented:</span>
                                                <span className="ml-2 font-medium text-green-600 dark:text-green-400">{rented}</span>
                                            </div>
                                            {pending > 0 && (
                                                <div className="flex items-center">
                                                    <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-1" />
                                                    <span className="text-gray-500 dark:text-gray-400">Pending:</span>
                                                    <span className="ml-2 font-medium text-yellow-600 dark:text-yellow-400">{pending}</span>
                                                </div>
                                            )}
                                        </div>
                                        {available > 0 && rented < machine.quantity && (
                                            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                                                {available} machine(s) available for rental
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                            Request Summary
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Total Requested:</span>
                                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                                    {selectedRequest.requestedMachines} machines
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Total Rented:</span>
                                <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                                    {totalRented} machines
                                </span>
                            </div>
                            {totalPending > 0 && (
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Total Pending:</span>
                                    <span className="ml-2 text-yellow-600 dark:text-yellow-400 font-medium">
                                        {totalPending} machines
                                    </span>
                                </div>
                            )}
                            <div>
                                <span className="text-gray-500 dark:text-gray-400">Total Amount:</span>
                                <span className="ml-2 text-gray-900 dark:text-white font-medium text-lg">
                                    Rs. {selectedRequest.totalAmount.toLocaleString('en-LK', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {selectedRequest.rentalAgreementIds && selectedRequest.rentalAgreementIds.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">
                                Associated Rental Agreements
                            </h4>
                            <div className="text-sm text-blue-600 dark:text-blue-400">
                                {selectedRequest.rentalAgreementIds.map((id, idx) => (
                                    <span key={id}>
                                        RA-2024-{String(id).padStart(3, '0')}
                                        {idx < selectedRequest.rentalAgreementIds!.length - 1 && ', '}
                                    </span>
                                ))}
                            </div>
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
            <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
                }`}>
                <div className="max-w-7xl mx-auto space-y-4">
                    {/* Page header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                Purchase Orders
                            </h2>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                Manage purchase requests from customers for sewing machines and related tools. Create rental agreements for available machines.
                            </p>
                        </div>
                    </div>

                    {/* Purchase Request table card */}
                    <Table
                        data={mockPurchaseRequests}
                        columns={columns}
                        actions={actions}
                        itemsPerPage={10}
                        searchable
                        filterable
                        onCreateClick={handleCreatePurchaseRequest}
                        createButtonLabel="Create Purchase Request"
                        emptyMessage="No purchase requests found."
                    />
                </div>
            </main>

            {/* View Purchase Request Modal */}
            {isViewModalOpen && selectedRequest && (
                <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    Purchase Request Details
                                </h2>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    {selectedRequest.requestNumber}
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                {(selectedRequest.status === 'Pending' || selectedRequest.status === 'Approved' || selectedRequest.status === 'Partially Fulfilled') &&
                                    availableMachinesForRental.length > 0 && (
                                        <Tooltip content="Create Rental Agreement">
                                            <button
                                                onClick={() => handleCreateRentalAgreement(selectedRequest)}
                                                className="px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 flex items-center space-x-2"
                                            >
                                                <FileText className="w-4 h-4" />
                                                <span>Create Rental</span>
                                            </button>
                                        </Tooltip>
                                    )}
                                <Tooltip content="Close">
                                    <button
                                        onClick={handleCloseViewModal}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {renderRequestDetails()}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Rental Agreement Modal */}
            {isRentalModalOpen && selectedRequest && (
                <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    Create Rental Agreement
                                </h2>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    From Purchase Request: {selectedRequest.requestNumber}
                                </p>
                            </div>
                            <Tooltip content="Close">
                                <button
                                    onClick={handleCloseRentalModal}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </Tooltip>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                {/* Customer Info */}
                                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Customer Information
                                    </h3>
                                    <p className="text-sm text-gray-900 dark:text-white">{selectedRequest.customerName}</p>
                                </div>

                                {/* Rental Period */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Rental Period
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Start Date <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={rentalStartDate}
                                                onChange={(e) => setRentalStartDate(e.target.value)}
                                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${rentalFormErrors.rentalStartDate
                                                        ? 'border-red-500'
                                                        : 'border-gray-300 dark:border-slate-600'
                                                    } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                                            />
                                            {rentalFormErrors.rentalStartDate && (
                                                <p className="mt-1 text-sm text-red-500">{rentalFormErrors.rentalStartDate}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                End Date <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={rentalEndDate}
                                                onChange={(e) => setRentalEndDate(e.target.value)}
                                                min={rentalStartDate}
                                                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${rentalFormErrors.rentalEndDate
                                                        ? 'border-red-500'
                                                        : 'border-gray-300 dark:border-slate-600'
                                                    } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                                            />
                                            {rentalFormErrors.rentalEndDate && (
                                                <p className="mt-1 text-sm text-red-500">{rentalFormErrors.rentalEndDate}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Available Machines Selection */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Select Machines to Rent
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Select the quantity of each available machine type to include in this rental agreement.
                                    </p>

                                    {availableMachinesForRental.length === 0 ? (
                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                                No machines available for rental from this purchase request.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {availableMachinesForRental.map((machine) => (
                                                <div
                                                    key={machine.id}
                                                    className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600"
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div>
                                                            <h4 className="font-medium text-gray-900 dark:text-white">
                                                                {machine.brand} {machine.model} ({machine.type})
                                                            </h4>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                Unit Price: Rs. {machine.unitPrice.toLocaleString('en-LK')}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                Available: <span className="font-medium text-green-600 dark:text-green-400">{machine.canRent}</span>
                                                            </p>
                                                            {machine.stillPending > 0 && (
                                                                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                                                    {machine.stillPending} pending
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-4">
                                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                            Quantity to Rent:
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={machine.canRent}
                                                            value={selectedMachinesForRental[machine.id] || 0}
                                                            onChange={(e) => {
                                                                const qty = Math.max(0, Math.min(parseInt(e.target.value) || 0, machine.canRent));
                                                                setSelectedMachinesForRental({
                                                                    ...selectedMachinesForRental,
                                                                    [machine.id]: qty,
                                                                });
                                                            }}
                                                            className="w-24 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                                                        />
                                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                                            of {machine.canRent} available
                                                        </span>
                                                    </div>
                                                    {selectedMachinesForRental[machine.id] > 0 && (
                                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                            Subtotal: Rs. {(machine.unitPrice * (selectedMachinesForRental[machine.id] || 0)).toLocaleString('en-LK')}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {rentalFormErrors.machines && (
                                        <p className="text-sm text-red-500">{rentalFormErrors.machines}</p>
                                    )}
                                </div>

                                {/* Rental Summary */}
                                {Object.values(selectedMachinesForRental).some(qty => qty > 0) && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                            Rental Summary
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            {availableMachinesForRental
                                                .filter(m => selectedMachinesForRental[m.id] > 0)
                                                .map((machine) => (
                                                    <div key={machine.id} className="flex justify-between">
                                                        <span className="text-gray-600 dark:text-gray-400">
                                                            {machine.brand} {machine.model} × {selectedMachinesForRental[machine.id]}
                                                        </span>
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            Rs. {(machine.unitPrice * selectedMachinesForRental[machine.id]).toLocaleString('en-LK')}
                                                        </span>
                                                    </div>
                                                ))}
                                            <div className="border-t border-blue-200 dark:border-blue-800 pt-2 mt-2 flex justify-between">
                                                <span className="font-semibold text-gray-900 dark:text-white">Total Monthly Rent:</span>
                                                <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                                                    Rs. {availableMachinesForRental
                                                        .reduce((sum, m) => sum + (m.unitPrice * (selectedMachinesForRental[m.id] || 0)), 0)
                                                        .toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-slate-700">
                            <Tooltip content="Cancel">
                                <button
                                    type="button"
                                    onClick={handleCloseRentalModal}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                            </Tooltip>
                            <Tooltip content="Create Rental Agreement">
                                <button
                                    type="button"
                                    onClick={handleSubmitRentalAgreement}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Rental Agreement'}
                                </button>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrderPage;