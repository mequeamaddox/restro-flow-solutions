import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  TrendingUp,
  AlertCircle,
  Download,
  Eye,
  Camera,
  FileImage,
  Scan
} from "lucide-react";
import { format } from "date-fns";

const invoiceSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1, "Invoice date is required"),
  dueDate: z.string().optional(),
  subtotal: z.number().min(0, "Subtotal must be positive"),
  tax: z.number().min(0, "Tax must be positive").default(0),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

export default function InvoiceProcessing() {
  const { toast } = useToast();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices", statusFilter],
    queryFn: () => apiRequest("GET", `/api/invoices?status=${statusFilter}`).then(r => r.json()),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["/api/vendors"],
    queryFn: () => apiRequest("GET", "/api/vendors").then(r => r.json()),
  });

  const { data: processingStats } = useQuery({
    queryKey: ["/api/invoices/stats"],
    queryFn: () => apiRequest("GET", "/api/invoices/stats").then(r => r.json()),
  });

  // Mutations
  const uploadInvoiceMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("invoice", file);

      const response = await fetch("/api/invoices/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "OCR Processing Complete",
        description: `Invoice processed with ${data.ocrConfidence}% confidence`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/stats"] });
      setUploadProgress(0);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const response = await apiRequest("POST", "/api/invoices", data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create invoice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateInvoiceStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/invoices/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      subtotal: 0,
      tax: 0,
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPEG, PNG, or PDF file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await uploadInvoiceMutation.mutateAsync(file);
      setUploadProgress(100);
    } catch (error) {
      clearInterval(progressInterval);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-500", label: "Pending" },
      processing: { color: "bg-blue-500", label: "Processing" },
      approved: { color: "bg-green-500", label: "Approved" },
      paid: { color: "bg-emerald-500", label: "Paid" },
      rejected: { color: "bg-red-500", label: "Rejected" },
      overdue: { color: "bg-orange-500", label: "Overdue" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Invoice Processing</h1>
          <p className="text-slate-300 mt-2">Automated invoice management and approval workflow</p>
        </div>
        <div className="flex gap-3">
          <Button 
            className="bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white shadow-lg"
            onClick={triggerFileUpload}
            disabled={isUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? "Processing..." : "Upload Invoice"}
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />

          {isUploading && (
            <div className="flex items-center gap-3 bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Scan className="h-4 w-4 animate-pulse text-orange-400" />
                Processing with OCR...
              </div>
              <div className="text-sm text-orange-400 font-medium">{uploadProgress}%</div>
              <Progress value={uploadProgress} className="h-2 w-20" />
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm text-slate-400">Total Invoices</p>
                <p className="text-2xl font-bold text-white">{processingStats?.totalInvoices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm text-slate-400">Pending</p>
                <p className="text-2xl font-bold text-white">{processingStats?.pendingCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-400" />
              <div className="ml-4">
                <p className="text-sm text-slate-400">Overdue</p>
                <p className="text-2xl font-bold text-white">{processingStats?.overdueCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm text-slate-400">Total Amount</p>
                <p className="text-2xl font-bold text-white">${processingStats?.totalAmount?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Invoice List */}
      <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white">Recent Invoices</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-slate-700 border-slate-600">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-300">Invoice #</TableHead>
                <TableHead className="text-slate-300">Vendor</TableHead>
                <TableHead className="text-slate-300">Date</TableHead>
                <TableHead className="text-slate-300">Amount</TableHead>
                <TableHead className="text-slate-300">Status</TableHead>
                <TableHead className="text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoicesLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    Loading invoices...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    No invoices found
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice: any) => (
                  <TableRow key={invoice.id} className="border-slate-700">
                    <TableCell className="text-white font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="text-slate-300">{invoice.vendor?.name}</TableCell>
                    <TableCell className="text-slate-300">
                      {format(new Date(invoice.invoiceDate), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-slate-300">${invoice.totalAmount?.toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {invoice.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateInvoiceStatusMutation.mutate({ 
                              id: invoice.id, 
                              status: 'approved' 
                            })}
                            disabled={updateInvoiceStatusMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}