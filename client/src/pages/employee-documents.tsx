import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { DigitalDocumentForm } from '@/components/employee/DigitalDocumentForm';
import { 
  FileText, Download, Upload, CheckCircle, Clock, AlertTriangle,
  Eye, ArrowLeft, Calendar, User, Target, Award, Star
} from "lucide-react";
import { format } from "date-fns";

interface EmployeeDocument {
  id: string;
  templateId: string;
  template: {
    name: string;
    type: string;
    description: string;
    requirements?: string;
  };
  status: 'assigned' | 'in_progress' | 'completed' | 'approved' | 'rejected';
  deadline?: string;
  notes?: string;
  assignedAt: string;
  completedAt?: string;
  filePath?: string;
  feedback?: string;
}

export default function EmployeeDocuments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDocument, setSelectedDocument] = useState<EmployeeDocument | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDigitalForm, setShowDigitalForm] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Fetch employee documents
  const { data: documents = [], isLoading } = useQuery<EmployeeDocument[]>({
    queryKey: [`/api/employees/${user?.id}/documents`],
    enabled: !!user?.id,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { documentId: string; filePath: string; fileSize: number; mimeType: string }) => {
      return await apiRequest('POST', `/api/employee-documents/${data.documentId}/upload`, {
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      });
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded",
        description: "Your document has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${user?.id}/documents`] });
      setShowUploadDialog(false);
      setSelectedDocument(null);
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Start document mutation
  const startDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return await apiRequest('PUT', `/api/employee-documents/${documentId}/start`);
    },
    onSuccess: () => {
      toast({
        title: "Document Started",
        description: "Document status updated to in progress.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${user?.id}/documents`] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update document status.",
        variant: "destructive",
      });
    },
  });

  const handleUpload = async (result: any) => {
    const uploadedFile = result.successful[0];
    if (uploadedFile && selectedDocument) {
      uploadMutation.mutate({
        documentId: selectedDocument.id,
        filePath: uploadedFile.uploadURL,
        fileSize: uploadedFile.size || 0,
        mimeType: uploadedFile.type || 'application/octet-stream',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'assigned': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'completed': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'in_progress': return <Target className="h-4 w-4 text-yellow-600" />;
      case 'assigned': return <FileText className="h-4 w-4 text-gray-600" />;
      case 'rejected': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (filter === 'all') return true;
    if (filter === 'pending') return ['assigned', 'in_progress'].includes(doc.status);
    if (filter === 'overdue') {
      return doc.deadline && new Date(doc.deadline) < new Date() && !['completed', 'approved'].includes(doc.status);
    }
    return doc.status === filter;
  });

  const stats = {
    total: documents.length,
    pending: documents.filter(doc => ['assigned', 'in_progress'].includes(doc.status)).length,
    completed: documents.filter(doc => ['completed', 'approved'].includes(doc.status)).length,
    overdue: documents.filter(doc => 
      doc.deadline && new Date(doc.deadline) < new Date() && !['completed', 'approved'].includes(doc.status)
    ).length,
  };

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="page-title">My Documents</h1>
        <p className="text-gray-600">View and complete your assigned documents</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-700">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-700">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      {stats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Completion Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-2xl font-bold text-green-600">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-3" />
              <p className="text-sm text-gray-600">
                {stats.completed} of {stats.total} documents completed
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={setFilter} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({stats.pending})
            {stats.pending > 0 && <Star className="h-3 w-3 ml-1 text-yellow-500" />}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          {stats.overdue > 0 && (
            <TabsTrigger value="overdue" className="text-red-600">
              Overdue ({stats.overdue})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          <Card>
            <CardContent className="p-6">
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                  <p className="text-gray-600">
                    {filter === 'all' ? 'No documents have been assigned to you yet.' : 
                     filter === 'overdue' ? 'No overdue documents.' :
                     `No ${filter} documents.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDocuments.map((doc) => {
                    const isOverdue = doc.deadline && new Date(doc.deadline) < new Date() && !['completed', 'approved'].includes(doc.status);
                    
                    return (
                      <div key={doc.id} className={`border rounded-lg p-6 hover:shadow-md transition-shadow ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getStatusIcon(doc.status)}
                              <h3 className="text-lg font-semibold">{doc.template?.name || 'Document'}</h3>
                              <Badge className={getStatusColor(doc.status)}>
                                {doc.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              {isOverdue && (
                                <Badge variant="destructive">OVERDUE</Badge>
                              )}
                            </div>
                            <p className="text-gray-600 mb-2">{doc.template?.description || 'No description available'}</p>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Assigned: {doc.assignedAt ? format(new Date(doc.assignedAt), 'MMM d, yyyy') : 'Unknown'}</span>
                              </div>
                              {doc.deadline && (
                                <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                                  <Clock className="h-4 w-4" />
                                  <span>Due: {doc.deadline ? format(new Date(doc.deadline), 'MMM d, yyyy') : 'No deadline'}</span>
                                </div>
                              )}
                              {doc.completedAt && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Completed: {doc.completedAt ? format(new Date(doc.completedAt), 'MMM d, yyyy') : 'Not completed'}</span>
                                </div>
                              )}
                            </div>

                            {doc.notes && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                                <p className="text-sm text-blue-800">
                                  <strong>Instructions:</strong> {doc.notes}
                                </p>
                              </div>
                            )}

                            {doc.feedback && (
                              <div className={`mt-3 p-3 border rounded ${
                                doc.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                              }`}>
                                <p className={`text-sm ${
                                  doc.status === 'rejected' ? 'text-red-800' : 'text-green-800'
                                }`}>
                                  <strong>Feedback:</strong> {doc.feedback}
                                </p>
                              </div>
                            )}

                            {doc.template?.requirements && (
                              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
                                <p className="text-sm text-gray-700">
                                  <strong>Requirements:</strong> {doc.template.requirements}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            {doc.status === 'assigned' && (
                              <Button
                                onClick={() => {
                                  setSelectedDocument(doc);
                                  setShowDigitalForm(true);
                                  startDocumentMutation.mutate(doc.id);
                                }}
                                disabled={startDocumentMutation.isPending}
                                data-testid={`button-start-${doc.id}`}
                              >
                                Start Document
                              </Button>
                            )}
                            
                            {doc.status === 'in_progress' && (
                              <Button
                                onClick={() => {
                                  setSelectedDocument(doc);
                                  setShowUploadDialog(true);
                                }}
                                data-testid={`button-upload-${doc.id}`}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload File
                              </Button>
                            )}

                            {['completed', 'approved'].includes(doc.status) && doc.filePath && (
                              <Button
                                variant="outline"
                                onClick={() => window.open(doc.filePath, '_blank')}
                                data-testid={`button-download-${doc.id}`}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              onClick={() => setSelectedDocument(doc)}
                              data-testid={`button-view-${doc.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="font-medium text-blue-900">{selectedDocument.template?.name || 'Document'}</p>
                <p className="text-sm text-blue-700">{selectedDocument.template?.description || 'No description available'}</p>
              </div>
              
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={async () => {
                  const response = await fetch('/api/objects/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                  });
                  const data = await response.json();
                  return { method: 'PUT' as const, url: data.uploadURL };
                }}
                onComplete={handleUpload}
              >
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  <span>Choose File to Upload</span>
                </div>
              </ObjectUploader>
              
              <p className="text-xs text-gray-500">
                Accepted formats: PDF, DOC, DOCX, JPG, PNG. Maximum file size: 10MB
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Digital Document Form Dialog */}
      <Dialog open={showDigitalForm} onOpenChange={() => {
        setShowDigitalForm(false);
        setSelectedDocument(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Digital Form Completion
            </DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <DigitalDocumentForm
              assignmentId={selectedDocument.id}
              templateId={selectedDocument.templateId}
              templateName={selectedDocument.template?.name || 'Document'}
              onComplete={() => {
                setShowDigitalForm(false);
                setSelectedDocument(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Document Details Dialog */}
      <Dialog open={!!selectedDocument && !showUploadDialog && !showDigitalForm} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDocument && getStatusIcon(selectedDocument.status)}
              {selectedDocument?.template?.name || 'Document'}
            </DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(selectedDocument.status)}>
                  {selectedDocument.status.replace('_', ' ').toUpperCase()}
                </Badge>
                {selectedDocument.deadline && new Date(selectedDocument.deadline) < new Date() && 
                 !['completed', 'approved'].includes(selectedDocument.status) && (
                  <Badge variant="destructive">OVERDUE</Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-600">Document Type</p>
                  <p className="capitalize">{selectedDocument.template?.type?.replace('_', ' ') || 'Unknown'}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Assigned Date</p>
                  <p>{selectedDocument.assignedAt ? format(new Date(selectedDocument.assignedAt), 'MMM d, yyyy h:mm a') : 'Unknown'}</p>
                </div>
                {selectedDocument.deadline && (
                  <div>
                    <p className="font-medium text-gray-600">Deadline</p>
                    <p className={new Date(selectedDocument.deadline) < new Date() && !['completed', 'approved'].includes(selectedDocument.status) ? 'text-red-600 font-medium' : ''}>
                      {selectedDocument.deadline ? format(new Date(selectedDocument.deadline), 'MMM d, yyyy h:mm a') : 'No deadline'}
                    </p>
                  </div>
                )}
                {selectedDocument.completedAt && (
                  <div>
                    <p className="font-medium text-gray-600">Completed Date</p>
                    <p className="text-green-600">{format(new Date(selectedDocument.completedAt), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="font-medium text-gray-600 mb-2">Description</p>
                <p className="text-gray-700">{selectedDocument.template?.description || 'No description available'}</p>
              </div>

              {selectedDocument.template?.requirements && (
                <div>
                  <p className="font-medium text-gray-600 mb-2">Requirements</p>
                  <p className="text-gray-700">{selectedDocument.template.requirements}</p>
                </div>
              )}

              {selectedDocument.notes && (
                <div>
                  <p className="font-medium text-gray-600 mb-2">Instructions</p>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-blue-800">{selectedDocument.notes}</p>
                  </div>
                </div>
              )}

              {selectedDocument.feedback && (
                <div>
                  <p className="font-medium text-gray-600 mb-2">Feedback</p>
                  <div className={`p-3 border rounded ${
                    selectedDocument.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <p className={selectedDocument.status === 'rejected' ? 'text-red-800' : 'text-green-800'}>
                      {selectedDocument.feedback}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedDocument(null)}>
                  Close
                </Button>
                
                {selectedDocument.status === 'assigned' && (
                  <Button
                    onClick={() => {
                      startDocumentMutation.mutate(selectedDocument.id);
                      setSelectedDocument(null);
                    }}
                    disabled={startDocumentMutation.isPending}
                  >
                    Start Document
                  </Button>
                )}
                
                {selectedDocument.status === 'in_progress' && (
                  <Button
                    onClick={() => {
                      setShowUploadDialog(true);
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                )}

                {['completed', 'approved'].includes(selectedDocument.status) && selectedDocument.filePath && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedDocument.filePath, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}