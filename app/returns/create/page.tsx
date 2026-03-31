'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import QRScannerComponent from '@/src/components/qr-scanner';
import {
  X,
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  FileText,
  Search,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ImagePlus,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Swal } from '@/src/lib/swal';

type ReturnCondition = 'Good' | 'Standard' | 'Damage' | 'Missing' | 'Exchange';

interface RentalAgreementMachine {
  id: string;
  model: string;
  serialNumber: string;
  boxNumber: string;
  description: string;
}

interface RentalAgreement {
  id: string;
  customerName: string;
  customerAddress: string;
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
  machines: RentalAgreementMachine[];
}

interface MachineReturnState extends RentalAgreementMachine {
  scanned: boolean;
  returnType?: ReturnCondition;
  damageNote?: string;
  photos?: File[];
  photoPreviews?: string[];
}

interface CreatedReturnPayload {
  id: number;
  returnNumber: string;
  agreementId: string;
  createdAt: string;
  createdBy: string;
  customerName: string;
  totalMachines: number;
  machines: Array<{
    serialNumber: string;
    boxNumber: string;
    model: string;
    description: string;
    returnType: ReturnCondition;
    damageNote?: string;
    photosCount?: number;
  }>;
}

// --- QR helpers (same as gatepass) ---
function normalizeSerial(input: string): string {
  return (input || '').trim().toUpperCase();
}

function pairKey(serial: string, box: string): string {
  return `${normalizeSerial(serial)}|${normalizeSerial(box)}`;
}

function extractSerialAndBoxFromQR(decodedText: string): { serial: string; box: string } | null {
  const raw = (decodedText || '').trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const serialCandidates = [
        parsed.serialNo,
        parsed.serialNO,
        parsed.serial,
        parsed.serialNumber,
        parsed.SerialNo,
        parsed.machineSerial,
        parsed.machineSerialNo,
      ].filter((v: unknown) => typeof v === 'string' && (v as string).trim().length > 0);
      const boxCandidates = [
        parsed.motorBoxNo,
        parsed.boxNo,
        parsed.boxNumber,
        parsed.MotorBoxNo,
        parsed.BoxNo,
        parsed.box,
      ].filter((v: unknown) => typeof v === 'string' && (v as string).trim().length > 0);
      const serial = serialCandidates.length > 0 ? (serialCandidates[0] as string).trim() : '';
      const box = boxCandidates.length > 0 ? (boxCandidates[0] as string).trim() : '';
      if (serial || box) return { serial, box: box || '' };
    }
  } catch {
    // ignore
  }
  const serialMatch = raw.match(/serial\s*(no|number)?\s*[:\-=]\s*([A-Za-z0-9\-_/]+)/i);
  const boxMatch = raw.match(/(?:motor)?\s*box\s*(no|number)?\s*[:\-=]\s*([A-Za-z0-9\-_/]+)/i);
  const serial = serialMatch ? serialMatch[2].trim() : '';
  const box = boxMatch ? boxMatch[2].trim() : '';
  if (serial || box) return { serial, box: box || '' };
  return null;
}

function extractSerialFromQR(decodedText: string): string {
  const result = extractSerialAndBoxFromQR(decodedText);
  return result ? result.serial : '';
}

// --- Mock data (with box numbers) ---
const mockRentalAgreements: RentalAgreement[] = [
  {
    id: 'AGR-2024-001',
    customerName: 'ABC Holdings (Pvt) Ltd',
    customerAddress: '123 Main Street, Colombo 05',
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
    machines: [
      {
        id: 'MACH-001-01',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-001',
        boxNumber: 'BOX-CAT320-001',
        description: 'Excavator CAT 320 - Unit 01',
      },
      {
        id: 'MACH-001-02',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-002',
        boxNumber: 'BOX-CAT320-002',
        description: 'Excavator CAT 320 - Unit 02',
      },
      {
        id: 'MACH-001-03',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-003',
        boxNumber: 'BOX-CAT320-003',
        description: 'Excavator CAT 320 - Unit 03',
      },
      {
        id: 'MACH-001-04',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-004',
        boxNumber: 'BOX-CAT320-004',
        description: 'Excavator CAT 320 - Unit 04',
      },
      {
        id: 'MACH-001-05',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-005',
        boxNumber: 'BOX-CAT320-005',
        description: 'Excavator CAT 320 - Unit 05',
      },
      {
        id: 'MACH-002-01',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-001',
        boxNumber: 'BOX-CATD6-001',
        description: 'Bulldozer CAT D6 - Unit 01',
      },
      {
        id: 'MACH-002-02',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-002',
        boxNumber: 'BOX-CATD6-002',
        description: 'Bulldozer CAT D6 - Unit 02',
      },
      {
        id: 'MACH-002-03',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-003',
        boxNumber: 'BOX-CATD6-003',
        description: 'Bulldozer CAT D6 - Unit 03',
      },
      {
        id: 'MACH-002-04',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-004',
        boxNumber: 'BOX-CATD6-004',
        description: 'Bulldozer CAT D6 - Unit 04',
      },
      {
        id: 'MACH-002-05',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-005',
        boxNumber: 'BOX-CATD6-005',
        description: 'Bulldozer CAT D6 - Unit 05',
      },
    ],
  },
  {
    id: 'AGR-2024-002',
    customerName: 'Mega Constructions',
    customerAddress: '654 High Level Road, Maharagama',
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
    machines: [
      {
        id: 'MACH-010-01',
        model: 'Loader CAT 950',
        serialNumber: 'SN-CAT950-2022-001',
        boxNumber: 'BOX-CAT950-001',
        description: 'Loader CAT 950 - Unit 01',
      },
      {
        id: 'MACH-010-02',
        model: 'Loader CAT 950',
        serialNumber: 'SN-CAT950-2022-002',
        boxNumber: 'BOX-CAT950-002',
        description: 'Loader CAT 950 - Unit 02',
      },
      {
        id: 'MACH-010-03',
        model: 'Loader CAT 950',
        serialNumber: 'SN-CAT950-2022-003',
        boxNumber: 'BOX-CAT950-003',
        description: 'Loader CAT 950 - Unit 03',
      },
      {
        id: 'MACH-010-04',
        model: 'Loader CAT 950',
        serialNumber: 'SN-CAT950-2022-004',
        boxNumber: 'BOX-CAT950-004',
        description: 'Loader CAT 950 - Unit 04',
      },
    ],
  },
];

// --- Component ---

const ReturnsCreatePage: React.FC = () => {
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Step 1: Enter agreement number
  const [step, setStep] = useState<1 | 2>(1);
  const [agreementNumberInput, setAgreementNumberInput] = useState('');
  const [agreementError, setAgreementError] = useState<string | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreement | null>(null);

  // All machines with return state (flat)
  const [machines, setMachines] = useState<MachineReturnState[]>([]);
  // Group by model for step 2
  const machinesByModel = useMemo(() => {
    const map = new Map<string, MachineReturnState[]>();
    machines.forEach((m) => {
      const list = map.get(m.model) || [];
      list.push(m);
      map.set(m.model, list);
    });
    return Array.from(map.entries()).map(([model, list]) => ({ model, machines: list }));
  }, [machines]);

  // Step 2: current model index (0, 1, ...)
  const [currentModelIndex, setCurrentModelIndex] = useState(0);
  const currentModelGroup = machinesByModel[currentModelIndex] ?? null;
  const currentModelMachines = currentModelGroup?.machines ?? [];

  // Selected machine (index within current model's machines) for editing return type / photos
  const [selectedMachineIndexInModel, setSelectedMachineIndexInModel] = useState<number | null>(null);

  const [scannerKey, setScannerKey] = useState(1);
  const [scannerExpanded, setScannerExpanded] = useState(false);
  type ScanResultType = 'success' | 'failed' | 'duplicate';
  const [lastFeedback, setLastFeedback] = useState<{
    type: ScanResultType;
    title: string;
    message: string;
  } | null>(null);
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      machines.forEach((m) => {
        m.photoPreviews?.forEach((p) => URL.revokeObjectURL(p));
      });
    };
  }, []);

  const totalMachines = machines.length;
  const scannedCount = useMemo(
    () => machines.filter((m) => m.scanned).length,
    [machines]
  );
  const currentModelScanned = useMemo(
    () => currentModelMachines.filter((m) => m.scanned).length,
    [currentModelMachines]
  );
  const currentModelTotal = currentModelMachines.length;
  const allModelsDone = useMemo(() => {
    if (machinesByModel.length === 0) return false;
    return machinesByModel.every((g) =>
      g.machines.every((m) => m.scanned && m.returnType != null)
    );
  }, [machinesByModel]);
  const canSubmit = allModelsDone && !isSubmitting;

  const showFeedback = (fb: { type: ScanResultType; title: string; message: string }) => {
    setLastFeedback(fb);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setLastFeedback(null), 2500);
  };

  const restartScannerSoon = () => {
    setTimeout(() => setScannerKey((k) => k + 1), 450);
  };

  const updateMachineByGlobalIndex = (
    globalIndex: number,
    updater: (m: MachineReturnState) => MachineReturnState
  ) => {
    setMachines((prev) =>
      prev.map((m, i) => (i === globalIndex ? updater(m) : m))
    );
  };

  const updateCurrentModelMachine = (indexInModel: number, updater: (m: MachineReturnState) => MachineReturnState) => {
    if (!currentModelGroup) return;
    const m = currentModelGroup.machines[indexInModel];
    const globalIndex = machines.findIndex((x) => x.id === m.id);
    if (globalIndex >= 0) updateMachineByGlobalIndex(globalIndex, updater);
  };

  const resetAll = () => {
    machines.forEach((m) => m.photoPreviews?.forEach((p) => URL.revokeObjectURL(p)));
    setStep(1);
    setAgreementNumberInput('');
    setAgreementError(null);
    setSelectedAgreement(null);
    setMachines([]);
    setCurrentModelIndex(0);
    setSelectedMachineIndexInModel(null);
    setScannerKey((k) => k + 1);
    setLastFeedback(null);
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    resetAll();
    router.push('/returns');
  };

  // --- Step 1: Find agreement ---
  const handleFindAgreement = () => {
    const input = agreementNumberInput.trim();
    setAgreementError(null);
    if (!input) {
      setAgreementError('Please enter the rental agreement number.');
      return;
    }
    const agreement = mockRentalAgreements.find(
      (a) => a.id.toLowerCase() === input.toLowerCase()
    );
    if (!agreement) {
      setAgreementError('Agreement not found. Please check the number.');
      setSelectedAgreement(null);
      setMachines([]);
      return;
    }
    const initialMachines: MachineReturnState[] = agreement.machines.map((m) => ({
      ...m,
      scanned: false,
      returnType: undefined,
      damageNote: '',
      photos: [],
      photoPreviews: [],
    }));
    setSelectedAgreement(agreement);
    setMachines(initialMachines);
    setCurrentModelIndex(0);
    setSelectedMachineIndexInModel(null);
    setScannerKey((k) => k + 1);
  };

  const handleContinueToReturns = () => {
    if (!selectedAgreement || machines.length === 0) return;
    setStep(2);
    setCurrentModelIndex(0);
    setSelectedMachineIndexInModel(null);
  };

  // --- Step 2: QR scan (only for current model) ---
  const expectedSerialsForCurrentModel = useMemo(() => {
    const s = new Set<string>();
    currentModelMachines.forEach((m) => {
      const serial = normalizeSerial(m.serialNumber);
      if (serial) s.add(serial);
    });
    return s;
  }, [currentModelMachines]);

  const handleScanSuccess = (decodedText: string) => {
    if (currentModelMachines.length === 0) return;

    const parsed = extractSerialAndBoxFromQR(decodedText);
    const serialNorm = parsed?.serial ? normalizeSerial(parsed.serial) : '';
    if (!serialNorm) {
      showFeedback({
        type: 'failed',
        title: 'Scan failed',
        message: 'Could not read serial number from QR.',
      });
      restartScannerSoon();
      return;
    }

    const globalIndex = machines.findIndex(
      (m) =>
        normalizeSerial(m.serialNumber) === serialNorm ||
        (parsed?.box && pairKey(m.serialNumber, m.boxNumber) === pairKey(parsed.serial, parsed.box))
    );

    if (globalIndex === -1) {
      showFeedback({
        type: 'failed',
        title: 'Not in this agreement',
        message: `Serial ${serialNorm} is not in this return.`,
      });
      restartScannerSoon();
      return;
    }

    const machine = machines[globalIndex];
    if (machine.model !== currentModelGroup?.model) {
      showFeedback({
        type: 'failed',
        title: 'Wrong model',
        message: 'This machine belongs to another model. Switch model or scan the correct machine.',
      });
      restartScannerSoon();
      return;
    }

    if (machine.scanned) {
      const idxInModel = currentModelMachines.findIndex((m) => m.id === machine.id);
      setSelectedMachineIndexInModel(idxInModel >= 0 ? idxInModel : null);
      showFeedback({
        type: 'duplicate',
        title: 'Already scanned',
        message: `${serialNorm} was already scanned. You can change return type below.`,
      });
      restartScannerSoon();
      return;
    }

    updateMachineByGlobalIndex(globalIndex, (m) => ({
      ...m,
      scanned: true,
      returnType: m.returnType ?? 'Good',
    }));
    const idxInModel = currentModelMachines.findIndex((m) => m.id === machine.id);
    setSelectedMachineIndexInModel(idxInModel >= 0 ? idxInModel : null);

    showFeedback({
      type: 'success',
      title: 'Matched',
      message: `${serialNorm} recorded. Set return type below.`,
    });
    restartScannerSoon();
  };

  const handleReturnTypeChange = (indexInModel: number, type: ReturnCondition) => {
    updateCurrentModelMachine(indexInModel, (m) => ({
      ...m,
      scanned: true,
      returnType: type,
    }));
  };

  const handleDamageNoteChange = (indexInModel: number, note: string) => {
    updateCurrentModelMachine(indexInModel, (m) => ({ ...m, damageNote: note }));
  };

  const handlePhotoUpload = (indexInModel: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    updateCurrentModelMachine(indexInModel, (m) => {
      const existingPreviews = m.photoPreviews || [];
      const newPreviews = fileArray.map((f) => URL.createObjectURL(f));
      return {
        ...m,
        photos: [...(m.photos || []), ...fileArray],
        photoPreviews: [...existingPreviews, ...newPreviews],
      };
    });
  };

  const handleRemovePhoto = (indexInModel: number, photoIndex: number) => {
    updateCurrentModelMachine(indexInModel, (m) => {
      const photos = m.photos ? [...m.photos] : [];
      const previews = m.photoPreviews ? [...m.photoPreviews] : [];
      if (previews[photoIndex]) URL.revokeObjectURL(previews[photoIndex]);
      photos.splice(photoIndex, 1);
      previews.splice(photoIndex, 1);
      return { ...m, photos, photoPreviews: previews };
    });
  };

  const handleNextModel = () => {
    if (currentModelIndex < machinesByModel.length - 1) {
      setCurrentModelIndex((i) => i + 1);
      setSelectedMachineIndexInModel(null);
      setScannerKey((k) => k + 1);
    }
  };

  const handlePrevModel = () => {
    if (currentModelIndex > 0) {
      setCurrentModelIndex((i) => i - 1);
      setSelectedMachineIndexInModel(null);
      setScannerKey((k) => k + 1);
    }
  };

  const generateReturnNumber = (): string => {
    return `RET-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(4, '0')}`;
  };

  const handleSubmitReturn = async () => {
    if (!selectedAgreement || !canSubmit) return;

    for (const m of machines) {
      if (!m.returnType) {
        Swal.fire({
          icon: 'warning',
          title: 'Missing return type',
          text: `Please set return type for machine ${m.serialNumber}.`,
          confirmButtonColor: '#f97316',
        });
        return;
      }
      if (
        (m.returnType === 'Damage' || m.returnType === 'Missing') &&
        (!m.damageNote?.trim() || !m.photos?.length)
      ) {
        Swal.fire({
          icon: 'warning',
          title: 'Details required',
          text: `For ${m.serialNumber} (${m.returnType}): please add a note and at least one photo.`,
          confirmButtonColor: '#f97316',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: CreatedReturnPayload = {
        id: Date.now(),
        returnNumber: generateReturnNumber(),
        agreementId: selectedAgreement.id,
        createdAt: new Date().toISOString(),
        createdBy: 'Current User',
        customerName: selectedAgreement.customerName,
        totalMachines: machines.length,
        machines: machines.map((m) => ({
          serialNumber: m.serialNumber,
          boxNumber: m.boxNumber,
          model: m.model,
          description: m.description,
          returnType: m.returnType as ReturnCondition,
          damageNote:
            m.returnType === 'Damage' || m.returnType === 'Missing' ? m.damageNote : undefined,
          photosCount:
            m.returnType === 'Damage' || m.returnType === 'Missing'
              ? (m.photos || []).length
              : undefined,
        })),
      };
      console.log('Return payload:', payload);
      await new Promise((r) => setTimeout(r, 800));
      Swal.fire({
        icon: 'success',
        title: 'Return created',
        text: `Return ${payload.returnNumber} created successfully.`,
        confirmButtonColor: '#16a34a',
      });
      resetAll();
      router.push('/returns');
    } catch (e) {
      console.error(e);
      Swal.fire({
        icon: 'error',
        title: 'Failed to create return',
        text: 'Please try again.',
        confirmButtonColor: '#dc2626',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render helpers ---
  const renderScanFeedback = () => {
    if (!lastFeedback) return null;
    const styles =
      lastFeedback.type === 'success'
        ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200'
        : lastFeedback.type === 'duplicate'
          ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-200'
          : 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200';
    return (
      <div className={`p-3 rounded-lg border text-sm ${styles}`}>
        <div className="font-semibold">{lastFeedback.title}</div>
        <div className="text-xs mt-0.5">{lastFeedback.message}</div>
      </div>
    );
  };

  const renderSelectedMachineEditor = () => {
    if (
      currentModelGroup == null ||
      selectedMachineIndexInModel == null ||
      selectedMachineIndexInModel < 0 ||
      selectedMachineIndexInModel >= currentModelMachines.length
    ) {
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Scan a machine or click a row to set return type and add photos (for damage/missing).
        </p>
      );
    }

    const machine = currentModelMachines[selectedMachineIndexInModel];
    const isDamage = machine.returnType === 'Damage' || machine.returnType === 'Missing';
    const uploadId = `photo-upload-${machine.id}`;
    const cameraId = `photo-camera-${machine.id}`;

    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Serial: <span className="font-mono text-gray-900 dark:text-white">{machine.serialNumber}</span>
            {' · '}
            Box: <span className="font-mono text-gray-900 dark:text-white">{machine.boxNumber}</span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Return type
          </label>
          <div className="flex flex-wrap gap-2">
            {(['Good', 'Standard', 'Damage', 'Missing', 'Exchange'] as ReturnCondition[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleReturnTypeChange(selectedMachineIndexInModel, type)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    machine.returnType === type
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-200'
                      : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                  }`}
                >
                  {type}
                </button>
              )
            )}
          </div>
        </div>

        {isDamage && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note (required for damage/missing)
              </label>
              <textarea
                value={machine.damageNote || ''}
                onChange={(e) => handleDamageNoteChange(selectedMachineIndexInModel, e.target.value)}
                rows={2}
                placeholder="Describe the damage or missing parts..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Photos (required)
              </label>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id={uploadId}
                onChange={(e) => handlePhotoUpload(selectedMachineIndexInModel, e.target.files)}
              />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                id={cameraId}
                onChange={(e) => handlePhotoUpload(selectedMachineIndexInModel, e.target.files)}
              />
              <div className="flex gap-2">
                <label
                  htmlFor={cameraId}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <Camera className="w-4 h-4" />
                  Take photo
                </label>
                <label
                  htmlFor={uploadId}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <ImagePlus className="w-4 h-4" />
                  Upload
                </label>
              </div>
              {machine.photoPreviews && machine.photoPreviews.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {machine.photoPreviews.map((src, idx) => (
                    <div key={idx} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`Proof ${idx + 1}`}
                        className="w-full h-16 object-cover rounded border border-gray-200 dark:border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(selectedMachineIndexInModel, idx)}
                        className="absolute top-0.5 right-0.5 p-1 rounded bg-red-500 text-white opacity-90 hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
      <Navbar onMenuClick={() => setIsMobileSidebarOpen((p) => !p)} />
      <Sidebar
        onLogout={() => {}}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
        onExpandedChange={setIsSidebarExpanded}
      />

      <main
        className={`pt-28 lg:pt-32 px-4 sm:px-6 pb-6 transition-all duration-300 ${
          isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
        }`}
      >
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              Create Return
            </h1>
            <button
              onClick={handleCancel}
              className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Back
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'
              }`}
            >
              {step > 1 ? <CheckCircle2 className="w-4 h-4" /> : 1}
            </span>
            <span className={step >= 1 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500'}>
              Enter agreement number
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span
              className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'
              }`}
            >
              {step > 2 ? <CheckCircle2 className="w-4 h-4" /> : 2}
            </span>
            <span className={step >= 2 ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500'}>
              Scan & return details
            </span>
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Enter rental agreement number
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Type the agreement number and click Find. Then continue to scan machines.
              </p>
              <div className="max-w-md space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={agreementNumberInput}
                      onChange={(e) => {
                        setAgreementNumberInput(e.target.value);
                        setAgreementError(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleFindAgreement()}
                      placeholder="e.g. AGR-2024-001"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleFindAgreement}
                    className="px-4 py-2.5 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Find
                  </button>
                </div>
                {agreementError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{agreementError}</p>
                )}
              </div>

              {selectedAgreement && (
                <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Agreement found: {selectedAgreement.id}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {selectedAgreement.customerName} · {machinesByModel.length} model
                    {machinesByModel.length !== 1 ? 's' : ''}, {totalMachines} machine
                    {totalMachines !== 1 ? 's' : ''}
                  </p>
                  <button
                    type="button"
                    onClick={handleContinueToReturns}
                    className="mt-4 px-4 py-2 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 flex items-center gap-2"
                  >
                    Continue to scan & return
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && selectedAgreement && (
            <div className="space-y-4">
              {/* Model navigation */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePrevModel}
                      disabled={currentModelIndex === 0}
                      className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Model {currentModelIndex + 1} of {machinesByModel.length}: {currentModelGroup?.model ?? ''}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextModel}
                      disabled={currentModelIndex >= machinesByModel.length - 1}
                      className="p-2 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-700"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Scanned {currentModelScanned} of {currentModelTotal} in this model
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {/* Left: machine list + Return type & proof */}
                <div className="space-y-4 min-w-0">
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Machines – {currentModelGroup?.model}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Serial number and box number. Scan QR or click a row to set return type.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-slate-700/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                              #
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                              Serial number
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                              Box number
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 w-20">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                          {currentModelMachines.map((m, idx) => (
                            <tr
                              key={m.id}
                              onClick={() => setSelectedMachineIndexInModel(idx)}
                              className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                                selectedMachineIndexInModel === idx
                                  ? 'bg-blue-50 dark:bg-indigo-900/20'
                                  : ''
                              }`}
                            >
                              <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{idx + 1}</td>
                              <td className="px-3 py-2 font-mono text-gray-900 dark:text-white">
                                {m.serialNumber}
                              </td>
                              <td className="px-3 py-2 font-mono text-gray-900 dark:text-white">
                                {m.boxNumber}
                              </td>
                              <td className="px-3 py-2">
                                {m.scanned ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Done
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Pending</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {renderScanFeedback()}

                  {/* Return type & proof – below machine list on the left */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Return type & proof
                    </h3>
                    {renderSelectedMachineEditor()}
                  </div>
                </div>

                {/* Right: Scan QR code – fixed compact height for balanced layout */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col shrink-0">
                  <div className="px-3 sm:px-4 py-2.5 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      Scan QR code
                    </span>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setScannerExpanded(true)}
                        className="p-2 sm:p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-400 transition-colors touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                        title="Expand to full screen"
                        aria-label="Expand scanner to full screen"
                      >
                        <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setScannerKey((k) => k + 1)}
                        className="p-2 sm:p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 transition-colors touch-manipulation min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                        title="Restart scanner"
                        aria-label="Restart scanner"
                      >
                        <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="h-[280px] sm:h-[300px] w-full overflow-hidden flex flex-col">
                    {scannerExpanded ? (
                      <div className="h-full flex flex-col items-center justify-center gap-2 p-4 bg-gray-100 dark:bg-slate-700/50 text-center">
                        <Maximize2 className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto" />
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Scanner in full screen
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Tap Collapse above or in the overlay to return
                        </p>
                      </div>
                    ) : (
                      <QRScannerComponent
                        key={scannerKey}
                        onScanSuccess={handleScanSuccess}
                        autoClose={false}
                        showCloseButton={false}
                        title="Scan machine QR"
                        subtitle={`${currentModelScanned}/${currentModelTotal} scanned in this model`}
                      />
                    )}
                  </div>
                </div>

                {/* Full-screen scanner overlay – mobile responsive */}
                {scannerExpanded && (
                  <div className="fixed inset-0 z-[100] flex flex-col bg-gray-900 safe-area-inset h-full max-h-[100dvh]">
                    <div className="flex-1 min-h-0 w-full overflow-auto overscroll-contain">
                      <QRScannerComponent
                        key={`${scannerKey}-fullscreen`}
                        onScanSuccess={(decoded) => {
                          handleScanSuccess(decoded);
                          setScannerExpanded(false);
                        }}
                        onClose={() => setScannerExpanded(false)}
                        autoClose={false}
                        showCloseButton={true}
                        title="Scan machine QR"
                        subtitle={`${currentModelScanned}/${currentModelTotal} scanned in this model`}
                      />
                    </div>
                    <div className="shrink-0 p-3 sm:p-4 bg-black/60 border-t border-white/10 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setScannerExpanded(false)}
                        className="flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-2.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium touch-manipulation min-h-[44px]"
                        aria-label="Collapse scanner"
                      >
                        <Minimize2 className="w-5 h-5 sm:w-4 sm:h-4" />
                        <span>Collapse</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom: back, next model, submit – mobile touch-friendly */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 sm:py-2 min-h-[44px] text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-2 touch-manipulation"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to agreement
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {currentModelIndex < machinesByModel.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleNextModel}
                      className="px-4 py-3 sm:py-2 min-h-[44px] text-sm font-medium text-blue-600 dark:text-indigo-400 border border-blue-600 dark:border-indigo-500 rounded-lg hover:bg-blue-50 dark:hover:bg-indigo-900/20 flex items-center gap-2 touch-manipulation"
                    >
                      Next model
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleSubmitReturn}
                    disabled={!canSubmit}
                    className={`px-5 py-3 sm:py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-white flex items-center gap-2 touch-manipulation ${
                      canSubmit
                        ? 'bg-blue-600 dark:bg-indigo-600 hover:bg-blue-700 dark:hover:bg-indigo-700'
                        : 'bg-gray-400 dark:bg-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Submit return
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReturnsCreatePage;
