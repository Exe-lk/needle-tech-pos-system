'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Swal, { type SweetAlertResult } from 'sweetalert2';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import { X, ChevronDown, Check, Plus, Trash2, QrCode, Download, ChevronRight, ChevronUp, AlertCircle, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Tooltip from '@/src/components/common/tooltip';
import { validateSerialNumber, validateBoxNumber } from '@/src/utils/validation';
import { authFetch } from '@/lib/auth-client';

const API_BASE = '/api/v1';

type MachineType = 'Industrial' | 'Domestic' | 'Embroidery' | 'Overlock' | 'Buttonhole' | 'Other';
type StockType = 'New' | 'Used';

const MACHINE_TYPE_OPTIONS: { value: MachineType; label: string }[] = [
  { value: 'Industrial', label: 'Industrial' },
  { value: 'Domestic', label: 'Domestic' },
  { value: 'Embroidery', label: 'Embroidery' },
  { value: 'Overlock', label: 'Overlock' },
  { value: 'Buttonhole', label: 'Buttonhole' },
  { value: 'Other', label: 'Other' },
];

interface BrandRecord {
  id: string;
  name: string;
}

interface ModelRecord {
  id: string;
  name: string;
  brandId: string;
  brand?: { name: string };
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

// Individual machine entry
interface MachineEntry {
  id: string;
  serialNumber: string;
  boxNo: string;
  barcode: string;
  qrCodeData?: string;
  errors?: {
    serialNumber?: string;
    boxNo?: string;
  };
}

// Stock model entry (represents a model with quantity)
interface StockModelEntry {
  id: string;
  brand: string;
  model: string;
  type: MachineType;
  stockType: StockType;
  quantity: number;
  warrantyExpiry: string;
  condition: string;
  location: string;
  notes: string;
  machines: MachineEntry[];
  isExpanded: boolean;
  errors?: {
    brand?: string;
    model?: string;
    stockType?: string;
    quantity?: string;
    warrantyExpiry?: string;
    condition?: string;
    location?: string;
  };
}

const StockInPage: React.FC = () => {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Brands and models from API (for dropdowns)
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [brandsModelsLoading, setBrandsModelsLoading] = useState(true);

  // New model form state
  const [newModelBrand, setNewModelBrand] = useState('');
  const [newModelModel, setNewModelModel] = useState('');
  const [newModelType, setNewModelType] = useState('');
  const [newModelStockType, setNewModelStockType] = useState('');
  const [newModelQuantity, setNewModelQuantity] = useState('');
  const [newModelWarrantyExpiry, setNewModelWarrantyExpiry] = useState('');
  const [newModelCondition, setNewModelCondition] = useState('');
  const [newModelLocation, setNewModelLocation] = useState('');
  const [newModelNotes, setNewModelNotes] = useState('');
  const [newModelErrors, setNewModelErrors] = useState<Record<string, string>>({});

  // Stock models list
  const [stockModels, setStockModels] = useState<StockModelEntry[]>([]);

  // QR Code modal state
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedMachineForQR, setSelectedMachineForQR] = useState<{ modelId: string; machineId: string } | null>(null);
  const qrCodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const singlePrintLabelRef = useRef<HTMLDivElement | null>(null);

  // QR Batch modal (after submit): QR printing UI like qr-generate (label format + batch sets)
  const [showQrBatchModal, setShowQrBatchModal] = useState(false);
  const [submittedStockModels, setSubmittedStockModels] = useState<StockModelEntry[]>([]);

  // BrowserPrint (Zebra) for batch QR printing
  const [isBrowserPrintLoaded, setIsBrowserPrintLoaded] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const batchLabelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch brands and models on mount
  const fetchBrandsAndModels = useCallback(async () => {
    setBrandsModelsLoading(true);
    try {
      const [brandsRes, modelsRes] = await Promise.all([
        authFetch(`${API_BASE}/brands?page=1&limit=200`, { credentials: 'include' }),
        authFetch(`${API_BASE}/models?page=1&limit=500`, { credentials: 'include' }),
      ]);
      const brandsJson = await brandsRes.json();
      const modelsJson = await modelsRes.json();
      const brandsList = brandsJson?.data?.items ?? [];
      const modelsList = modelsJson?.data?.items ?? [];
      setBrands(Array.isArray(brandsList) ? brandsList : []);
      setModels(Array.isArray(modelsList) ? modelsList : []);
    } catch {
      setBrands([]);
      setModels([]);
    } finally {
      setBrandsModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrandsAndModels();
  }, [fetchBrandsAndModels]);

  // BrowserPrint (Zebra): init default/local printers after SDK loads
  useEffect(() => {
    if (!isBrowserPrintLoaded || typeof window === 'undefined') return;
    const wp = (window as any).BrowserPrint;
    if (!wp) return;
    wp.getDefaultDevice(
      'printer',
      (device: any) => {
        setSelectedDevice(device);
        setDevices((prev) => (device ? [...prev, device] : prev));
        wp.getLocalDevices(
          (list: any[]) => {
            const others = (list || []).filter((d: any) => d.uid !== device?.uid);
            setDevices((prev) => {
              const seen = new Set(prev.map((d: any) => d.uid));
              const added = others.filter((d: any) => !seen.has(d.uid));
              return added.length ? [...prev, ...added] : prev;
            });
            const zebra = others.find((d: any) => d.manufacturer === 'Zebra Technologies');
            if (zebra) setSelectedDevice(zebra);
          },
          () => {},
          'printer'
        );
      },
      () => {}
    );
  }, [isBrowserPrintLoaded]);

  // Get unique brand names (sorted) for dropdown
  const uniqueBrands = useMemo(() => {
    return [...new Set(brands.map((b) => b.name))].filter(Boolean).sort();
  }, [brands]);

  // Get models for selected brand (by brand name)
  const getModelsForBrand = useCallback(
    (brandName: string) => {
      const brand = brands.find((b) => b.name === brandName);
      if (!brand) return [];
      const forBrand = models.filter((m) => m.brandId === brand.id);
      const names = [...new Set(forBrand.map((m) => m.name))].filter(Boolean).sort();
      return names.map((m) => ({ label: m, value: m }));
    },
    [brands, models]
  );

  // Default machine type when brand/model selected (no type from API, default to Domestic)
  const getDefaultMachineType = (_brand: string, _model: string): MachineType => 'Domestic';

  // Prepare brand options
  const brandOptions = useMemo(() => {
    return uniqueBrands.map((brand) => ({ value: brand, label: brand }));
  }, [uniqueBrands]);

  // Prepare model options for selected brand
  const modelOptions = useMemo(() => {
    if (!newModelBrand) return [];
    return getModelsForBrand(newModelBrand);
  }, [newModelBrand, getModelsForBrand]);

  // Generate barcode
  const generateBarcode = (brand: string, model: string, serialNumber: string): string => {
    if (!brand || !model || !serialNumber) return '';
    return `${brand}-${model}-${serialNumber}`.replace(/\s+/g, '-').toUpperCase();
  };

  // Generate QR code data (full payload for records / single QR modal)
  const generateQRCodeData = (modelEntry: StockModelEntry, machine: MachineEntry): string => {
    const qrData = {
      barcode: machine.barcode,
      serialNumber: machine.serialNumber,
      boxNo: machine.boxNo || null,
      brand: modelEntry.brand,
      model: modelEntry.model,
      type: modelEntry.type,
      stockType: modelEntry.stockType,
      location: modelEntry.location,
      warrantyExpiry: modelEntry.stockType === 'New' ? modelEntry.warrantyExpiry : null,
      condition: modelEntry.stockType === 'Used' ? modelEntry.condition : null,
      notes: modelEntry.notes || null,
    };
    return JSON.stringify(qrData, null, 2);
  };

  // QR payload for printed labels (same format as qr-generate page for consistency)
  const getQRPayloadForLabel = (serialNumber: string, boxNo: string): string =>
    JSON.stringify({ serialNumber, boxNo: boxNo || '' });

  // ZPL for Zebra label (same layout as qr-generate: Needle Technologies header, QR left, S/N & B/N right)
  const getZPLForMachine = (serialNumber: string, boxNumber: string): string => {
    const qrData = getQRPayloadForLabel(serialNumber, boxNumber);
    return `^XA
^CI27
^PW464
^LL320

### Header: Company Name ###
^FO20,20^GB424,55,3^FS
^FO20,32^A0N,30,30^FB424,1,0,C^FDNeedle Technologies^FS

### LEFT SIDE: JSON Formatted QR Code ###
^FO50,100^BQN,2,5,H
^FDQA,${qrData}^FS

### RIGHT SIDE: Label Data ###
^FO250,135^A0N,22,22^FDS/N:^FS
^FO250,165^A0N,28,28^FD${serialNumber}^FS

^FO250,225^A0N,22,22^FDB/N:^FS
^FO250,255^A0N,28,28^FD${boxNumber}^FS

^XZ`;
  };

  // Sync default type when brand/model change (only set when type is empty)
  useEffect(() => {
    if (newModelBrand && newModelModel) {
      const defaultType = getDefaultMachineType(newModelBrand, newModelModel);
      setNewModelType((prev) => (prev && MACHINE_TYPE_OPTIONS.some((o) => o.value === prev) ? prev : defaultType));
    } else {
      setNewModelType('');
    }
  }, [newModelBrand, newModelModel]);

  // Validate new model form
  const validateNewModel = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!newModelBrand) errors.brand = 'Brand is required';
    if (!newModelModel) errors.model = 'Model is required';
    if (!newModelType) errors.type = 'Type (machine type) is required';
    if (!newModelStockType) errors.stockType = 'Stock type is required';
    if (!newModelQuantity || parseInt(newModelQuantity) < 1) {
      errors.quantity = 'Quantity must be at least 1';
    }
    if (newModelStockType === 'New' && !newModelWarrantyExpiry) {
      errors.warrantyExpiry = 'Warranty expiry date is required for new machines';
    }
    if (newModelStockType === 'Used' && !newModelCondition) {
      errors.condition = 'Condition is required for used machines';
    }
    if (!newModelLocation) errors.location = 'Storage location is required';
    
    setNewModelErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add new model to stock list
  const handleAddModel = () => {
    if (!validateNewModel()) return;

    const quantity = parseInt(newModelQuantity);
    const machines: MachineEntry[] = Array.from({ length: quantity }, (_, index) => ({
      id: `${Date.now()}-${index}`,
      serialNumber: '',
      boxNo: '',
      barcode: '',
    }));

    const newModel: StockModelEntry = {
      id: `model-${Date.now()}`,
      brand: newModelBrand,
      model: newModelModel,
      type: newModelType as MachineType,
      stockType: newModelStockType as StockType,
      quantity,
      warrantyExpiry: newModelWarrantyExpiry,
      condition: newModelCondition,
      location: newModelLocation,
      notes: newModelNotes,
      machines,
      isExpanded: true,
    };

    setStockModels([...stockModels, newModel]);
    
    // Reset form
    setNewModelBrand('');
    setNewModelModel('');
    setNewModelType('');
    setNewModelStockType('');
    setNewModelQuantity('');
    setNewModelWarrantyExpiry('');
    setNewModelCondition('');
    setNewModelLocation('');
    setNewModelNotes('');
    setNewModelErrors({});
  };

  // Remove model from stock list
  const handleRemoveModel = (modelId: string) => {
    setStockModels(stockModels.filter(m => m.id !== modelId));
  };

  // Toggle model expansion
  const handleToggleModel = (modelId: string) => {
    setStockModels(stockModels.map(m => 
      m.id === modelId ? { ...m, isExpanded: !m.isExpanded } : m
    ));
  };

  // Update machine serial number
  const handleUpdateMachineSerial = (modelId: string, machineId: string, serialNumber: string) => {
    setStockModels(stockModels.map(model => {
      if (model.id !== modelId) return model;
      
      const updatedMachines = model.machines.map(machine => {
        if (machine.id !== machineId) return machine;
        
        const barcode = generateBarcode(model.brand, model.model, serialNumber);
        const qrCodeData = serialNumber ? generateQRCodeData(model, { ...machine, serialNumber, barcode }) : undefined;
        
        return {
          ...machine,
          serialNumber,
          barcode,
          qrCodeData,
          errors: {
            ...machine.errors,
            serialNumber: serialNumber ? (validateSerialNumber(serialNumber) || undefined) : undefined,
          },
        };
      });
      
      return { ...model, machines: updatedMachines };
    }));
  };

  // Update machine box number
  const handleUpdateMachineBoxNo = (modelId: string, machineId: string, boxNo: string) => {
    setStockModels(stockModels.map(model => {
      if (model.id !== modelId) return model;
      
      const updatedMachines = model.machines.map(machine => {
        if (machine.id !== machineId) return machine;
        
        const qrCodeData = machine.serialNumber ? generateQRCodeData(model, { ...machine, boxNo }) : undefined;
        
        return {
          ...machine,
          boxNo,
          qrCodeData,
          errors: {
            ...machine.errors,
            boxNo: boxNo ? (validateBoxNumber(boxNo) || undefined) : undefined,
          },
        };
      });
      
      return { ...model, machines: updatedMachines };
    }));
  };

  // Open QR code modal
  const handleOpenQRModal = (modelId: string, machineId: string) => {
    setSelectedMachineForQR({ modelId, machineId });
    setQrModalOpen(true);
  };

  // Download QR code
  const handleDownloadQR = (modelId: string, machineId: string) => {
    const model = stockModels.find(m => m.id === modelId);
    const machine = model?.machines.find(m => m.id === machineId);
    
    if (!model || !machine || !machine.serialNumber) return;

    const refKey = `${modelId}-${machineId}`;
    const qrElement = qrCodeRefs.current[refKey];
    if (!qrElement) return;

    const svg = qrElement.querySelector('svg');
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
        link.download = `${model.brand}-${model.model}-${machine.serialNumber}-QR.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Validate all models and machines
  const validateAll = (): boolean => {
    if (stockModels.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No machine models',
        text: 'Please add at least one machine model.',
        confirmButtonColor: '#f97316',
      });
      return false;
    }

    for (const model of stockModels) {
      for (const machine of model.machines) {
        if (!machine.serialNumber) {
          Swal.fire({
            icon: 'warning',
            title: 'Serial numbers required',
            text: `Please enter serial number for all machines in ${model.brand} ${model.model}.`,
            confirmButtonColor: '#f97316',
          });
          return false;
        }
        if (machine.errors?.serialNumber) {
          Swal.fire({
            icon: 'error',
            title: 'Invalid serial number',
            text: `Invalid serial number format for ${model.brand} ${model.model}.`,
            confirmButtonColor: '#dc2626',
          });
          return false;
        }
      }
    }

    return true;
  };

  // Submit stock in: POST to API then show QR batch modal on success
  const handleSubmit = async () => {
    if (!validateAll()) return;

    setIsSubmitting(true);
    try {
      const transactionsPayload = stockModels.map((model) => ({
        brand: model.brand,
        model: model.model,
        type: model.type,
        stockType: model.stockType,
        quantity: model.quantity,
        warrantyExpiry: model.warrantyExpiry || undefined,
        condition: model.condition || undefined,
        location: model.location,
        notes: model.notes || undefined,
        transactionDate: new Date().toISOString().split('T')[0],
        performedBy: undefined,
        machines: model.machines.map((machine) => ({
          serialNumber: machine.serialNumber,
          boxNo: machine.boxNo || undefined,
          barcode: machine.barcode,
          qrCodeData: machine.qrCodeData,
        })),
      }));

      const res = await authFetch(`${API_BASE}/inventory/stock-in`, {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ transactions: transactionsPayload }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = json?.message || json?.data?.transactions?.[0] || 'Failed to process stock in. Please try again.';
        Swal.fire({
          icon: 'error',
          title: 'Failed to process stock in',
          text: typeof message === 'string' ? message : 'Failed to process stock in. Please try again.',
          confirmButtonColor: '#dc2626',
        });
        return;
      }

      setSubmittedStockModels([...stockModels]);
      setShowQrBatchModal(true);
      document.body.classList.add('qr-batch-printing');
    } catch (error: any) {
      console.error('Error processing stock in:', error);
      Swal.fire({
        icon: 'error',
        title: 'Failed to process stock in',
        text: error?.message || 'Please try again.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Flatten all machines from submitted stock models for batch print (order preserved)
  const batchMachines = useMemo(() => {
    const list: { serialNumber: string; boxNo: string; modelId: string; machineId: string }[] = [];
    submittedStockModels.forEach((model) => {
      model.machines.forEach((machine) => {
        list.push({
          serialNumber: machine.serialNumber,
          boxNo: machine.boxNo || '',
          modelId: model.id,
          machineId: machine.id,
        });
      });
    });
    return list;
  }, [submittedStockModels]);

  const performBatchPrint = (setsCount: number) => {
    if (batchMachines.length === 0) return;

    const totalLabels = batchMachines.length * setsCount;

    // Zebra: send ZPL for each label (set 1..setsCount, each set = one ZPL per machine)
    if (isBrowserPrintLoaded && selectedDevice && typeof selectedDevice.send === 'function') {
      const zplList: string[] = [];
      for (let s = 0; s < setsCount; s++) {
        batchMachines.forEach((m) => {
          zplList.push(getZPLForMachine(m.serialNumber, m.boxNo));
        });
      }
      let sent = 0;
      const sendNext = () => {
        if (sent >= zplList.length) return;
        selectedDevice.send(zplList[sent], undefined, (err: string) => {
          if (err) console.error('Print error:', err);
          sent += 1;
          if (sent < zplList.length) sendNext();
        });
      };
      sendNext();
      return;
    }

    // Browser fallback: build HTML from rendered label refs (one set), then repeat setsCount times
    const oneSetHtmlParts: string[] = [];
    batchMachines.forEach((m) => {
      const key = `${m.modelId}-${m.machineId}`;
      const el = batchLabelRefs.current[key];
      const svg = el?.querySelector('.left svg');
      if (!svg) return;
      const svgData = new XMLSerializer().serializeToString(svg);
      oneSetHtmlParts.push(`
      <div class="label">
        <div class="header">Needle Technologies</div>
        <div class="body">
          <div class="left">${svgData}</div>
          <div class="right">
            <div class="row">Serial Number:<div class="value">${m.serialNumber}</div></div>
            <div class="row">Box Number:<div class="value">${m.boxNo}</div></div>
          </div>
        </div>
      </div>
    `);
    });
    const oneSetHtml = oneSetHtmlParts.join('');
    const fullHtml = Array(setsCount).fill(oneSetHtml).join('');

    const iframe = document.createElement('iframe');
    iframe.setAttribute('style', 'position:absolute;width:0;height:0;border:0;');
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stock In – QR Labels</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; }
            .label { width: 464px; min-height: 320px; border: 2px solid #000; padding: 0; display: flex; flex-direction: column; page-break-after: always; }
            .label:last-child { page-break-after: auto; }
            .header { border-bottom: 3px solid #000; padding: 12px; text-align: center; font-weight: bold; font-size: 22px; }
            .body { display: flex; flex: 1; }
            .left { padding: 16px; }
            .right { flex: 1; padding: 16px; display: flex; flex-direction: column; justify-content: center; gap: 24px; }
            .row { font-size: 14px; color: #333; }
            .row .value { font-size: 18px; font-weight: bold; margin-top: 4px; }
          </style>
        </head>
        <body>
          ${fullHtml}
        </body>
      </html>
    `);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  };

  const handlePrintBatch = () => {
    if (batchMachines.length === 0) return;
    const totalMachines = batchMachines.length;
    Swal.fire({
      title: 'How many sets to print?',
      text: `One set = ${totalMachines} label(s) (one per machine).`,
      input: 'number',
      inputValue: 1,
      inputAttributes: { min: 1, max: 100, step: 1 },
      inputValidator: (value: string) => {
        const num = Number(value);
        if (Number.isNaN(num) || num < 1 || num > 100) return 'Please enter a number between 1 and 100';
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Print',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
    } as any).then((result: SweetAlertResult) => {
      if (result.isConfirmed && result.value !== undefined && result.value !== '') {
        const setsCount = Math.min(100, Math.max(1, Math.floor(Number(result.value))));
        const totalLabels = totalMachines * setsCount;
        performBatchPrint(setsCount);
        Swal.fire({
          title: 'Printing',
          text: `Printing ${totalLabels} label(s) (${setsCount} set(s) × ${totalMachines} machine(s))...`,
          icon: 'info',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    });
  };

  const handlePrintLater = () => {
    document.body.classList.remove('qr-batch-printing');
    setShowQrBatchModal(false);
    setSubmittedStockModels([]);
    router.push('/inventory');
  };

  // Single-machine QR modal: print one machine's label (same flow as qr-generate)
  const performSinglePrint = (serialNumber: string, boxNo: string, count: number) => {
    const zplString = getZPLForMachine(serialNumber, boxNo || '');

    if (isBrowserPrintLoaded && selectedDevice && typeof selectedDevice.send === 'function') {
      let sent = 0;
      const sendNext = () => {
        if (sent >= count) return;
        selectedDevice.send(zplString, undefined, (err: string) => {
          if (err) console.error('Print error:', err);
          sent += 1;
          if (sent < count) sendNext();
        });
      };
      sendNext();
      return;
    }

    const el = singlePrintLabelRef.current;
    const svg = el?.querySelector('.left svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const labelHtml = `
      <div class="label">
        <div class="header">Needle Technologies</div>
        <div class="body">
          <div class="left">${svgData}</div>
          <div class="right">
            <div class="row">Serial Number:<div class="value">${serialNumber}</div></div>
            <div class="row">Box Number:<div class="value">${boxNo}</div></div>
          </div>
        </div>
      </div>
    `;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('style', 'position:absolute;width:0;height:0;border:0;');
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Label - ${serialNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; }
            .label { width: 464px; min-height: 320px; border: 2px solid #000; padding: 0; display: flex; flex-direction: column; page-break-after: always; }
            .label:last-child { page-break-after: auto; }
            .header { border-bottom: 3px solid #000; padding: 12px; text-align: center; font-weight: bold; font-size: 22px; }
            .body { display: flex; flex: 1; }
            .left { padding: 16px; }
            .right { flex: 1; padding: 16px; display: flex; flex-direction: column; justify-content: center; gap: 24px; }
            .row { font-size: 14px; color: #333; }
            .row .value { font-size: 18px; font-weight: bold; margin-top: 4px; }
          </style>
        </head>
        <body>
          ${Array(count).fill(labelHtml).join('')}
        </body>
      </html>
    `);
    doc.close();
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    }, 1000);
  };

  const handlePrintSingleQR = () => {
    if (!selectedMachineForQR) return;
    const model = stockModels.find(m => m.id === selectedMachineForQR.modelId);
    const machine = model?.machines.find(m => m.id === selectedMachineForQR.machineId);
    if (!model || !machine || !machine.serialNumber) return;

    Swal.fire({
      title: 'How many QR codes to print?',
      input: 'number',
      inputValue: 1,
      inputAttributes: { min: 1, max: 100, step: 1 },
      inputValidator: (value: string) => {
        const num = Number(value);
        if (Number.isNaN(num) || num < 1 || num > 100) return 'Please enter a number between 1 and 100';
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Print',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
    } as any).then((result: SweetAlertResult) => {
      if (result.isConfirmed && result.value !== undefined && result.value !== '') {
        const count = Math.min(100, Math.max(1, Math.floor(Number(result.value))));
        performSinglePrint(machine.serialNumber, machine.boxNo || '', count);
        Swal.fire({
          title: 'Printing',
          text: `Printing ${count} QR code label${count > 1 ? 's' : ''}...`,
          icon: 'info',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    });
  };

  // Clear all
  const handleClear = () => {
    if (confirm('Are you sure you want to clear all entries? This action cannot be undone.')) {
      setStockModels([]);
      setNewModelBrand('');
      setNewModelModel('');
      setNewModelType('');
      setNewModelStockType('');
      setNewModelQuantity('');
      setNewModelWarrantyExpiry('');
      setNewModelCondition('');
      setNewModelLocation('');
      setNewModelNotes('');
      setNewModelErrors({});
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

  const totalMachines = stockModels.reduce((sum, m) => sum + m.quantity, 0);
  const completedMachines = stockModels.reduce((sum, m) => 
    sum + m.machines.filter(machine => machine.serialNumber).length, 0
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
      <Script
        src="/browser-print/BrowserPrint-3.1.250.min.js"
        strategy="afterInteractive"
        onLoad={() => setIsBrowserPrintLoaded(true)}
      />
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
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page header: back button top left */}
          <div className="flex items-center gap-4">
            <Tooltip content="Back to Inventory">
              <button
                onClick={() => router.push('/inventory')}
                className="flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors shrink-0"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            </Tooltip>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Stock In
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Add new stock to inventory with individual machine serial numbers and QR codes.
              </p>
            </div>
          </div>

          {/* Progress Summary */}
          {stockModels.length > 0 && (
            <div className="bg-blue-50 dark:bg-indigo-900/20 border border-blue-200 dark:border-indigo-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-indigo-200">
                    Progress: {completedMachines} of {totalMachines} machines completed
                  </p>
                  <div className="mt-2 w-full bg-blue-200 dark:bg-indigo-900/40 rounded-full h-2">
                    <div
                      className="bg-blue-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(completedMachines / totalMachines) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-700 dark:text-indigo-300">
                    {stockModels.length} Model{stockModels.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Add New Model Form */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Machine Model
            </h3>
            {brandsModelsLoading && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Loading brands and models...</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Brand <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={newModelBrand}
                  onChange={(value) => {
                    setNewModelBrand(value);
                    setNewModelModel('');
                  }}
                  options={brandOptions}
                  placeholder={brandsModelsLoading ? 'Loading...' : 'Select brand'}
                  disabled={brandsModelsLoading}
                  error={newModelErrors.brand}
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={newModelModel}
                  onChange={setNewModelModel}
                  options={modelOptions}
                  placeholder="Select model"
                  disabled={!newModelBrand}
                  error={newModelErrors.model}
                />
              </div>

              {/* Type (machine type: Industrial, Domestic, etc.) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={newModelType}
                  onChange={setNewModelType}
                  options={MACHINE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  placeholder="Select type"
                  disabled={!newModelBrand || !newModelModel}
                  error={newModelErrors.type}
                />
              </div>

              {/* Stock Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stock Type <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={newModelStockType}
                  onChange={setNewModelStockType}
                  options={[
                    { label: 'New (with warranty)', value: 'New' },
                    { label: 'Used', value: 'Used' },
                  ]}
                  placeholder="Select stock type"
                  error={newModelErrors.stockType}
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={newModelQuantity}
                  onChange={(e) => setNewModelQuantity(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                    newModelErrors.quantity
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-slate-600'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                  placeholder="Enter quantity"
                />
                {newModelErrors.quantity && (
                  <p className="mt-1 text-sm text-red-500">{newModelErrors.quantity}</p>
                )}
              </div>

              {/* Warranty Expiry (for New) */}
              {newModelStockType === 'New' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Warranty Expiry <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newModelWarrantyExpiry}
                    onChange={(e) => setNewModelWarrantyExpiry(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                      newModelErrors.warrantyExpiry
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-slate-600'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                  />
                  {newModelErrors.warrantyExpiry && (
                    <p className="mt-1 text-sm text-red-500">{newModelErrors.warrantyExpiry}</p>
                  )}
                </div>
              )}

              {/* Condition (for Used) */}
              {newModelStockType === 'Used' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Condition <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    value={newModelCondition}
                    onChange={setNewModelCondition}
                    options={[
                      { label: 'Excellent', value: 'Excellent' },
                      { label: 'Good', value: 'Good' },
                      { label: 'Fair', value: 'Fair' },
                      { label: 'Poor', value: 'Poor' },
                    ]}
                    placeholder="Select condition"
                    error={newModelErrors.condition}
                  />
                </div>
              )}

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Storage Location <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={newModelLocation}
                  onChange={setNewModelLocation}
                  options={[
                    { label: 'Main Warehouse', value: 'Main Warehouse' },
                    { label: 'Branch Office 1', value: 'Branch Office 1' },
                    { label: 'Branch Office 2', value: 'Branch Office 2' },
                    { label: 'Storage Facility', value: 'Storage Facility' },
                  ]}
                  placeholder="Select location"
                  error={newModelErrors.location}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={newModelNotes}
                onChange={(e) => setNewModelNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
                placeholder="Enter any additional notes"
              />
            </div>

            {/* Add Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleAddModel}
                className="px-6 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Model
              </button>
            </div>
          </div>

          {/* Stock Models List */}
          {stockModels.length > 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Machine Models ({stockModels.length})
                </h3>
              </div>

              {stockModels.map((model) => {
                const completedCount = model.machines.filter(m => m.serialNumber).length;
                const isComplete = completedCount === model.quantity;

                return (
                  <div
                    key={model.id}
                    className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700"
                  >
                    {/* Model Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <button
                            onClick={() => handleToggleModel(model.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                          >
                            {model.isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            )}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {model.brand} {model.model}
                              </h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                model.type === 'Industrial'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                  : model.type === 'Domestic'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              }`}>
                                {model.type}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                model.stockType === 'New'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                  : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                              }`}>
                                {model.stockType}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span>Quantity: {model.quantity}</span>
                              <span>Location: {model.location}</span>
                              <span className={isComplete ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
                                {completedCount}/{model.quantity} completed
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveModel(model.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Machines List */}
                    {model.isExpanded && (
                      <div className="p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {model.machines.map((machine, index) => {
                            const hasSerial = !!machine.serialNumber;
                            const canGenerateQR = hasSerial;

                            return (
                              <div
                                key={machine.id}
                                className={`p-4 border rounded-lg ${
                                  hasSerial
                                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                                    : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className="font-medium text-gray-900 dark:text-white">
                                    Machine #{index + 1}
                                  </h5>
                                  {canGenerateQR && (
                                    <button
                                      onClick={() => handleOpenQRModal(model.id, machine.id)}
                                      className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                    >
                                      <QrCode className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>

                                <div className="space-y-3">
                                  {/* Serial Number */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Serial Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      value={machine.serialNumber}
                                      onChange={(e) => handleUpdateMachineSerial(model.id, machine.id, e.target.value)}
                                      className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                                        machine.errors?.serialNumber
                                          ? 'border-red-500'
                                          : 'border-gray-300 dark:border-slate-600'
                                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                                      placeholder="Enter serial number"
                                    />
                                    {machine.errors?.serialNumber && (
                                      <p className="mt-1 text-xs text-red-500">{machine.errors.serialNumber}</p>
                                    )}
                                  </div>

                                  {/* Box Number */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                      Box Number (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      value={machine.boxNo}
                                      onChange={(e) => handleUpdateMachineBoxNo(model.id, machine.id, e.target.value)}
                                      className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                                        machine.errors?.boxNo
                                          ? 'border-red-500'
                                          : 'border-gray-300 dark:border-slate-600'
                                      } focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500`}
                                      placeholder="Enter box number"
                                    />
                                    {machine.errors?.boxNo && (
                                      <p className="mt-1 text-xs text-red-500">{machine.errors.boxNo}</p>
                                    )}
                                  </div>

                                  {/* Barcode Preview */}
                                  {machine.barcode && (
                                    <div className="pt-2 border-t border-gray-200 dark:border-slate-600">
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Barcode:</p>
                                      <p className="text-xs font-mono text-gray-900 dark:text-white">
                                        {machine.barcode}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || completedMachines !== totalMachines}
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 dark:bg-green-700 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : `Submit Stock In (${totalMachines} machines)`}
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {stockModels.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Machine Models Added
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Start by adding a machine model above to begin the stock-in process.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* QR Code Modal (single machine) */}
      {qrModalOpen && selectedMachineForQR && (() => {
        const model = stockModels.find(m => m.id === selectedMachineForQR.modelId);
        const machine = model?.machines.find(m => m.id === selectedMachineForQR.machineId);
        
        if (!model || !machine || !machine.serialNumber) return null;

        const refKey = `${selectedMachineForQR.modelId}-${selectedMachineForQR.machineId}`;
        const qrData = machine.qrCodeData || generateQRCodeData(model, machine);

        return (
          <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    Machine QR Code
                  </h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {model.brand} {model.model} - {machine.serialNumber}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setQrModalOpen(false);
                    setSelectedMachineForQR(null);
                  }}
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
                      ref={(el) => {
                        qrCodeRefs.current[refKey] = el;
                      }}
                      className="bg-white dark:bg-white p-6 rounded-lg border-2 border-gray-200 dark:border-gray-300 shadow-lg"
                    >
                      <QRCodeSVG
                        value={qrData}
                        size={300}
                        level="H"
                        includeMargin={true}
                      />
                    </div>

                    {/* Machine Info Summary */}
                    <div className="w-full bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                        Machine Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Brand:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">
                            {model.brand}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Model:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">
                            {model.model}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Serial No:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-medium">
                            {machine.serialNumber}
                          </span>
                        </div>
                        {machine.boxNo && (
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Box No:</span>
                            <span className="ml-2 text-gray-900 dark:text-white font-medium">
                              {machine.boxNo}
                            </span>
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <span className="text-gray-500 dark:text-gray-400">Barcode:</span>
                          <span className="ml-2 text-gray-900 dark:text-white font-medium font-mono text-xs">
                            {machine.barcode}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Label preview for printing (same format as qr-generate) */}
                    <div
                      ref={singlePrintLabelRef}
                      className="label mx-auto w-[464px] min-h-[320px] border-2 border-black bg-white dark:bg-slate-900 flex flex-col overflow-hidden rounded"
                    >
                      <div className="header border-b-2 border-black py-2 text-center font-bold text-lg text-gray-900 dark:text-white">
                        Needle Technologies
                      </div>
                      <div className="body flex flex-1 p-4 gap-6">
                        <div className="left flex items-center justify-center shrink-0 p-2 bg-white dark:bg-slate-800 rounded">
                          <QRCodeSVG
                            value={getQRPayloadForLabel(machine.serialNumber, machine.boxNo || '')}
                            size={180}
                            level="H"
                          />
                        </div>
                        <div className="right flex flex-col justify-center gap-6 text-gray-900 dark:text-white">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Serial Number:</p>
                            <p className="text-xl font-bold mt-0.5">{machine.serialNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Box Number:</p>
                            <p className="text-xl font-bold mt-0.5">{machine.boxNo || '—'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Select Printer — same as qr-generate page */}
                    <div className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50 p-4 space-y-2">
                      <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                        Select Printer
                      </label>
                      <select
                        value={selectedDevice?.uid ?? ''}
                        onChange={(e) => {
                          const uid = e.target.value;
                          if (uid) setSelectedDevice(devices.find((d: any) => d.uid === uid) ?? null);
                        }}
                        className="w-full rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm font-medium focus:border-blue-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-indigo-500/20 outline-none"
                      >
                        {!isBrowserPrintLoaded ? (
                          <option value="" disabled>Loading printers...</option>
                        ) : devices.length > 0 ? (
                          devices.map((d: any, i: number) => (
                            <option key={d.uid ?? i} value={d.uid}>
                              {[d.name, d.manufacturer, d.model].filter(Boolean).join(' — ') || d.uid || `Printer ${i + 1}`}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>
                            No printers available — connect a printer or start Browser Print service
                          </option>
                        )}
                      </select>
                      {isBrowserPrintLoaded && devices.length === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Ensure the Browser Print service is running on this machine. Refresh after connecting a printer.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handlePrintSingleQR}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors duration-200"
                      >
                        <Printer className="w-4 h-4" />
                        Print
                      </button>
                      <button
                        onClick={() => handleDownloadQR(selectedMachineForQR.modelId, selectedMachineForQR.machineId)}
                        className="inline-flex items-center px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors duration-200"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download QR Code
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* QR Batch Modal: after submit – same label format as qr-generate, batch sets printing */}
      {showQrBatchModal && submittedStockModels.length > 0 && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Stock In Successful – Print QR Labels
                </h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {batchMachines.length} machine(s). One set = one label per machine. Choose how many sets to print.
                </p>
              </div>
              <button
                onClick={handlePrintLater}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
              {/* Label preview(s): same format as qr-generate (Needle Technologies header, QR left, S/N & B/N right) */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Label preview (one per machine)
                </label>
                <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                  {submittedStockModels.map((model) =>
                    model.machines.map((machine) => {
                      const key = `${model.id}-${machine.id}`;
                      const payload = getQRPayloadForLabel(machine.serialNumber, machine.boxNo || '');
                      return (
                        <div
                          key={key}
                          ref={(el) => {
                            batchLabelRefs.current[key] = el;
                          }}
                          className="label mx-auto w-[464px] min-h-[320px] border-2 border-black bg-white dark:bg-slate-900 flex flex-col overflow-hidden rounded shrink-0"
                        >
                          <div className="header border-b-2 border-black py-2 text-center font-bold text-lg text-gray-900 dark:text-white">
                            Needle Technologies
                          </div>
                          <div className="body flex flex-1 p-4 gap-6">
                            <div className="left flex items-center justify-center shrink-0 p-2 bg-white dark:bg-slate-800 rounded">
                              <QRCodeSVG value={payload} size={180} level="H" />
                            </div>
                            <div className="right flex flex-col justify-center gap-6 text-gray-900 dark:text-white">
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Serial Number:</p>
                                <p className="text-xl font-bold mt-0.5">{machine.serialNumber}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Box Number:</p>
                                <p className="text-xl font-bold mt-0.5">{machine.boxNo || '—'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              {/* Select Printer — same as qr-generate page */}
              <div className="rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800/50 p-4 space-y-2">
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Select Printer
                </label>
                <select
                  value={selectedDevice?.uid ?? ''}
                  onChange={(e) => {
                    const uid = e.target.value;
                    if (uid) setSelectedDevice(devices.find((d: any) => d.uid === uid) ?? null);
                  }}
                  className="w-full rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white px-3 py-2.5 text-sm font-medium focus:border-blue-500 dark:focus:border-indigo-500 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-indigo-500/20 outline-none"
                >
                  {!isBrowserPrintLoaded ? (
                    <option value="" disabled>Loading printers...</option>
                  ) : devices.length > 0 ? (
                    devices.map((d: any, i: number) => (
                      <option key={d.uid ?? i} value={d.uid}>
                        {[d.name, d.manufacturer, d.model].filter(Boolean).join(' — ') || d.uid || `Printer ${i + 1}`}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      No printers available — connect a printer or start Browser Print service
                    </option>
                  )}
                </select>
                {isBrowserPrintLoaded && devices.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Ensure the Browser Print service is running on this machine. Refresh after connecting a printer.
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={handlePrintLater}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                >
                  Print Later
                </button>
                <button
                  type="button"
                  onClick={handlePrintBatch}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockInPage;