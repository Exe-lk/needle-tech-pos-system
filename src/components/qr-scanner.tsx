'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerComponentProps {
  onScanSuccess: (decodedText: string) => void;
  onClose?: () => void;
}

const QRScannerComponent: React.FC<QRScannerComponentProps> = ({ onScanSuccess, onClose }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    startScanning();

    return () => {
      isMountedRef.current = false;
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (isStartingRef.current) return;
    
    try {
      isStartingRef.current = true;
      setError(null);
      
      // Clear any existing scanner instance
      await stopScanning();

      const html5QrCode = new Html5Qrcode("qr-reader-scanner");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          if (isMountedRef.current) {
            handleScanSuccess(decodedText);
          }
        },
        (errorMessage) => {
          // Ignore scanning errors
        }
      );

      if (isMountedRef.current) {
        setScanning(true);
        isStartingRef.current = false;
      }
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to start camera. Please check permissions.');
        setScanning(false);
        isStartingRef.current = false;
      }
    }
  };

  const stopScanning = async () => {
    if (isStoppingRef.current) return;
    
    try {
      isStoppingRef.current = true;
      
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (err: any) {
          // Ignore "not running" errors - this is expected when scanner hasn't started yet
          const errorMessage = err?.message || err?.toString() || '';
          if (
            !errorMessage.includes('not running') && 
            !errorMessage.includes('not started') &&
            !errorMessage.includes('Cannot stop')
          ) {
            // Only log unexpected errors
            console.error('Error stopping scanner:', err);
          }
        }
        
        try {
          scannerRef.current.clear();
        } catch (clearErr) {
          // Ignore clear errors
        }
        
        scannerRef.current = null;
      }
      
      if (isMountedRef.current) {
        setScanning(false);
      }
      isStoppingRef.current = false;
    } catch (err) {
      // Fallback cleanup
      scannerRef.current = null;
      if (isMountedRef.current) {
        setScanning(false);
      }
      isStoppingRef.current = false;
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    stopScanning();
    onScanSuccess(decodedText);
  };

  const handleClose = () => {
    stopScanning();
    if (onClose) {
      onClose();
    }
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
          <div className="mt-2 flex space-x-2">
            <button
              onClick={startScanning}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Try Again
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div
        className="relative bg-black rounded-lg overflow-hidden"
        style={{ 
          width: '100%',
          aspectRatio: '1 / 1',
          maxWidth: '500px',
          margin: '0 auto',
        }}
      >
        <div id="qr-reader-scanner" className="w-full h-full"></div>
        
        {scanning && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Stop Scanning
            </button>
          </div>
        )}

        {!scanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white text-center">
              <p className="text-lg mb-2">Initializing camera...</p>
            </div>
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
        <p>• Position the QR code within the scanning box</p>
        <p>• Ensure good lighting for better scanning</p>
      </div>
    </div>
  );
};

export default QRScannerComponent;