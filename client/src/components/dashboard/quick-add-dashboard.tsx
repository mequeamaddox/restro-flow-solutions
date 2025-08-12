import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Package, Plus } from "lucide-react";
import { useLocation } from "@/contexts/LocationContext";
import BarcodeScanner from "@/components/barcode/barcode-scanner";
import { Link } from "wouter";

export default function QuickAddDashboard() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const { currentLocation } = useLocation();

  const handleBarcodeScanned = (barcode: string) => {
    setIsScannerOpen(false);
    // Navigate to inventory page with quick-add mode
    window.location.href = `/inventory?quickAdd=true&barcode=${barcode}`;
  };

  if (!currentLocation) {
    return null;
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-lg">
            <Camera className="h-5 w-5 mr-2 text-primary-600" />
            Quick Add Inventory
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-4">
              Scan barcodes to quickly add items to your inventory
            </p>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => setIsScannerOpen(true)}
              className="w-full bg-primary-600 hover:bg-primary-700"
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan Barcode
            </Button>
            
            <Link href="/inventory">
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Go to Inventory
              </Button>
            </Link>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Adding to: {currentLocation.name}
          </div>
        </CardContent>
      </Card>

      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />
    </>
  );
}