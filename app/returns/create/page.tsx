// 'use client';

// import React, { useEffect, useMemo, useRef, useState } from 'react';
// import Navbar from '@/src/components/common/navbar';
// import Sidebar from '@/src/components/common/sidebar';
// import QRScannerComponent from '@/src/components/qr-scanner';
// import {
//   X,
//   QrCode,
//   Camera,
//   Printer,
//   CheckCircle2,
//   Calendar,
//   User,
//   FileText,
//   DollarSign,
//   ArrowRight,
//   ArrowLeft,
//   ShieldCheck,
//   XCircle,
//   RotateCcw,
//   Search,
// } from 'lucide-react';
// import { useRouter } from 'next/navigation';

// type ReturnCondition = 'Good' | 'Standard' | 'Damage' | 'Missing' | 'Exchange';

// interface RentalAgreementMachine {
//   id: string;
//   model: string;
//   serialNumber: string;
//   description: string;
// }

// interface RentalAgreement {
//   id: string; // agreement number
//   customerName: string;
//   customerAddress: string;
//   customerPhone: string;
//   customerEmail: string;
//   rentalStartDate: string;
//   rentalEndDate: string;
//   rentalPeriod: string;
//   monthlyRate: number;
//   totalAmount: number;
//   paidAmount: number;
//   outstandingAmount: number;
//   securityDeposit: number;
//   dispatchedDate: string;
//   expectedReturnDate: string;
//   machines: RentalAgreementMachine[];
// }

// interface MachineReturnState extends RentalAgreementMachine {
//   scanned: boolean;
//   returnType?: ReturnCondition;
//   damageNote?: string;
//   photos?: File[];
//   photoPreviews?: string[];
// }

// interface CreatedReturnPayload {
//   id: number;
//   returnNumber: string;
//   agreementId: string;
//   createdAt: string;
//   createdBy: string;
//   customerName: string;
//   totalMachines: number;
//   machines: Array<{
//     serialNumber: string;
//     model: string;
//     description: string;
//     returnType: ReturnCondition;
//     damageNote?: string;
//     photosCount?: number;
//   }>;
// }

// // --- Helpers reused from Gatepass page for serial extraction / normalization ---

// function normalizeSerial(input: string): string {
//   return (input || '').trim().toUpperCase();
// }

// function extractSerialFromQR(decodedText: string): string {
//   const raw = (decodedText || '').trim();
//   if (!raw) return '';

//   // Try JSON payloads like: {"serialNo":"ABC"} or {"serial":"ABC"} etc.
//   try {
//     const parsed = JSON.parse(raw);
//     if (parsed && typeof parsed === 'object') {
//       const candidates = [
//         parsed.serialNo,
//         parsed.serialNO,
//         parsed.serial,
//         parsed.serialNumber,
//         parsed.SerialNo,
//         parsed.Serial,
//         parsed.SerialNumber,
//         parsed.machineSerial,
//         parsed.machineSerialNo,
//       ].filter((v: any) => typeof v === 'string' && v.trim().length > 0);

//       if (candidates.length > 0) return candidates[0].trim();
//     }
//   } catch {
//     // ignore
//   }

//   // Try common patterns like "SERIAL: XXX" / "Serial No: XXX"
//   const m =
//     raw.match(/serial\s*(no|number)?\s*[:\-]\s*([A-Za-z0-9\-_/]+)\s*$/i) ||
//     raw.match(/^([A-Za-z0-9][A-Za-z0-9\-_/]{3,})$/);

//   if (m) {
//     const val = (m[2] || m[1] || '').trim();
//     if (val) return val;
//   }

//   // Fallback: use full text
//   return raw;
// }

// // --- Mock rental agreements with machines (you can later replace with API) ---

// const mockRentalAgreements: RentalAgreement[] = [
//   {
//     id: 'AGR-2024-001',
//     customerName: 'ABC Holdings (Pvt) Ltd',
//     customerAddress: '123 Main Street, Colombo 05',
//     customerPhone: '+94 11 2345678',
//     customerEmail: 'contact@abcholdings.lk',
//     rentalStartDate: '2024-01-15',
//     rentalEndDate: '2024-07-15',
//     rentalPeriod: '6 months',
//     monthlyRate: 25000,
//     totalAmount: 150000,
//     paidAmount: 100000,
//     outstandingAmount: 50000,
//     securityDeposit: 50000,
//     dispatchedDate: '2024-01-15',
//     expectedReturnDate: '2024-07-15',
//     machines: [
//       // Model 1 - 5 machines
//       {
//         id: 'MACH-001-01',
//         model: 'CAT 320',
//         serialNumber: 'SN-CAT320-2023-001',
//         description: 'Excavator CAT 320 - Unit 01',
//       },
//       {
//         id: 'MACH-001-02',
//         model: 'CAT 320',
//         serialNumber: 'SN-CAT320-2023-002',
//         description: 'Excavator CAT 320 - Unit 02',
//       },
//       {
//         id: 'MACH-001-03',
//         model: 'CAT 320',
//         serialNumber: 'SN-CAT320-2023-003',
//         description: 'Excavator CAT 320 - Unit 03',
//       },
//       {
//         id: 'MACH-001-04',
//         model: 'CAT 320',
//         serialNumber: 'SN-CAT320-2023-004',
//         description: 'Excavator CAT 320 - Unit 04',
//       },
//       {
//         id: 'MACH-001-05',
//         model: 'CAT 320',
//         serialNumber: 'SN-CAT320-2023-005',
//         description: 'Excavator CAT 320 - Unit 05',
//       },
//       // Model 2 - 5 machines
//       {
//         id: 'MACH-002-01',
//         model: 'CAT D6',
//         serialNumber: 'SN-CATD6-2023-001',
//         description: 'Bulldozer CAT D6 - Unit 01',
//       },
//       {
//         id: 'MACH-002-02',
//         model: 'CAT D6',
//         serialNumber: 'SN-CATD6-2023-002',
//         description: 'Bulldozer CAT D6 - Unit 02',
//       },
//       {
//         id: 'MACH-002-03',
//         model: 'CAT D6',
//         serialNumber: 'SN-CATD6-2023-003',
//         description: 'Bulldozer CAT D6 - Unit 03',
//       },
//       {
//         id: 'MACH-002-04',
//         model: 'CAT D6',
//         serialNumber: 'SN-CATD6-2023-004',
//         description: 'Bulldozer CAT D6 - Unit 04',
//       },
//       {
//         id: 'MACH-002-05',
//         model: 'CAT D6',
//         serialNumber: 'SN-CATD6-2023-005',
//         description: 'Bulldozer CAT D6 - Unit 05',
//       },
//     ],
//   },
//   {
//     id: 'AGR-2024-002',
//     customerName: 'Mega Constructions',
//     customerAddress: '654 High Level Road, Maharagama',
//     customerPhone: '+94 11 3456789',
//     customerEmail: 'info@megaconstructions.lk',
//     rentalStartDate: '2024-03-01',
//     rentalEndDate: '2024-09-01',
//     rentalPeriod: '6 months',
//     monthlyRate: 33333.33,
//     totalAmount: 200000,
//     paidAmount: 100000,
//     outstandingAmount: 100000,
//     securityDeposit: 75000,
//     dispatchedDate: '2024-03-01',
//     expectedReturnDate: '2024-09-01',
//     machines: [
//       {
//         id: 'MACH-010-01',
//         model: 'Loader CAT 950',
//         serialNumber: 'SN-CAT950-2022-001',
//         description: 'Loader CAT 950 - Unit 01',
//       },
//       {
//         id: 'MACH-010-02',
//         model: 'Loader CAT 950',
//         serialNumber: 'SN-CAT950-2022-002',
//         description: 'Loader CAT 950 - Unit 02',
//       },
//       {
//         id: 'MACH-010-03',
//         model: 'Loader CAT 950',
//         serialNumber: 'SN-CAT950-2022-003',
//         description: 'Loader CAT 950 - Unit 03',
//       },
//       {
//         id: 'MACH-010-04',
//         model: 'Loader CAT 950',
//         serialNumber: 'SN-CAT950-2022-004',
//         description: 'Loader CAT 950 - Unit 04',
//       },
//     ],
//   },
// ];

// // --- Component ---

// const ReturnsCreatePage: React.FC = () => {
//   const router = useRouter();

//   const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
//   const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

//   const [currentStep, setCurrentStep] = useState<1 | 2>(1);

//   // Agreement selection
//   const [agreementNumberInput, setAgreementNumberInput] = useState('');
//   const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreement | null>(null);

//   // Machines under selected agreement with return state
//   const [machines, setMachines] = useState<MachineReturnState[]>([]);
//   const [selectedMachineIndex, setSelectedMachineIndex] = useState<number | null>(null);

//   // QR Scanner within step 2
//   const [scannerKey, setScannerKey] = useState(1);

//   // Feedback, similar to security modal in gatepass
//   type ScanResultType = 'success' | 'failed' | 'duplicate';
//   const [lastFeedback, setLastFeedback] = useState<{
//     type: ScanResultType;
//     title: string;
//     message: string;
//   } | null>(null);
//   const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null);

//   const [isSubmitting, setIsSubmitting] = useState(false);

//   useEffect(() => {
//     return () => {
//       if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
//       // Clean up previews
//       machines.forEach((m) => {
//         m.photoPreviews?.forEach((p) => URL.revokeObjectURL(p));
//       });
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const totalMachines = machines.length;
//   const scannedMachines = useMemo(
//     () => machines.filter((m) => m.scanned).length,
//     [machines]
//   );
//   const damagedMachinesCount = useMemo(
//     () =>
//       machines.filter(
//         (m) => m.returnType === 'Damage' || m.returnType === 'Missing'
//       ).length,
//     [machines]
//   );

//   const allScanned = totalMachines > 0 && scannedMachines === totalMachines;

//   const handleMenuClick = () => {
//     setIsMobileSidebarOpen((prev) => !prev);
//   };

//   const handleMobileSidebarClose = () => {
//     setIsMobileSidebarOpen(false);
//   };

//   const handleLogout = () => {
//     console.log('Logout clicked');
//   };

//   const showFeedback = (fb: { type: ScanResultType; title: string; message: string }) => {
//     setLastFeedback(fb);
//     if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
//     feedbackTimerRef.current = setTimeout(() => setLastFeedback(null), 2500);
//   };

//   const restartScannerSoon = () => {
//     setTimeout(() => setScannerKey((k) => k + 1), 450);
//   };

//   const resetAllState = () => {
//     // Cleanup previews
//     machines.forEach((m) => {
//       m.photoPreviews?.forEach((p) => URL.revokeObjectURL(p));
//     });

//     setCurrentStep(1);
//     setAgreementNumberInput('');
//     setSelectedAgreement(null);
//     setMachines([]);
//     setSelectedMachineIndex(null);
//     setScannerKey((k) => k + 1);
//     setLastFeedback(null);
//     setIsSubmitting(false);
//   };

//   const handleCancel = () => {
//     resetAllState();
//     router.push('/returns');
//   };

//   // --- Agreement search and setup ---

//   const handleFindAgreement = () => {
//     const input = agreementNumberInput.trim();
//     if (!input) {
//       alert('Please enter a rental agreement number.');
//       return;
//     }

//     const agreement = mockRentalAgreements.find(
//       (a) => a.id.toLowerCase() === input.toLowerCase()
//     );

//     if (!agreement) {
//       alert('Agreement not found. Please check the number.');
//       setSelectedAgreement(null);
//       setMachines([]);
//       setSelectedMachineIndex(null);
//       return;
//     }

//     // Initialize machine state
//     const initialMachines: MachineReturnState[] = agreement.machines.map((m) => ({
//       ...m,
//       scanned: false,
//       returnType: undefined,
//       damageNote: '',
//       photos: [],
//       photoPreviews: [],
//     }));

//     setSelectedAgreement(agreement);
//     setMachines(initialMachines);
//     setSelectedMachineIndex(initialMachines.length > 0 ? 0 : null);
//     setCurrentStep(1);
//     setLastFeedback(null);
//     setScannerKey((k) => k + 1);
//   };

//   const handleProceedToScanning = () => {
//     if (!selectedAgreement) {
//       alert('Please select a rental agreement first.');
//       return;
//     }
//     if (machines.length === 0) {
//       alert('This agreement has no machines assigned.');
//       return;
//     }
//     setCurrentStep(2);
//   };

//   const handleBackToAgreementStep = () => {
//     setCurrentStep(1);
//   };

//   // --- QR scanning and machine mapping ---

//   const expectedSerialSet = useMemo(() => {
//     const s = new Set<string>();
//     machines.forEach((m) => {
//       const serial = normalizeSerial(m.serialNumber);
//       if (serial) s.add(serial);
//     });
//     return s;
//   }, [machines]);

//   const handleScanSuccess = (decodedText: string) => {
//     if (machines.length === 0) return;

//     const extracted = normalizeSerial(extractSerialFromQR(decodedText));
//     if (!extracted) {
//       showFeedback({
//         type: 'failed',
//         title: 'Scan Failed',
//         message: 'Could not extract a serial number from this QR.',
//       });
//       restartScannerSoon();
//       return;
//     }

//     const machineIndex = machines.findIndex(
//       (m) => normalizeSerial(m.serialNumber) === extracted
//     );

//     if (machineIndex === -1) {
//       showFeedback({
//         type: 'failed',
//         title: 'Not In Agreement',
//         message: `${extracted} is NOT listed in this rental agreement.`,
//       });
//       restartScannerSoon();
//       return;
//     }

//     const machine = machines[machineIndex];

//     if (machine.scanned) {
//       showFeedback({
//         type: 'duplicate',
//         title: 'Already Scanned',
//         message: `${extracted} was already scanned for this return.`,
//       });
//       restartScannerSoon();
//       setSelectedMachineIndex(machineIndex);
//       return;
//     }

//     // Mark scanned and default return type
//     const updated = machines.map((m, idx) =>
//       idx === machineIndex
//         ? {
//             ...m,
//             scanned: true,
//             returnType: m.returnType ?? 'Good',
//           }
//         : m
//     );
//     setMachines(updated);
//     setSelectedMachineIndex(machineIndex);

//     showFeedback({
//       type: 'success',
//       title: 'Machine Matched',
//       message: `${extracted} matched with agreement and marked as scanned.`,
//     });
//     restartScannerSoon();
//   };

//   // --- Per-machine editing: return type, damage note, photos ---

//   const updateMachineAtIndex = (
//     index: number,
//     updater: (current: MachineReturnState) => MachineReturnState
//   ) => {
//     setMachines((prev) =>
//       prev.map((m, i) => (i === index ? updater(m) : m))
//     );
//   };

//   const handleReturnTypeChange = (index: number, type: ReturnCondition) => {
//     updateMachineAtIndex(index, (m) => ({
//       ...m,
//       scanned: true,
//       returnType: type,
//     }));
//   };

//   const handleDamageNoteChange = (index: number, note: string) => {
//     updateMachineAtIndex(index, (m) => ({
//       ...m,
//       damageNote: note,
//     }));
//   };

//   const handlePhotoUpload = (index: number, files: FileList | null) => {
//     if (!files || files.length === 0) return;

//     const fileArray = Array.from(files);
//     updateMachineAtIndex(index, (m) => {
//       const existingPreviews = m.photoPreviews || [];
//       const newPreviews = fileArray.map((f) => URL.createObjectURL(f));

//       return {
//         ...m,
//         photos: [...(m.photos || []), ...fileArray],
//         photoPreviews: [...existingPreviews, ...newPreviews],
//       };
//     });
//   };

//   const handleRemovePhoto = (machineIndex: number, photoIndex: number) => {
//     updateMachineAtIndex(machineIndex, (m) => {
//       const photos = m.photos ? [...m.photos] : [];
//       const previews = m.photoPreviews ? [...m.photoPreviews] : [];

//       if (previews[photoIndex]) {
//         URL.revokeObjectURL(previews[photoIndex]);
//       }

//       photos.splice(photoIndex, 1);
//       previews.splice(photoIndex, 1);

//       return {
//         ...m,
//         photos,
//         photoPreviews: previews,
//       };
//     });
//   };

//   // --- Create Return ---

//   const generateReturnNumber = (): string => {
//     const num = Math.floor(Math.random() * 1000000);
//     return `RET-${new Date().getFullYear()}-${num.toString().padStart(4, '0')}`;
//   };

//   const handleCreateReturn = async () => {
//     if (!selectedAgreement) {
//       alert('Please select a rental agreement first.');
//       return;
//     }

//     if (machines.length === 0) {
//       alert('No machines found for this agreement.');
//       return;
//     }

//     if (!allScanned) {
//       alert('Please scan all machines before creating the return.');
//       return;
//     }

//     // Validate return types and damage/missing proof
//     for (const machine of machines) {
//       if (!machine.returnType) {
//         alert(
//           `Please select a return type for machine with serial: ${machine.serialNumber}`
//         );
//         return;
//       }

//       if (
//         (machine.returnType === 'Damage' ||
//           machine.returnType === 'Missing') &&
//         (!machine.damageNote || !machine.damageNote.trim())
//       ) {
//         alert(
//           `Please enter a damage/missing note for machine with serial: ${machine.serialNumber}`
//         );
//         return;
//       }

//       if (
//         (machine.returnType === 'Damage' ||
//           machine.returnType === 'Missing') &&
//         (!machine.photos || machine.photos.length === 0)
//       ) {
//         alert(
//           `Please add at least one photo as proof for machine with serial: ${machine.serialNumber}`
//         );
//         return;
//       }
//     }

//     setIsSubmitting(true);
//     try {
//       const payload: CreatedReturnPayload = {
//         id: Date.now(),
//         returnNumber: generateReturnNumber(),
//         agreementId: selectedAgreement.id,
//         createdAt: new Date().toISOString(),
//         createdBy: 'Current User', // later: actual logged-in user
//         customerName: selectedAgreement.customerName,
//         totalMachines: machines.length,
//         machines: machines.map((m) => ({
//           serialNumber: m.serialNumber,
//           model: m.model,
//           description: m.description,
//           returnType: m.returnType as ReturnCondition,
//           damageNote:
//             m.returnType === 'Damage' || m.returnType === 'Missing'
//               ? m.damageNote
//               : undefined,
//           photosCount:
//             m.returnType === 'Damage' || m.returnType === 'Missing'
//               ? (m.photos || []).length
//               : undefined,
//         })),
//       };

//       console.log('Return payload (frontend only):', payload);

//       await new Promise((resolve) => setTimeout(resolve, 1000));

//       alert(
//         `Return ${payload.returnNumber} created successfully! (frontend only – printing stub).`
//       );
//       resetAllState();
//       router.push('/returns');
//       // In a real app, you would also trigger print/PDF here.
//     } catch (error) {
//       console.error('Error creating return:', error);
//       alert('Failed to create return. Please try again.');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // --- UI render helpers ---

//   const renderScanFeedback = () => {
//     if (!lastFeedback) return null;

//     const styles =
//       lastFeedback.type === 'success'
//         ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200'
//         : lastFeedback.type === 'duplicate'
//         ? 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-200'
//         : 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200';

//     return (
//       <div className={`p-3 rounded-lg border ${styles}`}>
//         <div className="font-semibold text-sm">{lastFeedback.title}</div>
//         <div className="text-xs mt-1">{lastFeedback.message}</div>
//       </div>
//     );
//   };

//   const renderAgreementDetails = (showSummarySections: boolean = true) => {
//     if (!selectedAgreement) return null;

//     // Step 2: only machines table (no Agreement Details, Rental Period, Financials)
//     if (!showSummarySections) {
//       return (
//         <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
//             <div>
//               <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center">
//                 <User className="w-4 h-4 mr-2" />
//                 Machines in this Agreement
//               </h3>
//               <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
//                 Total {selectedAgreement.machines.length} machines under{' '}
//                 {selectedAgreement.id}. Scan each QR to record return status.
//               </p>
//             </div>
//             <div className="flex items-center gap-2">
//               <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
//                 Total: {totalMachines}
//               </span>
//               <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
//                 Scanned: {scannedMachines}
//               </span>
//               <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
//                 Damage / Missing: {damagedMachinesCount}
//               </span>
//             </div>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="min-w-full text-xs sm:text-sm">
//               <thead className="bg-gray-50 dark:bg-slate-700/50">
//                 <tr>
//                   <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
//                     #
//                   </th>
//                   <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
//                     Model
//                   </th>
//                   <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
//                     Description
//                   </th>
//                   <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
//                     Serial No
//                   </th>
//                   <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
//                     Return Type
//                   </th>
//                   <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
//                     Status
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
//                 {machines.map((m, idx) => (
//                   <tr
//                     key={m.id}
//                     className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/40 ${
//                       selectedMachineIndex === idx
//                         ? 'bg-blue-50/60 dark:bg-indigo-900/20'
//                         : ''
//                     }`}
//                     onClick={() => setSelectedMachineIndex(idx)}
//                   >
//                     <td className="px-2 sm:px-3 py-2 text-gray-800 dark:text-gray-200">
//                       {idx + 1}
//                     </td>
//                     <td className="px-2 sm:px-3 py-2 text-gray-900 dark:text-white">
//                       {m.model}
//                     </td>
//                     <td className="px-2 sm:px-3 py-2 text-gray-900 dark:text-white break-words">
//                       {m.description}
//                     </td>
//                     <td className="px-2 sm:px-3 py-2 font-mono text-gray-900 dark:text-white break-all">
//                       {m.serialNumber}
//                     </td>
//                     <td className="px-2 sm:px-3 py-2">
//                       {m.returnType ? (
//                         <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
//                           {m.returnType}
//                         </span>
//                       ) : (
//                         <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
//                           Not set
//                         </span>
//                       )}
//                     </td>
//                     <td className="px-2 sm:px-3 py-2">
//                       {m.scanned ? (
//                         <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
//                           <CheckCircle2 className="w-3 h-3" />
//                           Scanned
//                         </span>
//                       ) : (
//                         <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
//                           <XCircle className="w-3 h-3" />
//                           Pending
//                         </span>
//                       )}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       );
//     }

//     // Step 1: full content (Agreement Details + Rental Period + Financials + Machines table)
//     return (
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//         {/* Customer & Agreement */}
//         <div className="md:col-span-2 space-y-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
//           <div className="flex items-center justify-between">
//             <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
//               <FileText className="w-4 h-4 mr-2" />
//               Agreement Details
//             </h3>
//             <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
//               {selectedAgreement.id}
//             </span>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
//             <div>
//               <span className="text-gray-600 dark:text-gray-400">Customer:</span>
//               <span className="ml-1 font-semibold text-gray-900 dark:text-white">
//                 {selectedAgreement.customerName}
//               </span>
//             </div>
//             <div>
//               <span className="text-gray-600 dark:text-gray-400">Phone:</span>
//               <span className="ml-1 font-semibold text-gray-900 dark:text-white">
//                 {selectedAgreement.customerPhone}
//               </span>
//             </div>
//             <div className="sm:col-span-2">
//               <span className="text-gray-600 dark:text-gray-400">Address:</span>
//               <span className="ml-1 font-semibold text-gray-900 dark:text-white">
//                 {selectedAgreement.customerAddress}
//               </span>
//             </div>
//             <div className="sm:col-span-2">
//               <span className="text-gray-600 dark:text-gray-400">Email:</span>
//               <span className="ml-1 font-semibold text-gray-900 dark:text-white">
//                 {selectedAgreement.customerEmail}
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* Summary */}
//         <div className="space-y-3">
//           <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
//             <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center mb-2">
//               <Calendar className="w-4 h-4 mr-2" />
//               Rental Period
//             </h3>
//             <div className="space-y-1 text-sm">
//               <div>
//                 <span className="text-gray-600 dark:text-gray-400">Start:</span>
//                 <span className="ml-1 font-semibold text-gray-900 dark:text-white">
//                   {new Date(selectedAgreement.rentalStartDate).toLocaleDateString('en-LK')}
//                 </span>
//               </div>
//               <div>
//                 <span className="text-gray-600 dark:text-gray-400">End:</span>
//                 <span className="ml-1 font-semibold text-gray-900 dark:text-white">
//                   {new Date(selectedAgreement.rentalEndDate).toLocaleDateString('en-LK')}
//                 </span>
//               </div>
//               <div>
//                 <span className="text-gray-600 dark:text-gray-400">Period:</span>
//                 <span className="ml-1 font-semibold text-gray-900 dark:text-white">
//                   {selectedAgreement.rentalPeriod}
//                 </span>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
//             <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center mb-2">
//               <DollarSign className="w-4 h-4 mr-2" />
//               Financials
//             </h3>
//             <div className="space-y-1 text-sm">
//               <div>
//                 <span className="text-gray-600 dark:text-gray-400">Total:</span>
//                 <span className="ml-1 font-semibold text-gray-900 dark:text-white">
//                   Rs.{' '}
//                   {selectedAgreement.totalAmount.toLocaleString('en-LK', {
//                     minimumFractionDigits: 2,
//                     maximumFractionDigits: 2,
//                   })}
//                 </span>
//               </div>
//               <div>
//                 <span className="text-gray-600 dark:text-gray-400">Paid:</span>
//                 <span className="ml-1 font-semibold text-green-600 dark:text-green-400">
//                   Rs.{' '}
//                   {selectedAgreement.paidAmount.toLocaleString('en-LK', {
//                     minimumFractionDigits: 2,
//                     maximumFractionDigits: 2,
//                   })}
//                 </span>
//               </div>
//               <div>
//                 <span className="text-gray-600 dark:text-gray-400">Outstanding:</span>
//                 <span className="ml-1 font-semibold text-red-600 dark:text-red-400">
//                   Rs.{' '}
//                   {selectedAgreement.outstandingAmount.toLocaleString('en-LK', {
//                     minimumFractionDigits: 2,
//                     maximumFractionDigits: 2,
//                   })}
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Machines summary (full width) */}
//         <div className="md:col-span-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
//             <div>
//               <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white flex items-center">
//                 <User className="w-4 h-4 mr-2" />
//                 Machines in this Agreement
//               </h3>
//               <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
//                 Total {selectedAgreement.machines.length} machines under{' '}
//                 {selectedAgreement.id}. Scan each QR to record return status.
//               </p>
//             </div>
//             <div className="flex items-center gap-2">
//               <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
//                 Total: {totalMachines}
//               </span>
//               <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
//                 Scanned: {scannedMachines}
//               </span>
//               <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
//                 Damage / Missing: {damagedMachinesCount}
//               </span>
//             </div>
//           </div>

//           <div className="overflow-x-auto">
//             <table className="min-w-full text-xs sm:text-sm">
//               <thead className="bg-gray-50 dark:bg-slate-700/50">
//                 <tr>
//                   <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
//                     #
//                   </th>
//                   <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
//                     Model
//                   </th>
//                   <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
//                     Description
//                   </th>
//                   <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
//                     Serial No
//                   </th>
//                   <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
//                     Return Type
//                   </th>
//                   <th className="px-2 sm:px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300">
//                     Status
//                   </th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
//                 {machines.map((m, idx) => (
//                   <tr
//                     key={m.id}
//                     className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/40 ${
//                       selectedMachineIndex === idx
//                         ? 'bg-blue-50/60 dark:bg-indigo-900/20'
//                         : ''
//                     }`}
//                     onClick={() => setSelectedMachineIndex(idx)}
//                   >
//                     <td className="px-2 sm:px-3 py-2 text-gray-800 dark:text-gray-200">
//                       {idx + 1}
//                     </td>
//                     <td className="px-2 sm:px-3 py-2 text-gray-900 dark:text-white">
//                       {m.model}
//                     </td>
//                     <td className="px-2 sm:px-3 py-2 text-gray-900 dark:text-white break-words">
//                       {m.description}
//                     </td>
//                     <td className="px-2 sm:px-3 py-2 font-mono text-gray-900 dark:text-white break-all">
//                       {m.serialNumber}
//                     </td>
//                     <td className="px-2 sm:px-3 py-2">
//                       {m.returnType ? (
//                         <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
//                           {m.returnType}
//                         </span>
//                       ) : (
//                         <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
//                           Not set
//                         </span>
//                       )}
//                     </td>
//                     <td className="px-2 sm:px-3 py-2">
//                       {m.scanned ? (
//                         <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
//                           <CheckCircle2 className="w-3 h-3" />
//                           Scanned
//                         </span>
//                       ) : (
//                         <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300">
//                           <XCircle className="w-3 h-3" />
//                           Pending
//                         </span>
//                       )}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </div>
//     );
//   };

//   const renderSelectedMachineEditor = () => {
//     if (
//       selectedMachineIndex === null ||
//       selectedMachineIndex < 0 ||
//       selectedMachineIndex >= machines.length
//     ) {
//       return (
//         <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
//           Select a machine from the list to edit its return details.
//         </div>
//       );
//     }

//     const machine = machines[selectedMachineIndex];
//     const isDamage =
//       machine.returnType === 'Damage' || machine.returnType === 'Missing';

//     const uploadInputId = `damage-photos-upload-${selectedMachineIndex}`;
//     const cameraInputId = `damage-photos-camera-${selectedMachineIndex}`;

//     return (
//       <div className="space-y-4">
//         <div>
//           <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-1 flex items-center">
//             <ShieldCheck className="w-4 h-4 mr-2 text-emerald-600 dark:text-emerald-400" />
//             Machine Return Details
//           </h3>
//           <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
//             Serial:{' '}
//             <span className="font-mono font-semibold text-gray-900 dark:text-white">
//               {machine.serialNumber}
//             </span>
//           </p>
//           <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
//             Model:{' '}
//             <span className="font-semibold text-gray-900 dark:text-white">
//               {machine.model}
//             </span>
//           </p>
//         </div>

//         <div className="space-y-3">
//           {/* Return type */}
//           <div>
//             <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//               Return Type <span className="text-red-500">*</span>
//             </label>
//             <div className="grid grid-cols-2 gap-2">
//               {(['Good', 'Standard', 'Damage', 'Missing', 'Exchange'] as ReturnCondition[]).map(
//                 (type) => (
//                   <button
//                     key={type}
//                     type="button"
//                     onClick={() => handleReturnTypeChange(selectedMachineIndex, type)}
//                     className={`px-3 py-2 rounded-md border text-xs sm:text-sm text-left transition-all ${
//                       machine.returnType === type
//                         ? 'border-blue-600 dark:border-indigo-500 bg-blue-50 dark:bg-indigo-900/30 text-blue-700 dark:text-indigo-200'
//                         : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:border-blue-400 dark:hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-700/60'
//                     }`}
//                   >
//                     <div className="font-semibold">{type}</div>
//                     <div className="text-[11px] text-gray-500 dark:text-gray-400">
//                       {type === 'Good'
//                         ? 'Returned in excellent condition'
//                         : type === 'Standard'
//                         ? 'Normal wear & tear'
//                         : type === 'Damage'
//                         ? 'Damaged – need photos & notes'
//                         : type === 'Missing'
//                         ? 'Missing parts / assemblies'
//                         : 'Exchange with another machine'}
//                     </div>
//                   </button>
//                 )
//               )}
//             </div>
//           </div>

//           {/* Damage / missing fields */}
//           {isDamage && (
//             <>
//               <div>
//                 <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//                   Damage / Missing Note <span className="text-red-500">*</span>
//                 </label>
//                 <textarea
//                   value={machine.damageNote || ''}
//                   onChange={(e) => handleDamageNoteChange(selectedMachineIndex, e.target.value)}
//                   rows={3}
//                   placeholder={`Describe the ${machine.returnType?.toLowerCase()} in detail...`}
//                   className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500 dark:focus:border-indigo-500"
//                 />
//               </div>

//               <div className="space-y-2">
//                 <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
//                   Photos as Proof <span className="text-red-500">*</span>
//                 </label>

//                 {/* Hidden inputs: one for camera capture, one for gallery upload */}
//                 <input
//                   type="file"
//                   accept="image/*"
//                   capture="environment"
//                   multiple
//                   className="hidden"
//                   id={cameraInputId}
//                   onChange={(e) => handlePhotoUpload(selectedMachineIndex, e.target.files)}
//                 />
//                 <input
//                   type="file"
//                   accept="image/*"
//                   multiple
//                   className="hidden"
//                   id={uploadInputId}
//                   onChange={(e) => handlePhotoUpload(selectedMachineIndex, e.target.files)}
//                 />

//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//                   {/* Capture from camera */}
//                   <label
//                     htmlFor={cameraInputId}
//                     className="flex items-center justify-center w-full h-12 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-xs sm:text-sm text-gray-700 dark:text-gray-200"
//                   >
//                     <Camera className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
//                     <span>Capture from camera</span>
//                   </label>

//                   {/* Upload from gallery / files */}
//                   <label
//                     htmlFor={uploadInputId}
//                     className="flex items-center justify-center w-full h-12 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-xs sm:text-sm text-gray-700 dark:text-gray-200"
//                   >
//                     <QrCode className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
//                     <span>Upload from gallery</span>
//                   </label>
//                 </div>

//                 <p className="text-[11px] text-gray-500 dark:text-gray-400">
//                   Use your device camera or choose existing photos. PNG/JPG recommended.
//                 </p>

//                 {/* Photo previews */}
//                 {machine.photoPreviews && machine.photoPreviews.length > 0 && (
//                   <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
//                     {machine.photoPreviews.map((preview, idx) => (
//                       <div key={idx} className="relative group">
//                         {/* eslint-disable-next-line @next/next/no-img-element */}
//                         <img
//                           src={preview}
//                           alt={`Damage proof ${idx + 1}`}
//                           className="w-full h-20 object-cover rounded-md border border-gray-300 dark:border-slate-600"
//                         />
//                         <button
//                           type="button"
//                           onClick={() => handleRemovePhoto(selectedMachineIndex, idx)}
//                           className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
//                         >
//                           <X className="w-3 h-3" />
//                         </button>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     );
//   };

//   // --- Main return ---

//   return (
//     <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
//       {/* Top navbar */}
//       <Navbar onMenuClick={handleMenuClick} />

//       {/* Left sidebar */}
//       <Sidebar
//         onLogout={handleLogout}
//         isMobileOpen={isMobileSidebarOpen}
//         onMobileClose={handleMobileSidebarClose}
//         onExpandedChange={setIsSidebarExpanded}
//       />

//       {/* Main content area */}
//       <main
//         className={`pt-28 lg:pt-32 p-4 sm:p-6 transition-all duration-300 ${
//           isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
//         }`}
//       >
//         <div className="max-w-6xl mx-auto space-y-4">
//           {/* Page header */}
//           <div className="flex items-center justify-between gap-2">
//             <div>
//               <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
//                 Create Return (Rental Agreement)
//               </h2>
//               <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
//                 Select rental agreement, scan each machine QR, set return type, and capture
//                 damage/missing evidence.
//               </p>
//             </div>
//             <button
//               onClick={handleCancel}
//               className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500"
//             >
//               Back
//             </button>
//           </div>

//           {/* Step indicator */}
//           <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
//             <div className="flex items-center justify-between">
//               {[1, 2].map((step) => (
//                 <React.Fragment key={step}>
//                   <div className="flex items-center">
//                     <div
//                       className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-semibold transition-colors ${
//                         currentStep >= step
//                           ? 'bg-blue-600 dark:bg-indigo-600 text-white'
//                           : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
//                       }`}
//                     >
//                       {currentStep > step ? (
//                         <CheckCircle2 className="w-4 h-4" />
//                       ) : (
//                         step
//                       )}
//                     </div>
//                     <span
//                       className={`ml-2 text-xs sm:text-sm font-medium ${
//                         currentStep >= step
//                           ? 'text-blue-600 dark:text-indigo-400'
//                           : 'text-gray-500 dark:text-gray-400'
//                       }`}
//                     >
//                       {step === 1 ? 'Agreement & Machines' : 'Scan & Return Details'}
//                     </span>
//                   </div>
//                   {step < 2 && (
//                     <div
//                       className={`flex-1 h-0.5 mx-4 ${
//                         currentStep > step
//                           ? 'bg-blue-600 dark:bg-indigo-600'
//                           : 'bg-gray-200 dark:bg-slate-700'
//                       }`}
//                     />
//                   )}
//                 </React.Fragment>
//               ))}
//             </div>
//           </div>

//           {/* Main card */}
//           <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
//             {currentStep === 1 && (
//               <div className="p-4 sm:p-6 space-y-6">
//                 {/* Step title */}
//                 <div>
//                   <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">
//                     Step 1: Select Rental Agreement
//                   </h3>
//                   <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
//                     Enter the rental agreement number to load agreement details and all related
//                     machines. Then proceed to scanning.
//                   </p>
//                 </div>

//                 {/* Agreement search */}
//                 <div className="space-y-4">
//                   <div>
//                     <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
//                       Rental Agreement Number
//                     </label>
//                     <div className="flex flex-col sm:flex-row gap-2">
//                       <div className="relative flex-1">
//                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                           <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
//                         </div>
//                         <input
//                           type="text"
//                           value={agreementNumberInput}
//                           onChange={(e) => setAgreementNumberInput(e.target.value)}
//                           onKeyDown={(e) => {
//                             if (e.key === 'Enter') {
//                               e.preventDefault();
//                               handleFindAgreement();
//                             }
//                           }}
//                           placeholder="e.g., AGR-2024-001"
//                           className="block w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500 dark:focus:border-indigo-500"
//                         />
//                       </div>
//                       <button
//                         type="button"
//                         onClick={handleFindAgreement}
//                         className="px-4 py-2.5 bg-blue-600 dark:bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 flex items-center justify-center gap-1.5"
//                       >
//                         <Search className="w-4 h-4" />
//                         <span>Find Agreement</span>
//                       </button>
//                     </div>
//                     <p className="mt-1 text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
//                       (For now data is mocked in frontend – later you can fetch from backend by
//                       agreement number.)
//                     </p>
//                   </div>

//                   {renderAgreementDetails()}

//                   <div className="flex items-center justify-end">
//                     <button
//                       type="button"
//                       onClick={handleProceedToScanning}
//                       disabled={!selectedAgreement || machines.length === 0}
//                       className="inline-flex items-center justify-center px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 dark:bg-indigo-600 hover:bg-blue-700 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                       Proceed to Scan & Return
//                       <ArrowRight className="w-4 h-4 ml-1.5" />
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {currentStep === 2 && (
//               <div className="p-4 sm:p-6 space-y-4">
//                 <div className="flex items-center justify-between gap-2">
//                   <div>
//                     <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-1">
//                       Step 2: Scan Machines & Set Return Details
//                     </h3>
//                     <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
//                       Scan each machine QR code and record its return condition. For damage /
//                       missing, capture notes and photos.
//                     </p>
//                   </div>
//                   <button
//                     type="button"
//                     onClick={handleBackToAgreementStep}
//                     className="inline-flex items-center justify-center px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium bg-gray-200 dark:bg-slate-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-slate-700"
//                   >
//                     <ArrowLeft className="w-4 h-4 mr-1" />
//                     Back to Agreement
//                   </button>
//                 </div>

//                 {/* Top status summary */}
//                 <div className="grid grid-cols-3 gap-3">
//                   <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
//                     <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
//                       Total Machines
//                     </div>
//                     <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
//                       {totalMachines}
//                     </div>
//                   </div>
//                   <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
//                     <div className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-300">
//                       Scanned
//                     </div>
//                     <div className="text-base sm:text-lg font-bold text-emerald-800 dark:text-emerald-100">
//                       {scannedMachines}
//                     </div>
//                   </div>
//                   <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
//                     <div className="text-[11px] sm:text-xs text-red-700 dark:text-red-300">
//                       Damage / Missing
//                     </div>
//                     <div className="text-base sm:text-lg font-bold text-red-800 dark:text-red-100">
//                       {damagedMachinesCount}
//                     </div>
//                   </div>
//                 </div>

//                 {/* Layout: left - machines; right - scanner + editor */}
//                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
//                   {/* Left side: machines table (same as in step 1 but compact) */}
//                   <div className="space-y-4">
//                     {renderAgreementDetails(false)}

//                     {/*  */}
//                   </div>

//                   {/* Right side: scanner + selected machine editor */}
//                   <div className="space-y-4">
//                     {renderScanFeedback()}

//                     <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
//                       <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
//                         <div>
//                           <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
//                             QR Scanner
//                           </h3>
//                           <p className="text-[11px] sm:text-xs text-gray-600 dark:text-gray-400 mt-1">
//                             Scan each machine QR. Scanner auto-restarts after each scan.
//                           </p>
//                         </div>
//                         <button
//                           type="button"
//                           onClick={() => {
//                             setScannerKey((k) => k + 1);
//                             setLastFeedback(null);
//                           }}
//                           className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
//                         >
//                           <RotateCcw className="w-3 h-3 mr-1" />
//                           Restart
//                         </button>
//                       </div>
//                       <div className="p-0">
//                         <div className="h-[320px] sm:h-[380px] md:h-[420px]">
//                           <QRScannerComponent
//                             key={scannerKey}
//                             onScanSuccess={handleScanSuccess}
//                             autoClose={false}
//                             showCloseButton={false}
//                             title="Scan Machine QR"
//                             subtitle={`Scanned ${scannedMachines}/${totalMachines} • Damage/Missing ${damagedMachinesCount}`}
//                           />
//                         </div>
//                       </div>
//                     </div>

//                     <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3 sm:p-4">
//                       {renderSelectedMachineEditor()}
//                     </div>

//                     {/* Create Return button */}
//                     <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
//                       <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
//                         {allScanned ? (
//                           <span className="font-semibold text-emerald-700 dark:text-emerald-300">
//                             All machines are scanned. You can now create the return.
//                           </span>
//                         ) : (
//                           <span>
//                             Scan all machines before creating the return. Damaged / missing
//                             machines must have notes and photo proof.
//                           </span>
//                         )}
//                       </div>
//                       <button
//                         type="button"
//                         onClick={handleCreateReturn}
//                         disabled={!allScanned || isSubmitting}
//                         className={`inline-flex items-center justify-center px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-medium text-white ${
//                           allScanned && !isSubmitting
//                             ? 'bg-blue-600 dark:bg-indigo-600 hover:bg-blue-700 dark:hover:bg-indigo-700'
//                             : 'bg-gray-400 dark:bg-slate-700 cursor-not-allowed'
//                         }`}
//                       >
//                         {isSubmitting ? (
//                           <>
//                             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
//                           Processing...
//                           </>
//                         ) : (
//                           <>
//                             <Printer className="w-4 h-4 mr-1.5" />
//                             Create Return & Print
//                           </>
//                         )}
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// };

// export default ReturnsCreatePage;













'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import QRScannerComponent from '@/src/components/qr-scanner';
import {
  X,
  QrCode,
  Camera,
  Printer,
  CheckCircle2,
  Calendar,
  User,
  FileText,
  DollarSign,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  XCircle,
  RotateCcw,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

type ReturnCondition = 'Good' | 'Standard' | 'Damage' | 'Missing' | 'Exchange';

interface RentalAgreementMachine {
  id: string;
  model: string;
  serialNumber: string;
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
    model: string;
    description: string;
    returnType: ReturnCondition;
    damageNote?: string;
    photosCount?: number;
  }>;
}

function normalizeSerial(input: string): string {
  return (input || '').trim().toUpperCase();
}

function extractSerialFromQR(decodedText: string): string {
  const raw = (decodedText || '').trim();
  if (!raw) return '';

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const candidates = [
        parsed.serialNo,
        parsed.serialNO,
        parsed.serial,
        parsed.serialNumber,
        parsed.SerialNo,
        parsed.Serial,
        parsed.SerialNumber,
        parsed.machineSerial,
        parsed.machineSerialNo,
      ].filter((v: any) => typeof v === 'string' && v.trim().length > 0);

      if (candidates.length > 0) return candidates[0].trim();
    }
  } catch {
    // ignore
  }

  const m =
    raw.match(/serial\s*(no|number)?\s*[:\-]\s*([A-Za-z0-9\-_/]+)\s*$/i) ||
    raw.match(/^([A-Za-z0-9][A-Za-z0-9\-_/]{3,})$/);

  if (m) {
    const val = (m[2] || m[1] || '').trim();
    if (val) return val;
  }

  return raw;
}

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
        description: 'Excavator CAT 320 - Unit 01',
      },
      {
        id: 'MACH-001-02',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-002',
        description: 'Excavator CAT 320 - Unit 02',
      },
      {
        id: 'MACH-001-03',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-003',
        description: 'Excavator CAT 320 - Unit 03',
      },
      {
        id: 'MACH-001-04',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-004',
        description: 'Excavator CAT 320 - Unit 04',
      },
      {
        id: 'MACH-001-05',
        model: 'CAT 320',
        serialNumber: 'SN-CAT320-2023-005',
        description: 'Excavator CAT 320 - Unit 05',
      },
      {
        id: 'MACH-002-01',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-001',
        description: 'Bulldozer CAT D6 - Unit 01',
      },
      {
        id: 'MACH-002-02',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-002',
        description: 'Bulldozer CAT D6 - Unit 02',
      },
      {
        id: 'MACH-002-03',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-003',
        description: 'Bulldozer CAT D6 - Unit 03',
      },
      {
        id: 'MACH-002-04',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-004',
        description: 'Bulldozer CAT D6 - Unit 04',
      },
      {
        id: 'MACH-002-05',
        model: 'CAT D6',
        serialNumber: 'SN-CATD6-2023-005',
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
        description: 'Loader CAT 950 - Unit 01',
      },
      {
        id: 'MACH-010-02',
        model: 'Loader CAT 950',
        serialNumber: 'SN-CAT950-2022-002',
        description: 'Loader CAT 950 - Unit 02',
      },
      {
        id: 'MACH-010-03',
        model: 'Loader CAT 950',
        serialNumber: 'SN-CAT950-2022-003',
        description: 'Loader CAT 950 - Unit 03',
      },
      {
        id: 'MACH-010-04',
        model: 'Loader CAT 950',
        serialNumber: 'SN-CAT950-2022-004',
        description: 'Loader CAT 950 - Unit 04',
      },
    ],
  },
];

const ReturnsCreatePage: React.FC = () => {
  const router = useRouter();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [agreementNumberInput, setAgreementNumberInput] = useState('');
  const [selectedAgreement, setSelectedAgreement] = useState<RentalAgreement | null>(null);
  const [machines, setMachines] = useState<MachineReturnState[]>([]);
  const [selectedMachineIndex, setSelectedMachineIndex] = useState<number | null>(null);
  const [scannerKey, setScannerKey] = useState(1);
  const [showAgreementDetails, setShowAgreementDetails] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalMachines = machines.length;
  const scannedMachines = useMemo(
    () => machines.filter((m) => m.scanned).length,
    [machines]
  );
  const damagedMachinesCount = useMemo(
    () =>
      machines.filter(
        (m) => m.returnType === 'Damage' || m.returnType === 'Missing'
      ).length,
    [machines]
  );

  const allScanned = totalMachines > 0 && scannedMachines === totalMachines;

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  const showFeedback = (fb: { type: ScanResultType; title: string; message: string }) => {
    setLastFeedback(fb);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setLastFeedback(null), 2500);
  };

  const restartScannerSoon = () => {
    setTimeout(() => setScannerKey((k) => k + 1), 450);
  };

  const resetAllState = () => {
    machines.forEach((m) => {
      m.photoPreviews?.forEach((p) => URL.revokeObjectURL(p));
    });
    setCurrentStep(1);
    setAgreementNumberInput('');
    setSelectedAgreement(null);
    setMachines([]);
    setSelectedMachineIndex(null);
    setScannerKey((k) => k + 1);
    setLastFeedback(null);
    setIsSubmitting(false);
    setShowAgreementDetails(false);
  };

  const handleCancel = () => {
    resetAllState();
    router.push('/returns');
  };

  const handleFindAgreement = () => {
    const input = agreementNumberInput.trim();
    if (!input) {
      alert('Please enter a rental agreement number.');
      return;
    }

    const agreement = mockRentalAgreements.find(
      (a) => a.id.toLowerCase() === input.toLowerCase()
    );

    if (!agreement) {
      alert('Agreement not found. Please check the number.');
      setSelectedAgreement(null);
      setMachines([]);
      setSelectedMachineIndex(null);
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
    setSelectedMachineIndex(initialMachines.length > 0 ? 0 : null);
    setCurrentStep(1);
    setLastFeedback(null);
    setScannerKey((k) => k + 1);
  };

  const handleProceedToScanning = () => {
    if (!selectedAgreement) {
      alert('Please select a rental agreement first.');
      return;
    }
    if (machines.length === 0) {
      alert('This agreement has no machines assigned.');
      return;
    }
    setCurrentStep(2);
  };

  const handleBackToAgreementStep = () => {
    setCurrentStep(1);
  };

  const handleScanSuccess = (decodedText: string) => {
    if (machines.length === 0) return;

    const extracted = normalizeSerial(extractSerialFromQR(decodedText));
    if (!extracted) {
      showFeedback({
        type: 'failed',
        title: 'Scan Failed',
        message: 'Could not extract a serial number from this QR.',
      });
      restartScannerSoon();
      return;
    }

    const machineIndex = machines.findIndex(
      (m) => normalizeSerial(m.serialNumber) === extracted
    );

    if (machineIndex === -1) {
      showFeedback({
        type: 'failed',
        title: 'Not In Agreement',
        message: `${extracted} is NOT listed in this rental agreement.`,
      });
      restartScannerSoon();
      return;
    }

    const machine = machines[machineIndex];

    if (machine.scanned) {
      showFeedback({
        type: 'duplicate',
        title: 'Already Scanned',
        message: `${extracted} was already scanned for this return.`,
      });
      restartScannerSoon();
      setSelectedMachineIndex(machineIndex);
      return;
    }

    const updated = machines.map((m, idx) =>
      idx === machineIndex
        ? {
            ...m,
            scanned: true,
            returnType: m.returnType ?? 'Good',
          }
        : m
    );
    setMachines(updated);
    setSelectedMachineIndex(machineIndex);

    showFeedback({
      type: 'success',
      title: 'Machine Matched',
      message: `${extracted} matched with agreement and marked as scanned.`,
    });
    restartScannerSoon();
  };

  const updateMachineAtIndex = (
    index: number,
    updater: (current: MachineReturnState) => MachineReturnState
  ) => {
    setMachines((prev) =>
      prev.map((m, i) => (i === index ? updater(m) : m))
    );
  };

  const handleReturnTypeChange = (index: number, type: ReturnCondition) => {
    updateMachineAtIndex(index, (m) => ({
      ...m,
      scanned: true,
      returnType: type,
    }));
  };

  const handleDamageNoteChange = (index: number, note: string) => {
    updateMachineAtIndex(index, (m) => ({
      ...m,
      damageNote: note,
    }));
  };

  const handlePhotoUpload = (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    updateMachineAtIndex(index, (m) => {
      const existingPreviews = m.photoPreviews || [];
      const newPreviews = fileArray.map((f) => URL.createObjectURL(f));

      return {
        ...m,
        photos: [...(m.photos || []), ...fileArray],
        photoPreviews: [...existingPreviews, ...newPreviews],
      };
    });
  };

  const handleRemovePhoto = (machineIndex: number, photoIndex: number) => {
    updateMachineAtIndex(machineIndex, (m) => {
      const photos = m.photos ? [...m.photos] : [];
      const previews = m.photoPreviews ? [...m.photoPreviews] : [];

      if (previews[photoIndex]) {
        URL.revokeObjectURL(previews[photoIndex]);
      }

      photos.splice(photoIndex, 1);
      previews.splice(photoIndex, 1);

      return {
        ...m,
        photos,
        photoPreviews: previews,
      };
    });
  };

  const generateReturnNumber = (): string => {
    const num = Math.floor(Math.random() * 1000000);
    return `RET-${new Date().getFullYear()}-${num.toString().padStart(4, '0')}`;
  };

  const handleCreateReturn = async () => {
    if (!selectedAgreement) {
      alert('Please select a rental agreement first.');
      return;
    }

    if (machines.length === 0) {
      alert('No machines found for this agreement.');
      return;
    }

    if (!allScanned) {
      alert('Please scan all machines before creating the return.');
      return;
    }

    for (const machine of machines) {
      if (!machine.returnType) {
        alert(
          `Please select a return type for machine with serial: ${machine.serialNumber}`
        );
        return;
      }

      if (
        (machine.returnType === 'Damage' ||
          machine.returnType === 'Missing') &&
        (!machine.damageNote || !machine.damageNote.trim())
      ) {
        alert(
          `Please enter a damage/missing note for machine with serial: ${machine.serialNumber}`
        );
        return;
      }

      if (
        (machine.returnType === 'Damage' ||
          machine.returnType === 'Missing') &&
        (!machine.photos || machine.photos.length === 0)
      ) {
        alert(
          `Please add at least one photo as proof for machine with serial: ${machine.serialNumber}`
        );
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
          model: m.model,
          description: m.description,
          returnType: m.returnType as ReturnCondition,
          damageNote:
            m.returnType === 'Damage' || m.returnType === 'Missing'
              ? m.damageNote
              : undefined,
          photosCount:
            m.returnType === 'Damage' || m.returnType === 'Missing'
              ? (m.photos || []).length
              : undefined,
        })),
      };

      console.log('Return payload (frontend only):', payload);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert(
        `Return ${payload.returnNumber} created successfully! (frontend only – printing stub).`
      );
      resetAllState();
      router.push('/returns');
    } catch (error) {
      console.error('Error creating return:', error);
      alert('Failed to create return. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderScanFeedback = () => {
    if (!lastFeedback) return null;

    const styles =
      lastFeedback.type === 'success'
        ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-200'
        : lastFeedback.type === 'duplicate'
        ? 'bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-200'
        : 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-200';

    return (
      <div className={`p-4 rounded-lg border-2 ${styles} mb-4`}>
        <div className="font-bold text-base">{lastFeedback.title}</div>
        <div className="text-sm mt-1">{lastFeedback.message}</div>
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

      <main
        className={`pt-28 lg:pt-32 p-4 sm:p-6 transition-all duration-300 ${
          isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
        }`}
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Create Return
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {currentStep === 1
                  ? 'Find your rental agreement to get started'
                  : 'Scan machines and record their condition'}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
          </div>

          {/* Progress Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                    currentStep >= 1
                      ? 'bg-blue-600 dark:bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {currentStep > 1 ? <CheckCircle2 className="w-6 h-6" /> : '1'}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Find Agreement</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Enter agreement number
                  </div>
                </div>
              </div>

              <div className="flex-1 h-1 mx-4 bg-gray-200 dark:bg-slate-700">
                <div
                  className={`h-full transition-all ${
                    currentStep > 1
                      ? 'w-full bg-blue-600 dark:bg-indigo-600'
                      : 'w-0'
                  }`}
                />
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                    currentStep >= 2
                      ? 'bg-blue-600 dark:bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  2
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Scan Machines</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Record return condition
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 1: Find Agreement */}
          {currentStep === 1 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Enter Agreement Number
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Type the rental agreement number to load all machines
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Agreement Number
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <input
                        type="text"
                        value={agreementNumberInput}
                        onChange={(e) => setAgreementNumberInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleFindAgreement();
                          }
                        }}
                        placeholder="e.g., AGR-2024-001"
                        className="block w-full pl-12 pr-4 py-3 text-base border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleFindAgreement}
                      className="px-6 py-3 bg-blue-600 dark:bg-indigo-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 flex items-center gap-2 min-w-[140px] justify-center"
                    >
                      <Search className="w-5 h-5" />
                      <span>Search</span>
                    </button>
                  </div>
                </div>

                {selectedAgreement && (
                  <div className="mt-6 space-y-4">
                    {/* Simple Agreement Summary */}
                    <div className="bg-blue-50 dark:bg-indigo-900/20 rounded-lg border-2 border-blue-200 dark:border-indigo-800 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {selectedAgreement.customerName}
                        </h3>
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-600 dark:bg-indigo-600 text-white">
                          {selectedAgreement.id}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                            {selectedAgreement.customerPhone}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Machines:</span>
                          <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                            {totalMachines}
                          </span>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      <button
                        onClick={() => setShowAgreementDetails(!showAgreementDetails)}
                        className="mt-4 w-full flex items-center justify-between text-sm font-medium text-blue-700 dark:text-indigo-300 hover:text-blue-800 dark:hover:text-indigo-200"
                      >
                        <span>View full details</span>
                        {showAgreementDetails ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {showAgreementDetails && (
                        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-indigo-800 space-y-3 text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Address:</span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {selectedAgreement.customerAddress}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400">Email:</span>
                            <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                              {selectedAgreement.customerEmail}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                {new Date(selectedAgreement.rentalStartDate).toLocaleDateString(
                                  'en-LK'
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                {new Date(selectedAgreement.rentalEndDate).toLocaleDateString(
                                  'en-LK'
                                )}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-blue-200 dark:border-indigo-800">
                            <div>
                              <div className="text-gray-600 dark:text-gray-400">Total Amount</div>
                              <div className="font-bold text-gray-900 dark:text-white">
                                Rs.{' '}
                                {selectedAgreement.totalAmount.toLocaleString('en-LK', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-gray-400">Paid</div>
                              <div className="font-bold text-green-600 dark:text-green-400">
                                Rs.{' '}
                                {selectedAgreement.paidAmount.toLocaleString('en-LK', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600 dark:text-gray-400">Outstanding</div>
                              <div className="font-bold text-red-600 dark:text-red-400">
                                Rs.{' '}
                                {selectedAgreement.outstandingAmount.toLocaleString('en-LK', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Simple Machine List */}
                    <div className="space-y-3">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        Machines ({totalMachines})
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {machines.map((m, idx) => (
                          <div
                            key={m.id}
                            className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-200 dark:border-slate-600"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {m.model}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                                  {m.serialNumber}
                                </div>
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                #{idx + 1}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleProceedToScanning}
                      disabled={!selectedAgreement || machines.length === 0}
                      className="w-full py-4 bg-blue-600 dark:bg-indigo-600 text-white text-base font-bold rounded-lg hover:bg-blue-700 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span>Continue to Scanning</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Scan Machines */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Progress Summary */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-5">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {totalMachines}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      {scannedMachines}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Scanned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {damagedMachinesCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Damage/Missing
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-blue-600 dark:bg-indigo-600 h-3 rounded-full transition-all"
                      style={{ width: `${(scannedMachines / totalMachines) * 100}%` }}
                    />
                  </div>
                  <div className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {scannedMachines} of {totalMachines} machines scanned
                  </div>
                </div>
              </div>

              {/* Scanner Section */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Scan Machine QR Code
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Point camera at the QR code on the machine
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerKey((k) => k + 1);
                      setLastFeedback(null);
                    }}
                    className="px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart
                  </button>
                </div>

                {renderScanFeedback()}

                <div className="bg-gray-900 rounded-lg overflow-hidden">
                  <div className="h-[400px]">
                    <QRScannerComponent
                      key={scannerKey}
                      onScanSuccess={handleScanSuccess}
                      autoClose={false}
                      showCloseButton={false}
                      title="Scan Machine QR"
                      subtitle={`${scannedMachines}/${totalMachines} scanned`}
                    />
                  </div>
                </div>
              </div>

              {/* Machine List - Simple Cards */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Machines List
                </h2>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {machines.map((m, idx) => (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMachineIndex(idx)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedMachineIndex === idx
                          ? 'border-blue-600 dark:border-indigo-500 bg-blue-50 dark:bg-indigo-900/20'
                          : m.scanned
                          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10'
                          : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="font-bold text-lg text-gray-900 dark:text-white">
                              {m.model}
                            </div>
                            {m.scanned && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </div>
                          <div className="text-sm font-mono text-gray-600 dark:text-gray-400">
                            {m.serialNumber}
                          </div>
                          {m.returnType && (
                            <div className="mt-2">
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                {m.returnType}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-2xl font-bold text-gray-400 dark:text-gray-500">
                          #{idx + 1}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Machine Editor - Prominent */}
              {selectedMachineIndex !== null && selectedMachineIndex >= 0 && selectedMachineIndex < machines.length && (
                <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-blue-500 dark:border-indigo-500 p-6">
                  <div className="mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Set Return Condition
                    </h2>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold">Machine:</span> {machines[selectedMachineIndex].model} •{' '}
                      <span className="font-mono">{machines[selectedMachineIndex].serialNumber}</span>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {/* Return Type - Larger Buttons */}
                    <div>
                      <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        How is this machine being returned? <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(['Good', 'Standard', 'Damage', 'Missing', 'Exchange'] as ReturnCondition[]).map(
                          (type) => {
                            const machine = machines[selectedMachineIndex];
                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => handleReturnTypeChange(selectedMachineIndex, type)}
                                className={`p-4 rounded-lg border-2 text-left transition-all ${
                                  machine.returnType === type
                                    ? 'border-blue-600 dark:border-indigo-500 bg-blue-50 dark:bg-indigo-900/30'
                                    : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-blue-400 dark:hover:border-indigo-400'
                                }`}
                              >
                                <div className="font-bold text-base text-gray-900 dark:text-white mb-1">
                                  {type}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {type === 'Good'
                                    ? 'Excellent condition'
                                    : type === 'Standard'
                                    ? 'Normal wear & tear'
                                    : type === 'Damage'
                                    ? 'Damaged - photos required'
                                    : type === 'Missing'
                                    ? 'Missing parts - photos required'
                                    : 'Exchange with another'}
                                </div>
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {/* Damage/Missing Fields */}
                    {(machines[selectedMachineIndex].returnType === 'Damage' ||
                      machines[selectedMachineIndex].returnType === 'Missing') && (
                      <>
                        <div>
                          <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Describe the issue <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={machines[selectedMachineIndex].damageNote || ''}
                            onChange={(e) =>
                              handleDamageNoteChange(selectedMachineIndex, e.target.value)
                            }
                            rows={4}
                            placeholder="Describe the damage or missing parts in detail..."
                            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            Add Photos as Proof <span className="text-red-500">*</span>
                          </label>

                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            className="hidden"
                            id={`camera-${selectedMachineIndex}`}
                            onChange={(e) =>
                              handlePhotoUpload(selectedMachineIndex, e.target.files)
                            }
                          />
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            id={`upload-${selectedMachineIndex}`}
                            onChange={(e) =>
                              handlePhotoUpload(selectedMachineIndex, e.target.files)
                            }
                          />

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <label
                              htmlFor={`camera-${selectedMachineIndex}`}
                              className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Camera className="w-5 h-5 mr-2 text-gray-500" />
                              <span className="font-medium">Take Photo</span>
                            </label>
                            <label
                              htmlFor={`upload-${selectedMachineIndex}`}
                              className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              <QrCode className="w-5 h-5 mr-2 text-gray-500" />
                              <span className="font-medium">Choose from Gallery</span>
                            </label>
                          </div>

                          {machines[selectedMachineIndex].photoPreviews &&
                            machines[selectedMachineIndex].photoPreviews.length > 0 && (
                              <div className="grid grid-cols-4 gap-3 mt-4">
                                {machines[selectedMachineIndex].photoPreviews.map((preview, idx) => (
                                  <div key={idx} className="relative group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={preview}
                                      alt={`Proof ${idx + 1}`}
                                      className="w-full h-24 object-cover rounded-lg border-2 border-gray-300 dark:border-slate-600"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePhoto(selectedMachineIndex, idx)}
                                      className="absolute top-1 right-1 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <button
                    type="button"
                    onClick={handleBackToAgreementStep}
                    className="px-6 py-3 text-base font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Agreement</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateReturn}
                    disabled={!allScanned || isSubmitting}
                    className={`px-8 py-4 text-base font-bold text-white rounded-lg flex items-center gap-2 ${
                      allScanned && !isSubmitting
                        ? 'bg-blue-600 dark:bg-indigo-600 hover:bg-blue-700 dark:hover:bg-indigo-700'
                        : 'bg-gray-400 dark:bg-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-5 h-5" />
                        <span>Create Return & Print</span>
                      </>
                    )}
                  </button>
                </div>

                {!allScanned && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Please scan all {totalMachines} machines before creating the return. For
                      damaged or missing machines, make sure to add notes and photos.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReturnsCreatePage;