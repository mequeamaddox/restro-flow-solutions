import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeReader, setCodeReader] = useState<BrowserMultiFormatReader | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      initializeScanner();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isOpen]);

  const initializeScanner = async () => {
    try {
      const reader = new BrowserMultiFormatReader();
      setCodeReader(reader);

      // Get available video devices
      const videoDevices = await reader.listVideoInputDevices();
      setDevices(videoDevices);

      // Prefer back camera if available
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      const deviceId = backCamera?.deviceId || videoDevices[0]?.deviceId;
      setSelectedDeviceId(deviceId);

      if (deviceId) {
        startScanning(reader, deviceId);
      } else {
        setError("No camera devices found");
      }
    } catch (err) {
      console.error("Failed to initialize barcode scanner:", err);
      setError("Failed to access camera. Please ensure camera permissions are granted.");
    }
  };

  const startScanning = async (reader: BrowserMultiFormatReader, deviceId: string) => {
    if (!videoRef.current) return;

    try {
      setIsScanning(true);
      setError(null);

      await reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, error) => {
        if (result) {
          const barcode = result.getText();
          onScan(barcode);
          onClose();
        }
        if (error && !(error.name === 'NotFoundException')) {
          console.error("Scanning error:", error);
        }
      });
    } catch (err) {
      console.error("Failed to start scanning:", err);
      setError("Failed to start camera. Please check camera permissions.");
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReader) {
      codeReader.reset();
    }
    setIsScanning(false);
  };

  const switchCamera = async () => {
    if (!codeReader || devices.length <= 1) return;

    const currentIndex = devices.findIndex(device => device.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDeviceId = devices[nextIndex].deviceId;

    setSelectedDeviceId(nextDeviceId);
    stopScanning();
    await startScanning(codeReader, nextDeviceId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Camera className="h-5 w-5 mr-2" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error ? (
            <div className="text-center p-8">
              <div className="text-red-500 mb-4">{error}</div>
              <Button onClick={initializeScanner} variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-gray-900 rounded-lg object-cover"
                  playsInline
                  muted
                />
                
                {/* Scanning overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-primary-500 w-48 h-32 rounded-lg relative">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br-lg"></div>
                  </div>
                </div>
                
                {/* Scanning indicator */}
                {isScanning && (
                  <div className="absolute top-4 left-4 flex items-center bg-primary-500 text-white px-3 py-1 rounded-full text-sm">
                    <Zap className="h-4 w-4 mr-1 animate-pulse" />
                    Scanning...
                  </div>
                )}
              </div>

              <div className="text-center text-sm text-gray-600">
                Position the barcode within the frame to scan
              </div>

              <div className="flex justify-center space-x-2">
                {devices.length > 1 && (
                  <Button variant="outline" onClick={switchCamera} disabled={!isScanning}>
                    Switch Camera
                  </Button>
                )}
                <Button variant="outline" onClick={onClose}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}