import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, AlertCircle, CheckCircle, X, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CsvImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  locationId: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; field: string; message: string }>;
  totalRows: number;
}

export default function CsvImportDialog({ isOpen, onClose, locationId }: CsvImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('locationId', locationId);

      const response = await fetch('/api/inventory/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import CSV');
      }

      return response.json();
    },
    onSuccess: (data: ImportResult) => {
      setImportResult(data);
      
      if (data.success > 0) {
        queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
        queryClient.invalidateQueries({ queryKey: ['/api/inventory/low-stock'] });
        
        toast({
          title: "Import Complete",
          description: `Successfully imported ${data.success} items${data.failed > 0 ? `, ${data.failed} failed` : ''}`,
        });
      } else {
        toast({
          title: "Import Failed",
          description: "No items were imported. Please check the errors below.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import Error",
        description: error.message || "Failed to import CSV file",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = `name,quantity,unit,costPerUnit,description,categoryName,vendorName,reorderLevel,sku
Chicken Breast,50,lbs,3.50,Fresh chicken breast,Meat,Sysco Foods,10,CHK-001
Tomato Sauce,24,cans,2.25,Organic tomato sauce,Pantry,US Foods,5,TOM-002
Olive Oil,12,bottles,8.99,Extra virgin olive oil,Pantry,Sysco Foods,3,OIL-003`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded",
    });
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResult(null);
    onClose();
  };

  const handleTryAgain = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Upload className="h-6 w-6 text-blue-500" />
            Import Inventory from CSV
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Upload a CSV file to bulk import inventory items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!importResult ? (
            <>
              {/* Download Template Section */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-400" />
                      CSV Template
                    </h3>
                    <p className="text-sm text-slate-400 mb-3">
                      Download the template to see the required format and example data
                    </p>
                    <p className="text-xs text-slate-500">
                      <strong>Required columns:</strong> name, quantity, unit, costPerUnit<br />
                      <strong>Optional columns:</strong> description, categoryName, vendorName, reorderLevel, sku
                    </p>
                  </div>
                  <Button
                    onClick={handleDownloadTemplate}
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    data-testid="button-download-template"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select CSV File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-slate-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-600 file:text-white
                      hover:file:bg-blue-700
                      file:cursor-pointer cursor-pointer
                      border border-slate-600 rounded-lg
                      bg-slate-800/50"
                    data-testid="input-csv-file"
                  />
                </div>

                {selectedFile && (
                  <Alert className="bg-blue-900/20 border-blue-700">
                    <CheckCircle className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-slate-300">
                      Selected file: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </AlertDescription>
                  </Alert>
                )}

                {importMutation.isPending && (
                  <div className="space-y-2">
                    <Progress value={50} className="w-full" />
                    <p className="text-sm text-slate-400 text-center">
                      Importing inventory items...
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  disabled={importMutation.isPending}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || importMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-upload"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Import
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Import Results Section */}
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                      <div>
                        <p className="text-sm text-green-300">Successful</p>
                        <p className="text-2xl font-bold text-white" data-testid="text-success-count">
                          {importResult.success}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <X className="h-5 w-5 text-red-400" />
                      <div>
                        <p className="text-sm text-red-300">Failed</p>
                        <p className="text-2xl font-bold text-white" data-testid="text-failed-count">
                          {importResult.failed}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Error List */}
                {importResult.errors.length > 0 && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                    <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      Errors ({importResult.errors.length})
                    </h3>
                    <ScrollArea className="h-64 w-full">
                      <div className="space-y-2">
                        {importResult.errors.map((error, index) => (
                          <div
                            key={index}
                            className="bg-slate-700/50 border border-slate-600 rounded p-3 text-sm"
                            data-testid={`error-item-${index}`}
                          >
                            <p className="text-red-400 font-semibold">Row {error.row}</p>
                            <p className="text-slate-300">
                              <span className="text-slate-400">Field:</span> {error.field}
                            </p>
                            <p className="text-slate-300">
                              <span className="text-slate-400">Error:</span> {error.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Success Message */}
                {importResult.success > 0 && importResult.failed === 0 && (
                  <Alert className="bg-green-900/20 border-green-700">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-slate-300">
                      All {importResult.success} items were successfully imported!
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <Button
                  onClick={handleTryAgain}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  data-testid="button-try-again"
                >
                  Import Another File
                </Button>
                <Button
                  onClick={handleClose}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="button-close"
                >
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
