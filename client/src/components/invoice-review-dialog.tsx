import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Edit3, Check, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface InvoiceReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: {
    id: string;
    vendor: string;
    invoiceNumber: string;
    invoiceDate: string;
    total: number;
    subtotal: number;
    lineItems: LineItem[];
    ocrConfidence: number;
  } | null;
}

export function InvoiceReviewDialog({ isOpen, onClose, invoiceData }: InvoiceReviewDialogProps) {
  const [editableData, setEditableData] = useState<any>(null);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize editable data when dialog opens
  React.useEffect(() => {
    if (invoiceData && isOpen) {
      setEditableData({
        vendor: invoiceData.vendor,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        total: invoiceData.total,
        subtotal: invoiceData.subtotal,
        lineItems: [...invoiceData.lineItems]
      });
    }
  }, [invoiceData, isOpen]);

  const approveInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PUT', `/api/invoices/${invoiceData?.id}/approve`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Success",
        description: "Invoice approved and saved successfully",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to approve invoice",
        variant: "destructive",
      });
    },
  });

  const rejectInvoiceMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/invoices/${invoiceData?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Success",
        description: "Invoice rejected and deleted",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reject invoice",
        variant: "destructive",
      });
    },
  });

  const handleLineItemEdit = (index: number, field: string, value: any) => {
    if (!editableData) return;
    
    const newLineItems = [...editableData.lineItems];
    newLineItems[index] = {
      ...newLineItems[index],
      [field]: field === 'quantity' || field === 'unitPrice' ? parseFloat(value) || 0 : value
    };
    
    // Recalculate total price for the line item
    if (field === 'quantity' || field === 'unitPrice') {
      newLineItems[index].totalPrice = newLineItems[index].quantity * newLineItems[index].unitPrice;
    }
    
    setEditableData({
      ...editableData,
      lineItems: newLineItems
    });
  };

  const addLineItem = () => {
    if (!editableData) return;
    
    setEditableData({
      ...editableData,
      lineItems: [...editableData.lineItems, {
        description: "New Item",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      }]
    });
  };

  const removeLineItem = (index: number) => {
    if (!editableData) return;
    
    const newLineItems = editableData.lineItems.filter((_: any, i: number) => i !== index);
    setEditableData({
      ...editableData,
      lineItems: newLineItems
    });
  };

  const calculateTotal = () => {
    if (!editableData) return 0;
    return editableData.lineItems.reduce((sum: number, item: LineItem) => sum + item.totalPrice, 0);
  };

  const handleApprove = () => {
    if (!editableData) return;
    
    const finalData = {
      ...editableData,
      total: calculateTotal(),
      subtotal: calculateTotal() // For simplicity, assuming no tax for now
    };
    
    approveInvoiceMutation.mutate(finalData);
  };

  if (!invoiceData || !editableData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Review & Edit Invoice
            <Badge variant="secondary" className="ml-2">
              {invoiceData.ocrConfidence}% OCR Confidence
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header Information */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendor">Vendor</Label>
                  <Input
                    id="vendor"
                    value={editableData.vendor}
                    onChange={(e) => setEditableData({...editableData, vendor: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={editableData.invoiceNumber}
                    onChange={(e) => setEditableData({...editableData, invoiceNumber: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="invoiceDate">Invoice Date</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={editableData.invoiceDate}
                    onChange={(e) => setEditableData({...editableData, invoiceDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Calculated Total</Label>
                  <div className="text-2xl font-bold text-green-600 mt-1">
                    ${calculateTotal().toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items ({editableData.lineItems.length})</CardTitle>
              <Button onClick={addLineItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {editableData.lineItems.map((item: LineItem, index: number) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Item #{index + 1}</span>
                      <Button
                        onClick={() => removeLineItem(index)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-3">
                      <div className="col-span-2">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleLineItemEdit(index, 'description', e.target.value)}
                          placeholder="Product description"
                        />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleLineItemEdit(index, 'quantity', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Unit Price</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleLineItemEdit(index, 'unitPrice', e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-sm text-gray-600">Line Total:</span>
                      <span className="font-semibold">${item.totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                
                {editableData.lineItems.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No line items found. Click "Add Item" to add products manually.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              onClick={() => rejectInvoiceMutation.mutate()}
              variant="destructive"
              disabled={rejectInvoiceMutation.isPending}
            >
              <X className="h-4 w-4 mr-2" />
              {rejectInvoiceMutation.isPending ? "Rejecting..." : "Reject Invoice"}
            </Button>
            
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveInvoiceMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                {approveInvoiceMutation.isPending ? "Approving..." : "Approve & Save"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}