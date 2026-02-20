'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import CreateForm, { FormField, CreateFormRef } from '@/src/components/form-popup/create';
import { LetterheadDocument } from '@/src/components/letterhead/letterhead-document';
import { X, Plus, Trash2, ChevronDown, ChevronRight, Check, Package, AlertTriangle, ExternalLink } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import { validateVATTIN, validateNICNumber, validateEmail, validatePhoneNumber } from '@/src/utils/validation';
import { authFetch } from '@/lib/auth-client';

const API_BASE_URL = '/api/v1';

interface CustomerLocationOption {
    id: string;
    name: string;
    addressLine1?: string | null;
}
interface ApiCustomer {
    id: string;
    code: string;
    type: string;
    name: string;
    contactPerson?: string;
    phones?: string[];
    emails?: string[];
    status?: string;
    locations?: CustomerLocationOption[];
}

type CustomerType = 'Company' | 'Individual';

interface MachineRequestItem {
    id: string;
    brand: string;
    model: string;
    type: string;
    quantity: number;
    availableStock: number;
    unitPrice: number;
    totalPrice: number;
    monthlyRentalFee: number;
}

interface SearchableSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    className?: string;
}

// Outstanding Alert interfaces and mock data
type AlertType = 'Payment Overdue' | 'High Balance' | 'Credit Limit Exceeded' | 'Agreement Expiring';
type AlertSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
type AlertStatus = 'Active' | 'Resolved';

interface OutstandingAlert {
    id: number;
    customerId: number;
    customerName: string;
    customerType: 'Company' | 'Individual';
    alertType: AlertType;
    description: string;
    amount: number;
    dueDate: string;
    severity: AlertSeverity;
    status: AlertStatus;
    createdAt: string;
    resolvedAt?: string;
    relatedAgreement?: string;
    relatedMachine?: string;
    daysOverdue?: number;
}

// Helper function to map internal customer type to display label
const getCustomerTypeLabel = (type: CustomerType): string => {
    return type === 'Company' ? 'Business' : 'Customer';
};

// Mock outstanding alerts data
const mockOutstandingAlerts: OutstandingAlert[] = [
    {
        id: 1,
        customerId: 1,
        customerName: 'ABC Holdings (Pvt) Ltd',
        customerType: 'Company',
        alertType: 'Payment Overdue',
        description: 'Monthly payment for Bulldozer CAT D6 is overdue by 15 days',
        amount: 50000,
        dueDate: '2024-04-01',
        severity: 'High',
        status: 'Active',
        createdAt: '2024-04-16',
        relatedAgreement: 'AGR-2024-002',
        relatedMachine: 'Bulldozer CAT D6',
        daysOverdue: 15,
    },
    {
        id: 2,
        customerId: 1,
        customerName: 'ABC Holdings (Pvt) Ltd',
        customerType: 'Company',
        alertType: 'High Balance',
        description: 'Total outstanding balance exceeds warning threshold',
        amount: 120000.5,
        dueDate: '2024-04-15',
        severity: 'Medium',
        status: 'Active',
        createdAt: '2024-04-10',
    },
    {
        id: 3,
        customerId: 1,
        customerName: 'ABC Holdings (Pvt) Ltd',
        customerType: 'Company',
        alertType: 'Agreement Expiring',
        description: 'Agreement AGR-2024-001 will expire in 30 days',
        amount: 0,
        dueDate: '2024-07-15',
        severity: 'Low',
        status: 'Active',
        createdAt: '2024-04-15',
        relatedAgreement: 'AGR-2024-001',
    },
    {
        id: 4,
        customerId: 4,
        customerName: 'Kamal Silva',
        customerType: 'Individual',
        alertType: 'Credit Limit Exceeded',
        description: 'Customer has exceeded their credit limit of Rs. 50,000',
        amount: 78000,
        dueDate: '2024-04-20',
        severity: 'Critical',
        status: 'Active',
        createdAt: '2024-04-18',
    },
    {
        id: 5,
        customerId: 5,
        customerName: 'Mega Constructions',
        customerType: 'Company',
        alertType: 'Payment Overdue',
        description: 'Monthly payment for Excavator CAT 320 is overdue by 8 days',
        amount: 75000,
        dueDate: '2024-04-08',
        severity: 'Medium',
        status: 'Active',
        createdAt: '2024-04-16',
        relatedAgreement: 'AGR-2024-003',
        relatedMachine: 'Excavator CAT 320',
        daysOverdue: 8,
    },
    {
        id: 6,
        customerId: 2,
        customerName: 'John Perera',
        customerType: 'Individual',
        alertType: 'Payment Overdue',
        description: 'Monthly payment for Loader CAT 950 is overdue by 3 days',
        amount: 15000,
        dueDate: '2024-04-13',
        severity: 'Low',
        status: 'Active',
        createdAt: '2024-04-16',
        relatedAgreement: 'AGR-2024-004',
        relatedMachine: 'Loader CAT 950',
        daysOverdue: 3,
    },
    {
        id: 7,
        customerId: 5,
        customerName: 'Mega Constructions',
        customerType: 'Company',
        alertType: 'High Balance',
        description: 'Total outstanding balance exceeds warning threshold',
        amount: 245000.75,
        dueDate: '2024-04-25',
        severity: 'High',
        status: 'Active',
        createdAt: '2024-04-20',
    },
    {
        id: 8,
        customerId: 3,
        customerName: 'XYZ Engineering',
        customerType: 'Company',
        alertType: 'Agreement Expiring',
        description: 'Agreement AGR-2023-045 will expire in 45 days',
        amount: 0,
        dueDate: '2024-06-01',
        severity: 'Low',
        status: 'Resolved',
        createdAt: '2024-04-15',
        resolvedAt: '2024-04-20',
        relatedAgreement: 'AGR-2023-045',
    },
];

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    disabled = false,
    error,
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const term = searchTerm.toLowerCase();
        return options.filter(opt =>
            opt.label.toLowerCase().includes(term)
        );
    }, [options, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(0);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && dropdownRef.current && highlightedIndex >= 0) {
            const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen]);

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
                if (filteredOptions[highlightedIndex]) {
                    handleSelect(filteredOptions[highlightedIndex].value);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
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
                    error
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-slate-600'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-500 dark:hover:border-indigo-500'} focus-within:ring-2 focus-within:ring-blue-500 dark:focus-within:ring-indigo-500 transition-colors`}
            >
                {isOpen ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setHighlightedIndex(0);
                        }}
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
                <ChevronDown
                    className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                />
            </div>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-auto"
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => (
                            <div
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                                className={`px-3 py-2 cursor-pointer flex items-center justify-between ${
                                    index === highlightedIndex
                                        ? 'bg-blue-50 dark:bg-indigo-900/30'
                                        : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                                } ${
                                    option.value === value
                                        ? 'bg-blue-100 dark:bg-indigo-900/50'
                                        : ''
                                }`}
                            >
                                <span className="text-gray-900 dark:text-white">{option.label}</span>
                                {option.value === value && (
                                    <Check className="w-4 h-4 text-blue-600 dark:text-indigo-400" />
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
                            No options found
                        </div>
                    )}
                </div>
            )}

            {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
        </div>
    );
};

// Mock customer data
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

// API types for brands, models, machine types (master data)
interface ApiBrand {
    id: string;
    name: string;
    code?: string;
}
interface ApiModel {
    id: string;
    name: string;
    brandId: string;
    brand?: { id: string; name: string };
}
interface ApiMachineType {
    id: string;
    name: string;
    code?: string;
}

// Mock inventory data
const mockInventory = [
    {
        id: 1,
        brand: 'Brother',
        model: 'XL2600i',
        type: 'Domestic',
        totalStock: 25,
        availableStock: 20,
        rentedStock: 3,
        maintenanceStock: 2,
        retiredStock: 0,
    },
    {
        id: 2,
        brand: 'Singer',
        model: 'Heavy Duty 4423',
        type: 'Industrial',
        totalStock: 15,
        availableStock: 8,
        rentedStock: 6,
        maintenanceStock: 1,
        retiredStock: 0,
    },
    {
        id: 3,
        brand: 'Janome',
        model: 'HD3000',
        type: 'Domestic',
        totalStock: 12,
        availableStock: 10,
        rentedStock: 2,
        maintenanceStock: 0,
        retiredStock: 0,
    },
    {
        id: 4,
        brand: 'Brother',
        model: 'SE600',
        type: 'Embroidery',
        totalStock: 8,
        availableStock: 5,
        rentedStock: 2,
        maintenanceStock: 1,
        retiredStock: 0,
    },
    {
        id: 5,
        brand: 'Juki',
        model: 'MO-654DE',
        type: 'Overlock',
        totalStock: 10,
        availableStock: 7,
        rentedStock: 2,
        maintenanceStock: 1,
        retiredStock: 0,
    },
];

// Mock machine brands and models
const mockMachineBrands = ['Brother', 'Singer', 'Janome', 'Juki', 'Pfaff', 'Bernina'];
const mockMachineModels = [
    { brand: 'Brother', models: ['XL2600i', 'SE600', 'CS6000i'] },
    { brand: 'Singer', models: ['Heavy Duty 4423', 'Buttonhole 160'] },
    { brand: 'Janome', models: ['HD3000', 'MB-4S'] },
    { brand: 'Juki', models: ['MO-654DE'] },
];
const mockMachineTypes = ['Industrial', 'Domestic', 'Embroidery', 'Overlock', 'Buttonhole', 'Other'];

const CreatePurchaseRequestPage: React.FC = () => {
    const router = useRouter();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

    // Create form state
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedCustomerLocationId, setSelectedCustomerLocationId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isOpenEnded, setIsOpenEnded] = useState(false);
    const [activeCreateTab, setActiveCreateTab] = useState<'company' | 'individual'>('company');
    const [createLocations, setCreateLocations] = useState<{ name: string; address?: string }[]>([{ name: '', address: '' }]);
    const createFormRef = useRef<CreateFormRef>(null);
    const [machines, setMachines] = useState<MachineRequestItem[]>([
        { id: '1', brand: '', model: '', type: '', quantity: 1, availableStock: 0, unitPrice: 0, totalPrice: 0, monthlyRentalFee: 0 },
    ]);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    // API data: registered customers, inventory, and master data (brands, models, machine types)
    const [customers, setCustomers] = useState<ApiCustomer[]>([]);
    const [customersLoading, setCustomersLoading] = useState(true);
    const [inventoryByBrandModelType, setInventoryByBrandModelType] = useState<Record<string, number>>({});
    const [brandModelTypeList, setBrandModelTypeList] = useState<{ brand: string; model: string; type: string }[]>([]);
    const [apiBrands, setApiBrands] = useState<ApiBrand[]>([]);
    const [apiModels, setApiModels] = useState<ApiModel[]>([]);
    const [apiMachineTypes, setApiMachineTypes] = useState<ApiMachineType[]>([]);
    const [masterDataLoading, setMasterDataLoading] = useState(true);

    const fetchCustomers = useCallback(async () => {
        setCustomersLoading(true);
        try {
            const params = new URLSearchParams({ page: '1', limit: '500', status: 'ACTIVE' });
            const response = await authFetch(`${API_BASE_URL}/customers?${params.toString()}`, {
                method: 'GET',
                credentials: 'include',
            });
            const json = await response.json();
            if (response.ok && Array.isArray(json?.data?.items)) {
                setCustomers(json.data.items);
            } else {
                setCustomers([]);
            }
        } catch {
            setCustomers([]);
        } finally {
            setCustomersLoading(false);
        }
    }, []);

    // Fetch inventory from same API as inventory page: availableStock per brand+model+type (source of truth)
    const fetchInventory = useCallback(async () => {
        try {
            const params = new URLSearchParams({ page: '1', limit: '2000' });
            const response = await authFetch(`${API_BASE_URL}/inventory?${params.toString()}`, {
                method: 'GET',
                credentials: 'include',
            });
            const json = await response.json();
            const rawItems = json?.data?.items;
            const list = Array.isArray(rawItems?.inventory) ? rawItems.inventory : Array.isArray(rawItems) ? rawItems : [];
            const countByKey: Record<string, number> = {};
            const listWithType: { brand: string; model: string; type: string }[] = [];
            list.forEach((item: { brand?: string; model?: string; type?: string; availableStock?: number }) => {
                const brand = (item.brand || '').trim();
                const model = (item.model || '').trim();
                const type = (item.type || 'Other').trim();
                const availableStock = typeof item.availableStock === 'number' ? item.availableStock : 0;
                if (brand && model) {
                    const key = `${brand}|${model}|${type}`;
                    countByKey[key] = availableStock;
                    listWithType.push({ brand, model, type });
                }
            });
            setInventoryByBrandModelType(countByKey);
            setBrandModelTypeList(listWithType);
        } catch {
            setInventoryByBrandModelType({});
            setBrandModelTypeList([]);
        }
    }, []);

    // Fetch master data: brands, models, machine types (so user can select any brand/model/type, not only from inventory)
    const fetchMasterData = useCallback(async () => {
        setMasterDataLoading(true);
        try {
            const [brandsRes, modelsRes, typesRes] = await Promise.all([
                authFetch(`${API_BASE_URL}/brands?page=1&limit=200`, { credentials: 'include' }),
                authFetch(`${API_BASE_URL}/models?page=1&limit=500`, { credentials: 'include' }),
                authFetch(`${API_BASE_URL}/machine-types?page=1&limit=200`, { credentials: 'include' }),
            ]);
            const brandsJson = await brandsRes.json();
            const modelsJson = await modelsRes.json();
            const typesJson = await typesRes.json();
            const brandsList = brandsJson?.data?.items ?? [];
            const modelsList = modelsJson?.data?.items ?? [];
            const typesList = typesJson?.data?.items ?? [];
            setApiBrands(Array.isArray(brandsList) ? brandsList : []);
            setApiModels(Array.isArray(modelsList) ? modelsList : []);
            setApiMachineTypes(Array.isArray(typesList) ? typesList : []);
        } catch {
            setApiBrands([]);
            setApiModels([]);
            setApiMachineTypes([]);
        } finally {
            setMasterDataLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
        fetchInventory();
        fetchMasterData();
    }, [fetchCustomers, fetchInventory, fetchMasterData]);

    // Get outstanding alerts for selected customer (mock data; when using API customers, match by id string or skip)
    const customerOutstandingAlerts = useMemo(() => {
        if (!selectedCustomerId) return [];
        return mockOutstandingAlerts.filter(
            alert => String(alert.customerId) === String(selectedCustomerId) && alert.status === 'Active'
        );
    }, [selectedCustomerId]);

    // Get highest severity from alerts
    const highestSeverity = useMemo(() => {
        if (customerOutstandingAlerts.length === 0) return null;
        const severityOrder: AlertSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
        return customerOutstandingAlerts.reduce((highest, alert) => {
            const currentIndex = severityOrder.indexOf(alert.severity);
            const highestIndex = severityOrder.indexOf(highest);
            return currentIndex < highestIndex ? alert.severity : highest;
        }, customerOutstandingAlerts[0].severity);
    }, [customerOutstandingAlerts]);

    // Get available models based on selected brand (prefer master data API, then inventory list, then mock)
    const getAvailableModels = (brand: string) => {
        if (apiModels.length > 0 && brand) {
            const brandObj = apiBrands.find((b) => b.name === brand);
            const forBrand = brandObj
                ? apiModels.filter((m) => m.brandId === brandObj.id)
                : apiModels.filter((m) => (m.brand as { name?: string })?.name === brand);
            const names = [...new Set(forBrand.map((m) => m.name))].filter(Boolean).sort();
            if (names.length > 0) return names;
        }
        if (brandModelTypeList.length > 0) {
            const models = brandModelTypeList.filter((m) => m.brand === brand).map((m) => m.model);
            return [...new Set(models)].sort();
        }
        const brandData = mockMachineModels.find((m) => m.brand === brand);
        return brandData?.models || [];
    };

    // Get available types: prefer all machine types from API so user can select any type; else inventory types for brand+model, then mock
    const getAvailableTypes = (_brand: string, _model: string): string[] => {
        if (apiMachineTypes.length > 0) {
            return apiMachineTypes.map((t) => t.name).filter(Boolean).sort();
        }
        if (brandModelTypeList.length > 0) {
            const types = brandModelTypeList
                .filter((m) => m.brand === _brand && m.model === _model)
                .map((m) => m.type);
            return [...new Set(types)].length > 0 ? [...new Set(types)].sort() : mockMachineTypes;
        }
        return mockMachineTypes;
    };

    // Get available stock for brand+model+type (matches inventory page grain; fallback to mock by brand+model sum)
    const getAvailableStock = (brand: string, model: string, type: string): number => {
        if (Object.keys(inventoryByBrandModelType).length > 0) {
            const key = `${brand}|${model}|${type}`;
            return inventoryByBrandModelType[key] ?? 0;
        }
        const inventoryItem = mockInventory.find(
            (item) => item.brand === brand && item.model === model
        );
        return inventoryItem?.availableStock || 0;
    };

    // Get unique brands (prefer master data API, then inventory-derived list, then mock)
    const getAvailableBrands = () => {
        if (apiBrands.length > 0) {
            return apiBrands.map((b) => b.name).filter(Boolean).sort();
        }
        if (brandModelTypeList.length > 0) {
            const brands = [...new Set(brandModelTypeList.map((m) => m.brand))].filter(Boolean).sort();
            return brands;
        }
        const allBrands = new Set<string>();
        mockInventory.forEach((item) => allBrands.add(item.brand));
        mockMachineBrands.forEach((b) => allBrands.add(b));
        return Array.from(allBrands).sort();
    };

    // Prepare customer options: registered customers from API (fallback to mock when API returns empty)
    const customerOptions = useMemo(() => {
        if (customers.length > 0) {
            return customers
                .filter((c) => c.status !== 'INACTIVE')
                .map((customer) => ({
                    value: customer.id,
                    label: `${customer.name} (${customer.type === 'GARMENT_FACTORY' ? 'Business' : 'Customer'})`,
                }));
        }
        return mockCustomers
            .filter((c) => c.status === 'Active')
            .map((customer) => ({
                value: customer.id.toString(),
                label: `${customer.name} (${getCustomerTypeLabel(customer.type)})`,
            }));
    }, [customers]);

    // Location options for selected customer (from API response which includes locations)
    const locationOptions = useMemo(() => {
        if (!selectedCustomerId) return [];
        const customer = customers.find((c) => c.id === selectedCustomerId);
        const locs = customer?.locations ?? [];
        return locs.map((loc) => ({ value: loc.id, label: loc.name || loc.id }));
    }, [selectedCustomerId, customers]);

    // Prepare brand options (from inventory API when loaded)
    const brandOptions = useMemo(() => {
        return getAvailableBrands().map((brand) => ({
            value: brand,
            label: brand,
        }));
    }, [brandModelTypeList, apiBrands]);

    // Prepare model options for each machine
    const getModelOptions = (brand: string) => {
        return getAvailableModels(brand).map((model) => ({
            value: model,
            label: model,
        }));
    };

    // Type options are per brand+model (only types with stock for that combination)
    const getTypeOptions = (brand: string, model: string) => {
        return getAvailableTypes(brand, model).map((type) => ({
            value: type,
            label: type,
        }));
    };

    // Calculate pricing from monthly rental fee × quantity per line (read-only summary; row totals updated in handleMachineChange)
    const pricing = useMemo(() => {
        return machines.reduce((sum, m) => {
            const fee = Number(m.monthlyRentalFee) || 0;
            const qty = Math.max(0, Number(m.quantity) || 0);
            return sum + fee * qty;
        }, 0);
    }, [machines]);

    const handleMenuClick = () => {
        setIsMobileSidebarOpen((prev) => !prev);
    };

    const handleMobileSidebarClose = () => {
        setIsMobileSidebarOpen(false);
    };

    const handleLogout = () => {
        console.log('Logout clicked');
    };

    const handleOpenRegisterModal = () => {
        setIsRegisterModalOpen(true);
        setActiveCreateTab('company');
    };

    const handleCloseRegisterModal = () => {
        setIsRegisterModalOpen(false);
        setActiveCreateTab('company');
        setCreateLocations([{ name: '', address: '' }]);
    };

    const parseAddress = (address: string) => {
        const parts = (address || '').split(',').map((p: string) => p.trim());
        return {
            line1: parts[0] || '',
            line2: parts[1] || '',
            city: parts[2] || '',
            region: parts[3] || '',
            postalCode: parts[4] || '',
            country: parts[5] || 'Sri Lanka',
        };
    };

    const buildLocationsPayload = (items: { name: string; address?: string }[]) => {
        return items
            .filter((loc) => (loc.name || '').trim())
            .map((loc, index) => {
                const parsed = parseAddress(loc.address || '');
                return {
                    name: (loc.name || '').trim(),
                    addressLine1: parsed.line1 || undefined,
                    addressLine2: parsed.line2 || undefined,
                    city: parsed.city || undefined,
                    region: parsed.region || undefined,
                    postalCode: parsed.postalCode || undefined,
                    country: parsed.country || undefined,
                    isDefault: index === 0,
                };
            });
    };

    const generateCustomerCode = async (): Promise<string> => {
        const prefix = 'CUST';
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}-${timestamp}${random}`;
    };

    const addCreateLocation = () => setCreateLocations((prev) => [...prev, { name: '', address: '' }]);
    const removeCreateLocation = (index: number) => {
        if (createLocations.length <= 1) return;
        setCreateLocations((prev) => prev.filter((_, i) => i !== index));
    };
    const updateCreateLocation = (index: number, field: 'name' | 'address', value: string) => {
        setCreateLocations((prev) => prev.map((loc, i) => (i === index ? { ...loc, [field]: value } : loc)));
    };

    const handleAddMachine = () => {
        setMachines([
            ...machines,
            { id: Date.now().toString(), brand: '', model: '', type: '', quantity: 1, availableStock: 0, unitPrice: 0, totalPrice: 0, monthlyRentalFee: 0 },
        ]);
    };

    const handleRemoveMachine = (id: string) => {
        if (machines.length > 1) {
            setMachines(machines.filter((m) => m.id !== id));
        }
    };

    const handleMachineChange = (id: string, field: keyof MachineRequestItem, value: any) => {
        setMachines(
            machines.map((m) => {
                if (m.id !== id) return m;
                const updated = { ...m, [field]: value };
                // Reset model and type when brand changes
                if (field === 'brand') {
                    updated.model = '';
                    updated.type = '';
                    updated.availableStock = 0;
                }
                // Reset type when model changes
                if (field === 'model') {
                    updated.type = '';
                    updated.availableStock = 0;
                }
                // Update available stock when type is selected (brand+model+type = inventory grain)
                if (field === 'type' && updated.brand && updated.model) {
                    updated.availableStock = getAvailableStock(updated.brand, updated.model, value);
                }
                // Derive unitPrice/totalPrice from monthlyRentalFee and quantity
                const fee = Number(updated.monthlyRentalFee) || 0;
                const qty = Math.max(0, Number(updated.quantity) || 1);
                updated.unitPrice = fee;
                updated.totalPrice = fee * qty;
                return updated;
            })
        );
    };

    const validateForm = (): boolean => {
        const errors: Record<string, string> = {};

        if (!selectedCustomerId) errors.selectedCustomerId = 'Customer is required';
        if (!startDate.trim()) errors.startDate = 'Start date is required';
        if (!isOpenEnded && !endDate.trim()) errors.endDate = 'End date is required (or check Open-ended)';
        if (startDate && endDate && !isOpenEnded && endDate < startDate) {
            errors.endDate = 'End date must be on or after start date';
        }

        machines.forEach((machine, index) => {
            if (!machine.brand) errors[`machine_brand_${index}`] = 'Brand is required';
            if (!machine.model) errors[`machine_model_${index}`] = 'Model is required';
            if (!machine.type) errors[`machine_type_${index}`] = 'Type is required';
            if (machine.quantity < 1) errors[`machine_quantity_${index}`] = 'Quantity must be at least 1';
            if (typeof machine.monthlyRentalFee !== 'number' && isNaN(Number(machine.monthlyRentalFee))) {
                errors[`machine_monthlyRentalFee_${index}`] = 'Monthly rental fee must be a number';
            }
            if (Number(machine.monthlyRentalFee) < 0) {
                errors[`machine_monthlyRentalFee_${index}`] = 'Monthly rental fee cannot be negative';
            }
        });

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmitPurchaseRequest = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            const selectedCustomerApi = customers.find((c) => c.id === selectedCustomerId);
            const selectedCustomerMock = mockCustomers.find((c) => c.id.toString() === selectedCustomerId);
            const customerName = selectedCustomerApi?.name ?? selectedCustomerMock?.name ?? '';

            const machinesWithStatus = machines.map((machine) => {
                const available = Math.min(machine.availableStock, machine.quantity);
                const pending = machine.quantity - available;
                const fee = Number(machine.monthlyRentalFee) || 0;
                const qty = Math.max(0, Number(machine.quantity) || 1);
                return {
                    id: machine.id,
                    brand: machine.brand,
                    model: machine.model,
                    type: machine.type,
                    quantity: machine.quantity,
                    availableStock: machine.availableStock ?? 0,
                    unitPrice: fee,
                    totalPrice: fee * qty,
                    monthlyRentalFee: fee,
                    rentedQuantity: 0,
                    pendingQuantity: pending,
                };
            });

            const payload = {
                customerId: selectedCustomerId,
                customerName,
                requestDate: new Date().toISOString().split('T')[0],
                startDate: startDate || undefined,
                endDate: isOpenEnded ? undefined : (endDate || undefined),
                customerLocationId: selectedCustomerLocationId || undefined,
                machines: machinesWithStatus,
                totalAmount: pricing,
            };

            const response = await authFetch('/api/v1/purchase-orders', {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const json = await response.json();

            if (!response.ok) {
                const msg = json?.message || (json?.data ? Object.values(json.data).flat().join(' ') : '') || 'Failed to create purchase order';
                throw new Error(msg);
            }
            alert('Purchase order created successfully.');
            router.push('/purchase-order');
        } catch (error: any) {
            console.error('Error creating purchase request:', error);
            alert(error?.message || 'Failed to create purchase request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Form fields for Business (aligned with customers page)
    const companyFields: FormField[] = [
        {
            name: 'companyName',
            label: 'Business Name',
            type: 'text',
            placeholder: 'Enter business name',
            required: true,
        },
        {
            name: 'vatTin',
            label: 'VAT / TIN Number',
            type: 'text',
            placeholder: 'Enter VAT or TIN number',
            required: false,
            validation: validateVATTIN,
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
            validation: validatePhoneNumber,
        },
        {
            name: 'email',
            label: 'Email',
            type: 'email',
            placeholder: 'Enter contact email',
            required: true,
            validation: validateEmail,
        },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            placeholder: 'Select status',
            required: true,
            options: [
                { label: 'Active', value: 'Active' },
                { label: 'Inactive', value: 'Inactive' },
            ],
        },
    ];

    // Form fields for Customer (aligned with customers page)
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
            required: false,
            validation: validateNICNumber,
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
            validation: validatePhoneNumber,
        },
        {
            name: 'email',
            label: 'Email',
            type: 'email',
            placeholder: 'Enter email address',
            required: true,
            validation: validateEmail,
        },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            placeholder: 'Select status',
            required: true,
            options: [
                { label: 'Active', value: 'Active' },
                { label: 'Inactive', value: 'Inactive' },
            ],
        },
    ];

    const handleCompanySubmit = async (data: Record<string, any>) => {
        setIsSubmitting(true);
        try {
            const addressParts = parseAddress(data.businessAddress || '');
            const code = await generateCustomerCode();
            const statusApi = (data.status === 'Active' ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE';
            const payload = {
                code,
                type: 'GARMENT_FACTORY',
                name: data.companyName || '',
                contactPerson: data.contactPerson || '',
                phones: [data.phone].filter(Boolean),
                emails: [data.email].filter(Boolean),
                billingAddressLine1: addressParts.line1 || undefined,
                billingAddressLine2: addressParts.line2 || undefined,
                billingCity: addressParts.city || undefined,
                billingRegion: addressParts.region || undefined,
                billingPostalCode: addressParts.postalCode || undefined,
                billingCountry: addressParts.country || undefined,
                vatRegistrationNumber: data.vatTin || null,
                status: statusApi,
                locations: buildLocationsPayload(createLocations),
            };
            const response = await authFetch(`${API_BASE_URL}/customers`, {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const json = await response.json();
            if (!response.ok) {
                const msg = json?.message || (json?.data ? Object.values(json.data).flat().join(' ') : '') || 'Failed to register customer';
                throw new Error(msg);
            }
            const newCustomer = json?.data;
            if (newCustomer?.id) {
                await fetchCustomers();
                setSelectedCustomerId(newCustomer.id);
            }
            alert(`Business "${data.companyName}" registered successfully. Please confirm the customer is selected.`);
            handleCloseRegisterModal();
        } catch (err: any) {
            alert(err?.message || 'Failed to register business. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleIndividualSubmit = async (data: Record<string, any>) => {
        setIsSubmitting(true);
        try {
            const addressParts = parseAddress(data.address || '');
            const code = await generateCustomerCode();
            const statusApi = (data.status === 'Active' ? 'ACTIVE' : 'INACTIVE') as 'ACTIVE' | 'INACTIVE';
            const payload = {
                code,
                type: 'INDIVIDUAL',
                name: data.fullName || '',
                contactPerson: data.fullName || '',
                phones: [data.phone].filter(Boolean),
                emails: [data.email].filter(Boolean),
                billingAddressLine1: addressParts.line1 || undefined,
                billingAddressLine2: addressParts.line2 || undefined,
                billingCity: addressParts.city || undefined,
                billingRegion: addressParts.region || undefined,
                billingPostalCode: addressParts.postalCode || undefined,
                billingCountry: addressParts.country || undefined,
                status: statusApi,
                locations: buildLocationsPayload(createLocations),
            };
            const response = await authFetch(`${API_BASE_URL}/customers`, {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            const json = await response.json();
            if (!response.ok) {
                const msg = json?.message || (json?.data ? Object.values(json.data).flat().join(' ') : '') || 'Failed to register customer';
                throw new Error(msg);
            }
            const newCustomer = json?.data;
            if (newCustomer?.id) {
                await fetchCustomers();
                setSelectedCustomerId(newCustomer.id);
            }
            alert(`Customer "${data.fullName}" registered successfully. Please confirm the customer is selected.`);
            handleCloseRegisterModal();
        } catch (err: any) {
            alert(err?.message || 'Failed to register customer. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClear = () => {
        console.log('Form cleared');
    };

    // Get severity styling
    const getSeverityStyles = (severity: AlertSeverity) => {
        const styles = {
            Critical: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
            High: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200',
            Medium: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
            Low: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
        };
        return styles[severity];
    };

    const getSeverityBadgeStyles = (severity: AlertSeverity) => {
        const styles = {
            Critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
            High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
            Medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
            Low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        };
        return styles[severity];
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
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Page header: back button top left (same as inventory/stock-in) */}
                    <div className="flex items-center gap-4">
                        <Tooltip content="Back to Purchase Orders">
                            <button
                                onClick={() => router.push('/purchase-order')}
                                className="flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors shrink-0"
                            >
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </button>
                        </Tooltip>
                        <div>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                Create Purchase Order
                            </h2>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                Create a new purchase order and select customer, dates, and machines.
                            </p>
                        </div>
                    </div>

                    {/* Form Card - Letterhead-style document (matches official PO / letterhead) */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden max-w-[210mm] mx-auto">
                        <LetterheadDocument documentTitle="PURCHASE ORDER" footerStyle="simple" className="p-6 sm:p-8">
                            <div className="min-h-[120mm] space-y-6 border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-lg p-6 bg-gray-50/50 dark:bg-slate-800/30">
                                {/* Customer Details Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Customer Details
                                        </h3>
                                        <Tooltip content="Register New Customer">
                                            <button
                                                type="button"
                                                onClick={handleOpenRegisterModal}
                                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 transition-colors"
                                            >
                                                Register New Customer
                                            </button>
                                        </Tooltip>
                                    </div>

                                {/* Customer Selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Customer <span className="text-red-500">*</span>
                                    </label>
                                    <SearchableSelect
                                        value={selectedCustomerId}
                                        onChange={(val) => {
                                            setSelectedCustomerId(val);
                                            setSelectedCustomerLocationId('');
                                        }}
                                        options={customerOptions}
                                        placeholder={customersLoading ? 'Loading customers...' : 'Select Customer'}
                                        disabled={customersLoading}
                                        error={formErrors.selectedCustomerId}
                                    />
                                </div>

                                {/* Customer Location (optional) */}
                                {selectedCustomerId && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Location (optional)
                                        </label>
                                        <SearchableSelect
                                            value={selectedCustomerLocationId}
                                            onChange={setSelectedCustomerLocationId}
                                            options={locationOptions}
                                            placeholder={locationOptions.length === 0 ? 'No locations defined' : 'Select location'}
                                            disabled={locationOptions.length === 0}
                                        />
                                    </div>
                                )}

                                {/* Renting period – Start Date & End Date (end date optional for open-ended) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Start Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.startDate ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'}`}
                                        />
                                        {formErrors.startDate && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                                {formErrors.startDate}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            End Date {!isOpenEnded && <span className="text-red-500">*</span>}
                                            {isOpenEnded && <span className="text-gray-500 dark:text-gray-400 font-normal">(Open-ended)</span>}
                                        </label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            min={startDate || undefined}
                                            disabled={isOpenEnded}
                                            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formErrors.endDate ? 'border-red-500' : 'border-gray-300 dark:border-slate-600'} ${isOpenEnded ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        />
                                        {formErrors.endDate && (
                                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                                {formErrors.endDate}
                                            </p>
                                        )}
                                        <label className="mt-2 flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isOpenEnded}
                                                onChange={(e) => {
                                                    setIsOpenEnded(e.target.checked);
                                                    if (e.target.checked) setEndDate('');
                                                }}
                                                className="w-4 h-4 rounded border-gray-300 dark:border-slate-500 text-blue-600 dark:text-indigo-500 focus:ring-blue-500 dark:focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">Open-ended (no end date)</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Outstanding Alerts Warning Banner */}
                                {selectedCustomerId && customerOutstandingAlerts.length > 0 && (
                                    <div className={`mt-4 p-4 rounded-lg border-2 ${getSeverityStyles(highestSeverity!)}`}>
                                        <div className="flex items-start space-x-3">
                                            <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                                                highestSeverity === 'Critical'
                                                    ? 'text-red-600 dark:text-red-400'
                                                    : highestSeverity === 'High'
                                                    ? 'text-orange-600 dark:text-orange-400'
                                                    : highestSeverity === 'Medium'
                                                    ? 'text-yellow-600 dark:text-yellow-400'
                                                    : 'text-blue-600 dark:text-blue-400'
                                            }`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="text-sm font-semibold">
                                                        Outstanding Alerts Detected
                                                    </h4>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSeverityBadgeStyles(highestSeverity!)}`}>
                                                        {highestSeverity} Severity
                                                    </span>
                                                </div>
                                                <p className="text-sm mb-3">
                                                    This customer has <span className="font-semibold">{customerOutstandingAlerts.length}</span> active outstanding alert{customerOutstandingAlerts.length > 1 ? 's' : ''}:
                                                </p>
                                                <div className="space-y-2">
                                                    {customerOutstandingAlerts.map((alert) => (
                                                        <div key={alert.id} className="bg-white/60 dark:bg-slate-800/60 rounded-md p-3 border border-gray-200 dark:border-slate-600">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center space-x-2 mb-1">
                                                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getSeverityBadgeStyles(alert.severity)}`}>
                                                                            {alert.severity}
                                                                        </span>
                                                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                                            {alert.alertType}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                                        {alert.description}
                                                                    </p>
                                                                    {alert.amount > 0 && (
                                                                        <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                                                            Amount: Rs. {alert.amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </p>
                                                                    )}
                                                                    {alert.daysOverdue !== undefined && (
                                                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                            Days Overdue: {alert.daysOverdue} days
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-600">
                                                    <button
                                                        type="button"
                                                        onClick={() => router.push('/outstanding-alerts')}
                                                        className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                                    >
                                                        View All Alerts
                                                        <ExternalLink className="w-4 h-4 ml-1" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Machine Details Section */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Machine Details</h3>

                                {machines.map((machine, index) => {
                                    const availableStock =
                                        machine.brand && machine.model && machine.type
                                            ? getAvailableStock(machine.brand, machine.model, machine.type)
                                            : 0;

                                    return (
                                        <div
                                            key={machine.id}
                                            className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-4"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    Machine {index + 1}
                                                </span>
                                                {machines.length > 1 && (
                                                    <Tooltip content="Remove Machine">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveMachine(machine.id)}
                                                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                            </div>

                                            {/* Machine Input Fields - two-row grid so all inputs align regardless of label length */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-2">
                                                {/* Row 1: Labels (each can wrap; row height varies) */}
                                                <div className="min-w-0">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Brand <span className="text-red-500">*</span>
                                                    </label>
                                                </div>
                                                <div className="min-w-0">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Model <span className="text-red-500">*</span>
                                                    </label>
                                                </div>
                                                <div className="min-w-0">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Type <span className="text-red-500">*</span>
                                                    </label>
                                                </div>
                                                <div className="min-w-0">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Quantity <span className="text-red-500">*</span>
                                                    </label>
                                                </div>
                                                <div className="min-w-0">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        Monthly Rental Fee (Rs.)
                                                    </label>
                                                </div>
                                                {/* Row 2: Inputs (always on same baseline) */}
                                                <div className="min-w-0 flex flex-col">
                                                    <SearchableSelect
                                                        value={machine.brand}
                                                        onChange={(value) => handleMachineChange(machine.id, 'brand', value)}
                                                        options={brandOptions}
                                                        placeholder={masterDataLoading ? 'Loading brands...' : 'Select Brand'}
                                                        disabled={masterDataLoading}
                                                        error={formErrors[`machine_brand_${index}`]}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex flex-col">
                                                    <SearchableSelect
                                                        value={machine.model}
                                                        onChange={(value) => handleMachineChange(machine.id, 'model', value)}
                                                        options={getModelOptions(machine.brand)}
                                                        placeholder="Select Model"
                                                        disabled={!machine.brand}
                                                        error={formErrors[`machine_model_${index}`]}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex flex-col">
                                                    <SearchableSelect
                                                        value={machine.type}
                                                        onChange={(value) => handleMachineChange(machine.id, 'type', value)}
                                                        options={getTypeOptions(machine.brand, machine.model)}
                                                        placeholder="Select Type"
                                                        disabled={!machine.brand || !machine.model}
                                                        error={formErrors[`machine_type_${index}`]}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex flex-col">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={machine.quantity}
                                                        onChange={(e) =>
                                                            handleMachineChange(machine.id, 'quantity', parseInt(e.target.value) || 1)
                                                        }
                                                        disabled={!machine.brand || !machine.model}
                                                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors[`machine_quantity_${index}`]
                                                                ? 'border-red-500'
                                                                : 'border-gray-300 dark:border-slate-600'
                                                            } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                                                    />
                                                    {machine.brand && machine.model && machine.type && (
                                                        <div className={`mt-1.5 inline-flex items-center gap-1.5 w-fit px-2 py-1 rounded-md ${
                                                            availableStock > 0
                                                                ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                                                                : 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
                                                        }`}>
                                                            <Package className={`w-3.5 h-3.5 ${
                                                                availableStock > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                                                            }`} />
                                                            <span className={`text-xs font-semibold ${
                                                                availableStock > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                                                            }`}>
                                                                Available: {availableStock}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {formErrors[`machine_quantity_${index}`] && (
                                                        <p className="mt-1 text-sm text-red-500">
                                                            {formErrors[`machine_quantity_${index}`]}
                                                        </p>
                                                    )}
                                                    {machine.brand && machine.model && machine.type && machine.quantity > availableStock && (
                                                        <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                                                            {machine.quantity - availableStock} machine(s) will be marked as pending
                                                        </p>
                                                    )}
                                                    {machine.brand && machine.model && machine.type && availableStock === 0 && (
                                                        <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                                                            No stock available - all will be marked as pending
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex flex-col">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={machine.monthlyRentalFee || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            const num = val === '' ? 0 : parseFloat(val) || 0;
                                                            handleMachineChange(machine.id, 'monthlyRentalFee', num);
                                                        }}
                                                        placeholder="0"
                                                        className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${formErrors[`machine_monthlyRentalFee_${index}`]
                                                                ? 'border-red-500'
                                                                : 'border-gray-300 dark:border-slate-600'
                                                            } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                                                    />
                                                    {formErrors[`machine_monthlyRentalFee_${index}`] && (
                                                        <p className="mt-1 text-sm text-red-500">
                                                            {formErrors[`machine_monthlyRentalFee_${index}`]}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Show price info when monthly fee or quantity is set */}
                                            {(Number(machine.monthlyRentalFee) > 0 || machine.quantity > 0) && (
                                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-600">
                                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                                        <span>
                                                            Monthly rental: Rs. {(machine.monthlyRentalFee || 0).toLocaleString('en-LK')} × {machine.quantity} = Rs. {(machine.totalPrice || 0).toLocaleString('en-LK')}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Add Machine Button - Moved to bottom right */}
                                <div className="flex justify-end">
                                    <Tooltip content="Add Machine">
                                        <button
                                            type="button"
                                            onClick={handleAddMachine}
                                            className="inline-flex items-center px-3 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 transition-colors"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Add Machine
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>

                            {/* Pricing Summary */}
                            {pricing > 0 && (
                                <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                        Pricing Summary
                                    </h3>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 dark:text-gray-400">Total Amount:</span>
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                            Rs. {pricing.toLocaleString('en-LK', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Form Actions */}
                            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                                <Tooltip content="Cancel">
                                    <button
                                        type="button"
                                        onClick={() => router.push('/purchase-order')}
                                        disabled={isSubmitting}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                </Tooltip>
                                <Tooltip content="Create Purchase Request">
                                    <button
                                        type="button"
                                        onClick={handleSubmitPurchaseRequest}
                                        disabled={isSubmitting}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Creating...' : 'Create Purchase Request'}
                                    </button>
                                </Tooltip>
                            </div>
                            </div>
                        </LetterheadDocument>
                    </div>
                </div>
            </main>

            {/* Register New Customer Modal - styled to match Customers page Create Customer popup */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header - same as customer page */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                Register New Customer
                            </h2>
                            <Tooltip content="Close">
                                <button
                                    onClick={handleCloseRegisterModal}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </Tooltip>
                        </div>

                        {/* Tabs - same position and style as customer page Create Customer modal */}
                        <div className="border-b border-gray-200 dark:border-slate-700 px-6">
                            <div className="flex space-x-4">
                                <Tooltip content="Business">
                                    <button
                                        onClick={() => setActiveCreateTab('company')}
                                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeCreateTab === 'company'
                                                ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        Business
                                    </button>
                                </Tooltip>
                                <Tooltip content="Customer">
                                    <button
                                        onClick={() => setActiveCreateTab('individual')}
                                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeCreateTab === 'individual'
                                                ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        Customer
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        {/* Modal Content - Scrollable (same structure as customers page Create Customer popup) */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeCreateTab === 'company' ? (
                                <CreateForm
                                    ref={createFormRef}
                                    title="Business Details"
                                    fields={companyFields}
                                    onSubmit={handleCompanySubmit}
                                    onClear={handleClear}
                                    submitButtonLabel="Save"
                                    clearButtonLabel="Clear"
                                    loading={isSubmitting}
                                    enableDynamicSpecs={false}
                                    hideFooterActions
                                    formId="register-customer-form-company"
                                    className="shadow-none border-0 p-0"
                                />
                            ) : (
                                <CreateForm
                                    ref={createFormRef}
                                    title="Customer Details"
                                    fields={individualFields}
                                    onSubmit={handleIndividualSubmit}
                                    onClear={handleClear}
                                    submitButtonLabel="Save"
                                    clearButtonLabel="Clear"
                                    loading={isSubmitting}
                                    enableDynamicSpecs={false}
                                    hideFooterActions
                                    formId="register-customer-form-individual"
                                    className="shadow-none border-0 p-0"
                                />
                            )}
                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Locations (optional)</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Add one or more locations for this customer (e.g. delivery or site addresses).</p>
                                {createLocations.map((loc, index) => (
                                    <div key={index} className="flex flex-wrap items-start gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={loc.name}
                                            onChange={(e) => updateCreateLocation(index, 'name', e.target.value)}
                                            placeholder="Location name (e.g. Main Factory)"
                                            className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                        />
                                        <input
                                            type="text"
                                            value={loc.address || ''}
                                            onChange={(e) => updateCreateLocation(index, 'address', e.target.value)}
                                            placeholder="Address (optional)"
                                            className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeCreateLocation(index)}
                                            disabled={createLocations.length <= 1}
                                            className="p-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                            aria-label="Remove location"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={addCreateLocation}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 dark:text-indigo-400 hover:bg-blue-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Add location
                                </button>
                                <div className="flex justify-end space-x-4 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => createFormRef.current?.clear()}
                                        className="px-6 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-slate-600 transition-colors duration-200 font-medium"
                                        disabled={isSubmitting}
                                    >
                                        Clear
                                    </button>
                                    <button
                                        type="submit"
                                        form={activeCreateTab === 'company' ? 'register-customer-form-company' : 'register-customer-form-individual'}
                                        className="px-6 py-3 bg-[#4154F1] dark:bg-indigo-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting && (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                        )}
                                        Save
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

export default CreatePurchaseRequestPage;