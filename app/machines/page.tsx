'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import CreateForm, { FormField } from '@/src/components/form-popup/create';
import UpdateForm from '@/src/components/form-popup/update';
import DeleteForm from '@/src/components/form-popup/delete';
import { Eye, Pencil, Trash2, X, History, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import { authFetch } from '@/lib/auth-client';
import { Swal } from '@/src/lib/swal';

type MachineType = 'Industrial' | 'Domestic' | 'Embroidery' | 'Overlock' | 'Buttonhole' | 'Other';

interface Machine {
  id: string;
  barcode: string;
  serialNumber: string;
  boxNo: string;
  brand: string;
  model: string;
  type: MachineType;
}

// Machine Profile Data Types (aligned with Machine schema and API)
interface MachineInfo {
  id: string;
  barcode: string;
  serialNumber: string;
  boxNo: string;
  brand: string;
  model: string;
  type: MachineType;
  status: 'Available' | 'Rented' | 'Maintenance' | 'Retired' | 'Damaged';
  currentCustomer?: string;
  photos?: string[];
  purchaseDate?: string | null;
  warrantyExpiry?: string;
  warrantyExpiryDate?: string | null;
  location?: string;
  currentLocationType?: string;
  currentLocationAddress?: string;
  notes?: string;
  manufactureYear?: string;
  country?: string;
  conditionOnArrival?: string;
  warrantyStatus?: string;
  registrationLocation?: string;
  unitPrice?: number | null;
  monthlyRentalFee?: number | null;
  voltage?: string;
  power?: string;
  stitchType?: string;
  maxSpeedSpm?: number | null;
  specsOther?: string;
}

// Machine Rental History Data Types
interface MachineRentalHistory {
  id: string;
  serialNumber: string;
  brand: string;
  model: string;
  type: MachineType;
  customer: string;
  rentingPeriod: string;
  startDate: string;
  endDate: string | null;
  status: 'Active' | 'Completed' | 'Cancelled';
}

// API Response Types
interface Brand {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

interface Model {
  id: string;
  name: string;
  code: string;
  description?: string;
  brandId: string;
  isActive: boolean;
  brand?: Brand;
}

interface MachineTypeData {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

// API Functions
const API_BASE_URL = '/api/v1';

// Fetch all machines (authFetch handles 401 → refresh → redirect to login)
const fetchMachines = async (): Promise<Machine[]> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/machines?limit=1000`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch machines');
    }

    const data = await response.json();
    return data.data?.items || [];
  } catch (error) {
    console.error('Error fetching machines:', error);
    return [];
  }
};

// Fetch active brands
const fetchActiveBrands = async (): Promise<Brand[]> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/brands/active`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch brands');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching brands:', error);
    return [];
  }
};

// Fetch active models (with optional brandId filter)
const fetchActiveModels = async (brandId?: string): Promise<Model[]> => {
  try {
    const url = brandId 
      ? `${API_BASE_URL}/models/active?brandId=${brandId}`
      : `${API_BASE_URL}/models/active`;
    
    const response = await authFetch(url, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
};

// Fetch active machine types
const fetchActiveMachineTypes = async (): Promise<MachineTypeData[]> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/machine-types/active`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch machine types');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching machine types:', error);
    return [];
  }
};

// Tool type (from API)
interface ToolRecord {
  id: string;
  toolName: string;
  toolType: string;
  brand: string | null;
  model: string | null;
  [key: string]: any;
}

// Fetch tools for dropdown options (distinct tool names, types, brands, models)
const fetchTools = async (): Promise<ToolRecord[]> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/tools?limit=500`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tools');
    }

    const data = await response.json();
    return data.data?.items || [];
  } catch (error) {
    console.error('Error fetching tools:', error);
    return [];
  }
};

// Create tool
const createTool = async (toolData: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/tools`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(toolData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to create tool',
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('Error creating tool:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

// Fetch machine by ID
const fetchMachineById = async (machineId: string): Promise<MachineInfo | null> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/machines/${machineId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch machine');
    }

    const data = await response.json();
    return data.data as MachineInfo;
  } catch (error) {
    console.error('Error fetching machine by ID:', error);
    return null;
  }
};

// Create machine
const createMachine = async (machineData: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/machines`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(machineData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to create machine',
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('Error creating machine:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

// Update machine
const updateMachine = async (machineId: string, machineData: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/machines/${machineId}`, {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify(machineData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to update machine',
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('Error updating machine:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

// Delete machine
const deleteMachine = async (machineId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/machines/${machineId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to delete machine',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error deleting machine:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

// Mock function for rental history (to be replaced with actual API later)
const getMachineRentalHistory = (machineId: string): MachineRentalHistory[] => {
  // TODO: Replace with actual API call to fetch rental history
  return [];
};

// Table column configuration
const columns: TableColumn[] = [
  // {
  //   key: 'barcode',
  //   label: 'Description',
  //   sortable: true,
  //   filterable: true,
  // },
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
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [selectedMachineDetail, setSelectedMachineDetail] = useState<MachineInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [activeCreateTab, setActiveCreateTab] = useState<'machine' | 'tool'>('machine');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New state for dropdown options
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [machineTypes, setMachineTypes] = useState<MachineTypeData[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);

  // Tool dropdown options (distinct values from existing tools)
  const [toolNames, setToolNames] = useState<string[]>([]);
  const [toolTypes, setToolTypes] = useState<string[]>([]);
  const [toolBrands, setToolBrands] = useState<string[]>([]);
  const [toolModels, setToolModels] = useState<string[]>([]);
  const [isLoadingToolOptions, setIsLoadingToolOptions] = useState(false);

  // Warranty status from machine form – when "Active", show Warranty Expires Date field
  const [machineFormWarrantyStatus, setMachineFormWarrantyStatus] = useState<string>('');

  // Fetch machines on component mount
  useEffect(() => {
    loadMachines();
  }, []);

  // Fetch dropdown data when create modal opens (machine tab)
  useEffect(() => {
    if (isCreateModalOpen) {
      loadDropdownData();
    }
  }, [isCreateModalOpen]);

  // Fetch tool options when switching to tool tab
  useEffect(() => {
    if (isCreateModalOpen && activeCreateTab === 'tool') {
      loadToolOptions();
    }
  }, [isCreateModalOpen, activeCreateTab]);

  // Fetch models when brand changes
  useEffect(() => {
    if (selectedBrandId) {
      loadModelsByBrand(selectedBrandId);
    } else if (isCreateModalOpen) {
      loadModels();
    }
  }, [selectedBrandId]);

  const loadMachines = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMachines();
      setMachines(data);
    } catch (error) {
      console.error('Error loading machines:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDropdownData = async (): Promise<{
    brandsData: Brand[];
    modelsData: Model[];
    typesData: MachineTypeData[];
  }> => {
    setIsLoadingDropdowns(true);
    try {
      const [brandsData, modelsData, typesData] = await Promise.all([
        fetchActiveBrands(),
        fetchActiveModels(),
        fetchActiveMachineTypes(),
      ]);
      
      setBrands(brandsData);
      setModels(modelsData);
      setMachineTypes(typesData);
      return { brandsData, modelsData, typesData };
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      return { brandsData: [], modelsData: [], typesData: [] };
    } finally {
      setIsLoadingDropdowns(false);
    }
  };

  const loadModels = async () => {
    try {
      const modelsData = await fetchActiveModels();
      setModels(modelsData);
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const loadModelsByBrand = async (brandId: string) => {
    try {
      const modelsData = await fetchActiveModels(brandId);
      setModels(modelsData);
    } catch (error) {
      console.error('Error loading models by brand:', error);
    }
  };

  const loadToolOptions = async () => {
    setIsLoadingToolOptions(true);
    try {
      const toolsList = await fetchTools();
      const names = [...new Set(toolsList.map((t) => t.toolName).filter((x): x is string => Boolean(x)))].sort();
      const types = [...new Set(toolsList.map((t) => t.toolType).filter((x): x is string => Boolean(x)))].sort();
      const brandsList = [...new Set(toolsList.map((t) => t.brand).filter((x): x is string => Boolean(x)))].sort();
      const modelsList = [...new Set(toolsList.map((t) => t.model).filter((x): x is string => Boolean(x)))].sort();
      setToolNames(names);
      setToolTypes(types);
      setToolBrands(brandsList);
      setToolModels(modelsList);
    } catch (error) {
      console.error('Error loading tool options:', error);
    } finally {
      setIsLoadingToolOptions(false);
    }
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

  const handleCreateMachine = () => {
    setIsCreateModalOpen(true);
    setActiveCreateTab('machine');
    setSelectedBrandId(''); // Reset brand selection
    setMachineFormWarrantyStatus(''); // Reset warranty-based field visibility
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setActiveCreateTab('machine');
    setSelectedBrandId(''); // Reset brand selection
    setMachineFormWarrantyStatus('');
  };

  const handleViewMachine = async (machine: Machine) => {
    setSelectedMachine(machine);
    setCurrentPhotoIndex(0);
    setIsViewModalOpen(true);
    
    const machineDetail = await fetchMachineById(machine.id.toString());
    if (machineDetail) {
      setSelectedMachineDetail(machineDetail);
    }
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedMachine(null);
    setSelectedMachineDetail(null);
    setCurrentPhotoIndex(0);
  };

  const handleUpdateMachine = async (machine: Machine) => {
    setSelectedMachine(machine);
    setIsUpdateModalOpen(true);
    
    // Load dropdown data early so brand/model/type selections can resolve correctly.
    const { brandsData } = await loadDropdownData();

    const machineDetail = await fetchMachineById(machine.id.toString());
    if (machineDetail) {
      setSelectedMachineDetail(machineDetail);
      setMachineFormWarrantyStatus(machineDetail.warrantyStatus || '');

      // Critical: preselect brand so model dropdown enables and can show the existing value.
      const brandMatch = brandsData.find((b) => b.name === machineDetail.brand);
      if (brandMatch?.id) {
        setSelectedBrandId(brandMatch.id);
        await loadModelsByBrand(brandMatch.id);
      } else {
        // Brand is not an existing active brand (creatable scenario) – keep model selectable via typed value.
        setSelectedBrandId(machineDetail.brand || '');
        setModels([]);
      }
    }
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedMachine(null);
    setSelectedMachineDetail(null);
    setSelectedBrandId('');
    setMachineFormWarrantyStatus('');
  };

  const handleDeleteMachine = (machine: Machine) => {
    setSelectedMachine(machine);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedMachine(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMachine) return;
    
    setIsSubmitting(true);
    try {
      const result = await deleteMachine(selectedMachine.id.toString());
      
      if (result.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: `Machine "${selectedMachine.brand} ${selectedMachine.model}" deleted successfully.`,
        });
        handleCloseDeleteModal();
        await loadMachines();
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Failed to delete',
          text: `Failed to delete machine: ${result.error}`,
        });
      }
    } catch (error) {
      console.error('Error deleting machine:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Failed to delete',
        text: 'Failed to delete machine. Please try again.',
      });
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
    if (!selectedMachineDetail) return;
    const photos = selectedMachineDetail.photos || [];
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNextPhoto = () => {
    if (!selectedMachineDetail) return;
    const photos = selectedMachineDetail.photos || [];
    setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  // Convert API data to dropdown options
  const getBrandOptions = () => {
    return brands.map(brand => ({
      label: brand.name,
      value: brand.id,
    }));
  };

  const getModelOptions = () => {
    // When brand is a custom (new) name, we have no models for it yet - show empty with creatable
    const isExistingBrand = selectedBrandId && brands.some((b) => b.id === selectedBrandId);
    const modelList = isExistingBrand ? models : [];
    return modelList.map((model) => ({
      label: model.name,
      value: model.id,
    }));
  };

  const getMachineTypeOptions = () => {
    return machineTypes.map(type => ({
      label: type.name,
      value: type.id,
    }));
  };

  // Form fields for Machine Registration (dynamically populated)
  const getMachineFields = (): FormField[] => [
    {
      name: 'brandId',
      label: 'Brand',
      type: 'select',
      placeholder: isLoadingDropdowns ? 'Loading brands...' : 'Search or select brand, or type new',
      required: true,
      searchable: true,
      creatable: true,
      options: getBrandOptions(),
      onChange: (value: string) => {
        setSelectedBrandId(value);
        const isExistingBrand = brands.some((b) => b.id === value);
        if (isExistingBrand) {
          loadModelsByBrand(value);
        } else {
          setModels([]);
        }
      },
    },
    {
      name: 'modelId',
      label: 'Model',
      type: 'select',
      placeholder: !selectedBrandId
        ? 'Select a brand first'
        : getModelOptions().length === 0
          ? 'Type model name (new brand or no models yet)'
          : 'Search or select model, or type new',
      required: true,
      searchable: true,
      creatable: true,
      options: getModelOptions(),
      disabled: !selectedBrandId,
    },
    {
      name: 'machineTypeId',
      label: 'Type',
      type: 'select',
      placeholder: isLoadingDropdowns ? 'Loading types...' : 'Search or select machine type, or type new',
      required: true,
      searchable: true,
      creatable: true,
      options: getMachineTypeOptions(),
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
      onChange: (value: string) => setMachineFormWarrantyStatus(value || ''),
    },
    ...(machineFormWarrantyStatus === 'Active'
      ? [
          {
            name: 'warrantyExpiryDate',
            label: 'Warranty Expires Date',
            type: 'date' as const,
            placeholder: 'Select date',
            required: false,
          } as FormField,
        ]
      : []),
    {
      name: 'unitPrice',
      label: 'Unit Price',
      type: 'number',
      placeholder: 'Enter unit price (e.g. 0.00)',
      required: false,
    },
    {
      name: 'monthlyRentalFee',
      label: 'Monthly Rental Fee',
      type: 'number',
      placeholder: 'Enter monthly rental fee (e.g. 0.00)',
      required: false,
    },
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

  // Create form: same fields as above but without Invoice/GRN (simplified registration)
  const getMachineCreateFields = (): FormField[] =>
    getMachineFields().filter((f) => f.name !== 'invoiceGrn');

  // Update form: full machine details (all Machine table columns editable except id/qr/onboarded)
  const getMachineUpdateFields = (): FormField[] => [
    { name: 'serialNumber', label: 'Serial Number', type: 'text', placeholder: 'Enter serial number', required: true },
    { name: 'boxNo', label: 'Box Number', type: 'text', placeholder: 'Enter box number', required: false },
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
        { label: 'Damaged', value: 'Damaged' },
      ],
    },
    {
      name: 'brandId',
      label: 'Brand',
      type: 'select',
      placeholder: isLoadingDropdowns ? 'Loading brands...' : 'Search or select brand, or type new',
      required: true,
      searchable: true,
      creatable: true,
      options: getBrandOptions(),
      onChange: (value: string) => {
        setSelectedBrandId(value);
        const isExistingBrand = brands.some((b) => b.id === value);
        if (isExistingBrand) {
          loadModelsByBrand(value);
        } else {
          setModels([]);
        }
      },
    },
    {
      name: 'modelId',
      label: 'Model',
      type: 'select',
      placeholder: !selectedBrandId
        ? 'Select a brand first'
        : getModelOptions().length === 0
          ? 'Type model name (new brand or no models yet)'
          : 'Search or select model, or type new',
      required: true,
      searchable: true,
      creatable: true,
      options: getModelOptions(),
      disabled: !selectedBrandId,
    },
    {
      name: 'machineTypeId',
      label: 'Type',
      type: 'select',
      placeholder: isLoadingDropdowns ? 'Loading types...' : 'Search or select machine type, or type new',
      required: true,
      searchable: true,
      creatable: true,
      options: getMachineTypeOptions(),
    },
    { name: 'voltage', label: 'Voltage', type: 'text', placeholder: 'e.g. 220V', required: false },
    { name: 'power', label: 'Power', type: 'text', placeholder: 'e.g. 500W', required: false },
    { name: 'stitchType', label: 'Stitch Type', type: 'text', placeholder: 'e.g. Lock Stitch', required: false },
    { name: 'maxSpeedSpm', label: 'Max Speed (SPM)', type: 'number', placeholder: 'e.g. 5000', required: false },
    { name: 'specsOther', label: 'Other Specs', type: 'textarea', placeholder: 'Any other technical specs', required: false, rows: 2 },
    { name: 'currentLocationType', label: 'Location Type', type: 'text', placeholder: 'e.g. Warehouse, Customer Site', required: false },
    { name: 'location', label: 'Location Name', type: 'text', placeholder: 'Current location name', required: false },
    { name: 'currentLocationAddress', label: 'Location Address', type: 'textarea', placeholder: 'Full address if applicable', required: false, rows: 2 },
    {
      name: 'manufactureYear',
      label: 'Manufact Year',
      type: 'date',
      placeholder: 'Select date',
      required: false,
    },
    { name: 'country', label: 'Country', type: 'text', placeholder: 'Enter country', required: false },
    {
      name: 'conditionOnArrival',
      label: 'Condition on Arrival',
      type: 'select',
      placeholder: 'Select condition',
      required: false,
      options: [
        { label: 'New', value: 'New' },
        { label: 'Used', value: 'Used' },
        { label: 'Refurbished', value: 'Refurbished' },
      ],
    },
    {
      name: 'warrantyStatus',
      label: 'Warranty Status',
      type: 'select',
      placeholder: 'Select warranty status',
      required: false,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Expired', value: 'Expired' },
        { label: 'No Warranty', value: 'No Warranty' },
      ],
      onChange: (value: string) => setMachineFormWarrantyStatus(value || ''),
    },
    ...(machineFormWarrantyStatus === 'Active'
      ? [
          {
            name: 'warrantyExpiryDate',
            label: 'Warranty Expires Date',
            type: 'date' as const,
            placeholder: 'Select date',
            required: false,
          } as FormField,
        ]
      : []),
    { name: 'purchaseDate', label: 'Purchase Date', type: 'date', placeholder: 'Select date', required: false },
    { name: 'unitPrice', label: 'Unit Price', type: 'number', placeholder: 'Enter unit price (e.g. 0.00)', required: false },
    { name: 'monthlyRentalFee', label: 'Monthly Rental Fee', type: 'number', placeholder: 'Enter monthly rental fee (e.g. 0.00)', required: false },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes', required: false, rows: 3 },
    { name: 'referencePhoto', label: 'Reference Photo', type: 'file-multiple', accept: 'image/*', required: false, multiple: true },
    { name: 'serialPlatePhoto', label: 'Serial Plate Photo', type: 'file-multiple', accept: 'image/*', required: false, multiple: true },
    { name: 'invoiceGrn', label: 'Invoice/GRN', type: 'file-multiple', accept: 'application/pdf,image/*', required: false, multiple: true },
  ];

  // Form fields for Tool Registration (options from existing tools, searchable + creatable)
  const getToolFields = (): FormField[] => [
    {
      name: 'toolName',
      label: 'Tool Name',
      type: 'select',
      placeholder: isLoadingToolOptions ? 'Loading...' : 'Search or select tool name, or type new',
      required: true,
      searchable: true,
      creatable: true,
      options: toolNames.map((n) => ({ label: n, value: n })),
    },
    {
      name: 'toolType',
      label: 'Tool Type',
      type: 'select',
      placeholder: isLoadingToolOptions ? 'Loading...' : 'Search or select tool type, or type new',
      required: true,
      searchable: true,
      creatable: true,
      options: toolTypes.map((t) => ({ label: t, value: t })),
    },
    {
      name: 'brand',
      label: 'Brand',
      type: 'select',
      placeholder: isLoadingToolOptions ? 'Loading...' : 'Search or select brand, or type new',
      required: false,
      searchable: true,
      creatable: true,
      options: toolBrands.map((b) => ({ label: b, value: b })),
    },
    {
      name: 'model',
      label: 'Model',
      type: 'select',
      placeholder: isLoadingToolOptions ? 'Loading...' : 'Search or select model, or type new',
      required: false,
      searchable: true,
      creatable: true,
      options: toolModels.map((m) => ({ label: m, value: m })),
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
        { label: 'New', value: 'NEW' },
        { label: 'Good', value: 'GOOD' },
        { label: 'Fair', value: 'FAIR' },
        { label: 'Poor', value: 'POOR' },
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

  // Format date for HTML date input (YYYY-MM-DD)
  const toDateInputValue = (d: string | Date | null | undefined): string => {
    if (d == null) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  };

  // Get initial data for update form (all Machine fields for update popup)
  const getUpdateInitialData = (machine: Machine | null) => {
    if (!machine) return {};

    if (selectedMachineDetail) {
      const brand = brands.find(b => b.name === selectedMachineDetail.brand);
      const model = models.find(m => m.name === selectedMachineDetail.model);
      const machineType = machineTypes.find(t => t.name === selectedMachineDetail.type);
      const purchaseDate = selectedMachineDetail.purchaseDate;
      const warrantyExpiry = selectedMachineDetail.warrantyExpiryDate ?? selectedMachineDetail.warrantyExpiry;

      return {
        barcode: selectedMachineDetail.barcode,
        serialNumber: selectedMachineDetail.serialNumber,
        boxNo: selectedMachineDetail.boxNo,
        status: selectedMachineDetail.status,
        brandId: brand?.id,
        modelId: model?.id,
        machineTypeId: machineType?.id,
        voltage: selectedMachineDetail.voltage ?? '',
        power: selectedMachineDetail.power ?? '',
        stitchType: selectedMachineDetail.stitchType ?? '',
        maxSpeedSpm: selectedMachineDetail.maxSpeedSpm ?? '',
        specsOther: selectedMachineDetail.specsOther ?? '',
        currentLocationType: selectedMachineDetail.currentLocationType ?? '',
        location: selectedMachineDetail.location ?? '',
        currentLocationAddress: selectedMachineDetail.currentLocationAddress ?? '',
        manufactureYear: selectedMachineDetail.manufactureYear ?? '',
        country: selectedMachineDetail.country ?? '',
        conditionOnArrival: selectedMachineDetail.conditionOnArrival ?? '',
        warrantyStatus: selectedMachineDetail.warrantyStatus ?? '',
        warrantyExpiryDate: toDateInputValue(warrantyExpiry),
        purchaseDate: toDateInputValue(purchaseDate),
        unitPrice: selectedMachineDetail.unitPrice ?? '',
        monthlyRentalFee: selectedMachineDetail.monthlyRentalFee ?? '',
        notes: selectedMachineDetail.notes ?? '',
      };
    }

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
      // API accepts brandId or brand (name), modelId or model (name), machineTypeId or type (name)
      const payload: Record<string, any> = { ...data };

      if (brands.some((b) => b.id === data.brandId)) {
        payload.brandId = data.brandId;
      } else {
        payload.brand = (data.brandId || '').trim();
        delete payload.brandId;
      }
      if (models.some((m) => m.id === data.modelId)) {
        payload.modelId = data.modelId;
      } else {
        payload.model = (data.modelId || '').trim();
        delete payload.modelId;
      }
      if (machineTypes.some((t) => t.id === data.machineTypeId)) {
        payload.machineTypeId = data.machineTypeId;
      } else {
        payload.type = (data.machineTypeId || '').trim();
        delete payload.machineTypeId;
      }

      const result = await createMachine(payload);

      if (result.success) {
        const brandName = payload.brand || brands.find((b) => b.id === payload.brandId)?.name || '';
        const modelName = payload.model || models.find((m) => m.id === payload.modelId)?.name || '';
        await Swal.fire({
          icon: 'success',
          title: 'Registered',
          text: `Machine "${brandName} ${modelName}" registered successfully.`,
        });
        handleCloseCreateModal();
        await loadMachines();
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Failed to register',
          text: `Failed to create machine: ${result.error}`,
        });
      }
    } catch (error) {
      console.error('Error creating machine:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Failed to register',
        text: 'Failed to create machine. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToolSubmit = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        toolName: (data.toolName || '').trim(),
        toolType: (data.toolType || '').trim(),
        brand: data.brand ? String(data.brand).trim() : null,
        model: data.model ? String(data.model).trim() : null,
        serialNumber: data.serialNumber ? String(data.serialNumber).trim() : null,
        quantity: parseInt(data.quantity, 10) || 1,
        unitPrice: data.unitPrice != null && data.unitPrice !== '' ? parseFloat(data.unitPrice) : null,
        status: 'AVAILABLE', // Status field removed from form; new tools default to Available
        location: (data.location || '').trim(),
        purchaseDate: data.purchaseDate || null,
        condition: data.condition || 'NEW',
        notes: data.notes ? String(data.notes).trim() : null,
        toolPhotoUrls: [], // File upload to URL not implemented in this flow; can be extended later
      };
      const result = await createTool(payload);
      if (result.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Registered',
          text: `Tool "${payload.toolName}" registered successfully.`,
        });
        handleCloseCreateModal();
        await loadToolOptions(); // Refresh tool options for next time
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Failed to register',
          text: `Failed to create tool: ${result.error}`,
        });
      }
    } catch (error) {
      console.error('Error creating tool:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Failed to register',
        text: 'Failed to create tool. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMachineUpdate = async (data: Record<string, any>) => {
    if (!selectedMachine) return;

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = { ...data };
      if (data.brandId != null) {
        if (brands.some((b) => b.id === data.brandId)) {
          payload.brandId = data.brandId;
        } else {
          payload.brand = (data.brandId || '').trim();
          delete payload.brandId;
        }
      }
      if (data.modelId != null) {
        if (models.some((m) => m.id === data.modelId)) {
          payload.modelId = data.modelId;
        } else {
          payload.model = (data.modelId || '').trim();
          delete payload.modelId;
        }
      }
      if (data.machineTypeId != null) {
        if (machineTypes.some((t) => t.id === data.machineTypeId)) {
          payload.machineTypeId = data.machineTypeId;
        } else {
          payload.type = (data.machineTypeId || '').trim();
          delete payload.machineTypeId;
        }
      }

      const result = await updateMachine(selectedMachine.id.toString(), payload);

      if (result.success) {
        const brandName = payload.brand || brands.find((b) => b.id === payload.brandId)?.name || '';
        const modelName = payload.model || models.find((m) => m.id === payload.modelId)?.name || '';
        await Swal.fire({
          icon: 'success',
          title: 'Updated',
          text: `Machine "${brandName} ${modelName}" updated successfully.`,
        });
        handleCloseUpdateModal();
        await loadMachines();
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Failed to update',
          text: `Failed to update machine: ${result.error}`,
        });
      }
    } catch (error) {
      console.error('Error updating machine:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Failed to update',
        text: 'Failed to update machine. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setSelectedBrandId(''); // Reset brand selection when clearing form
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

  // View Machine Profile Content
  const renderMachineProfile = () => {
    if (!selectedMachine) return null;

    const machineInfo = selectedMachineDetail || {
      ...selectedMachine,
      status: 'Available',
      photos: [],
    } as MachineInfo;
    
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
      <Navbar onMenuClick={handleMenuClick} />
      <Sidebar
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={handleMobileSidebarClose}
        onExpandedChange={setIsSidebarExpanded}
      />

      <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${
        isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
      }`}>
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Machine & Tool Management
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Overview of all sewing machines with their details, brand, model, and type.
              </p>
            </div>
          </div>

          <Table
            data={machines}
            columns={columns}
            actions={actions}
            itemsPerPage={10}
            searchable
            filterable
            loading={isLoading}
            onCreateClick={handleCreateMachine}
            createButtonLabel="Register"
            emptyMessage={isLoading ? "Loading machines..." : "No machines found."}
          />
        </div>
      </main>

      {/* Create Machine/Tool Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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

            <div className="flex-1 overflow-y-auto p-6">
              {activeCreateTab === 'machine' ? (
                <CreateForm
                  title="Machine Registration"
                  fields={getMachineCreateFields()}
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
                  fields={getToolFields()}
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
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Update Machine Details
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
                title=""
                fields={getMachineUpdateFields()}
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

      {/* View Machine Profile Modal */}
      {isViewModalOpen && selectedMachine && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Machine Profile
                </h2>
              </div>
              <button
                onClick={handleCloseViewModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <Table
                  data={getMachineRentalHistory(selectedMachine.id.toString())}
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
    </div>
  );
};

export default MachineListPage;