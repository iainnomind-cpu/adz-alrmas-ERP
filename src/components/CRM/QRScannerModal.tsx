import { useState, useEffect } from 'react';
import { X, Camera, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (cardData: any) => void;
}

export function QRScannerModal({ isOpen, onClose, onScanSuccess }: QRScannerModalProps) {
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setError('');
      const html5QrCode = new Html5Qrcode('qr-reader');
      setScanner(html5QrCode);

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        onScanSuccessHandler,
        onScanFailure
      );

      setIsScanning(true);
    } catch (err) {
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
      console.error(err);
    }
  };

  const stopScanner = async () => {
    if (scanner && isScanning) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      setIsScanning(false);
    }
  };

  const onScanSuccessHandler = (decodedText: string) => {
    try {
      const cardData = JSON.parse(decodedText);
      stopScanner();
      onScanSuccess(cardData);
    } catch (err) {
      setError('QR inválido. Por favor, escanea una tarjeta digital válida.');
    }
  };

  const onScanFailure = (error: string) => {
    // No hacer nada, esto se llama continuamente mientras escanea
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Escanear Tarjeta Digital
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="bg-gray-100 rounded-lg overflow-hidden">
            <div id="qr-reader" className="w-full"></div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              Coloca el código QR de la tarjeta digital frente a la cámara para escanearlo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
