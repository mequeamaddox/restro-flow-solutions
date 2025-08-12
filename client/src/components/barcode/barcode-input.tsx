import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Camera } from "lucide-react";
import BarcodeScanner from "./barcode-scanner";

interface BarcodeInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function BarcodeInput({ value, onChange, placeholder = "Enter or scan barcode", disabled }: BarcodeInputProps) {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleBarcodeScanned = (barcode: string) => {
    onChange(barcode);
    setIsScannerOpen(false);
  };

  return (
    <>
      <div className="flex space-x-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsScannerOpen(true)}
          disabled={disabled}
          className="px-3"
          title="Scan barcode with camera"
        >
          <Camera className="h-4 w-4" />
        </Button>
      </div>
      
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </>
  );
}