import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send, Bell, Users, Megaphone, Clock, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Message {
  id: string;
  title: string;
  content: string;
  messageType: 'announcement' | 'direct' | 'department' | 'urgent';
  recipientType: 'all' | 'department' | 'individual';
  recipientId?: string;
  senderId: string;
  isRead: boolean;
  createdAt: string;
  readBy?: Array<{
    userId: string;
    readAt: string;
  }>;
}

export default function HRMessaging() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [messageTypeFilter, setMessageTypeFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/hr/messages'],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['/api/hr/employees'],
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['/api/hr/departments'],
  });

  const createMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      return await apiRequest('POST', '/api/hr/messages', messageData);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Message sent successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/messages'] });
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    },
  });

  const filteredMessages = messages.filter((message: Message) => {
    const matchesType = messageTypeFilter === "all" || message.messageType === messageTypeFilter;
    return matchesType;
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const messageData = {
      title: formData.get('title'),
      content: formData.get('content'),
      messageType: formData.get('messageType') || 'announcement',
      recipientType: formData.get('recipientType') || 'all',
      recipientId: formData.get('recipientId') || null,
      priority: formData.get('priority') || 'normal',
    };

    createMessageMutation.mutate(messageData);
  };

  const getMessageTypeColor = (messageType: string) => {
    switch (messageType) {
      case 'announcement': return 'bg-blue-100 text-blue-800';
      case 'direct': return 'bg-green-100 text-green-800';
      case 'department': return 'bg-purple-100 text-purple-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMessageTypeIcon = (messageType: string) => {
    switch (messageType) {
      case 'announcement': return <Megaphone className="h-4 w-4" />;
      case 'direct': return <MessageSquare className="h-4 w-4" />;
      case 'department': return <Users className="h-4 w-4" />;
      case 'urgent': return <Bell className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getRecipientDisplay = (message: Message) => {
    if (message.recipientType === 'all') {
      return 'All Employees';
    } else if (message.recipientType === 'department') {
      const dept = departments.find((d: any) => d.id === message.recipientId);
      return dept ? `${dept.name} Department` : 'Department';
    } else if (message.recipientType === 'individual') {
      const emp = employees.find((e: any) => e.id === message.recipientId);
      return emp ? `${emp.firstName} ${emp.lastName}` : 'Individual';
    }
    return 'Unknown';
  };

  const getReadCount = (message: Message) => {
    if (!message.readBy) return 0;
    return message.readBy.length;
  };

  const getTotalRecipients = (message: Message) => {
    if (message.recipientType === 'all') {
      return employees.length;
    } else if (message.recipientType === 'department') {
      return employees.filter((emp: any) => emp.departmentId === message.recipientId).length;
    } else if (message.recipientType === 'individual') {
      return 1;
    }
    return 0;
  };

  const getMessagesByType = (messageType: string) => {
    return messages.filter((message: Message) => message.messageType === messageType).length;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-8 w-8" />
              Team Communication
            </h1>
            <p className="text-gray-600">Send announcements and messages to your team</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Send className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Send Message</DialogTitle>
                  <DialogDescription>
                    Create a new message or announcement for your team
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Message Title</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Enter message title..."
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="content">Message Content</Label>
                    <Textarea
                      id="content"
                      name="content"
                      placeholder="Type your message here..."
                      rows={6}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="messageType">Message Type</Label>
                      <Select name="messageType" defaultValue="announcement">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="announcement">📢 Announcement</SelectItem>
                          <SelectItem value="direct">💬 Direct Message</SelectItem>
                          <SelectItem value="department">🏢 Department</SelectItem>
                          <SelectItem value="urgent">🔔 Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="recipientType">Send To</Label>
                      <Select name="recipientType" defaultValue="all">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Employees</SelectItem>
                          <SelectItem value="department">Specific Department</SelectItem>
                          <SelectItem value="individual">Individual Employee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="recipientId">Recipient (if specific)</Label>
                    <Select name="recipientId">
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipient..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None (All Employees)</SelectItem>
                        {departments.map((dept: any) => (
                          <SelectItem key={`dept-${dept.id}`} value={dept.id}>
                            🏢 {dept.name}
                          </SelectItem>
                        ))}
                        {employees.map((employee: any) => (
                          <SelectItem key={`emp-${employee.id}`} value={employee.id}>
                            👤 {employee.firstName} {employee.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select name="priority" defaultValue="normal">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">🟢 Low Priority</SelectItem>
                        <SelectItem value="normal">🟡 Normal</SelectItem>
                        <SelectItem value="high">🔴 High Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="submit" disabled={createMessageMutation.isPending}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Message Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Announcements</p>
                  <p className="text-2xl font-bold">{getMessagesByType('announcement')}</p>
                </div>
                <div className="bg-blue-100 p-2 rounded-full">
                  <Megaphone className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Direct Messages</p>
                  <p className="text-2xl font-bold">{getMessagesByType('direct')}</p>
                </div>
                <div className="bg-green-100 p-2 rounded-full">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Department Messages</p>
                  <p className="text-2xl font-bold">{getMessagesByType('department')}</p>
                </div>
                <div className="bg-purple-100 p-2 rounded-full">
                  <Users className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Urgent Messages</p>
                  <p className="text-2xl font-bold">{getMessagesByType('urgent')}</p>
                </div>
                <div className="bg-red-100 p-2 rounded-full">
                  <Bell className="h-4 w-4 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Type Filter */}
        <div className="mt-6">
          <Select value={messageTypeFilter} onValueChange={setMessageTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Messages</SelectItem>
              <SelectItem value="announcement">📢 Announcements</SelectItem>
              <SelectItem value="direct">💬 Direct Messages</SelectItem>
              <SelectItem value="department">🏢 Department Messages</SelectItem>
              <SelectItem value="urgent">🔔 Urgent Messages</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-4">
        {filteredMessages.map((message: Message) => {
          const readCount = getReadCount(message);
          const totalRecipients = getTotalRecipients(message);
          const readPercentage = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;

          return (
            <Card key={message.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getMessageTypeColor(message.messageType)}>
                        {getMessageTypeIcon(message.messageType)}
                        <span className="ml-1 capitalize">{message.messageType}</span>
                      </Badge>
                      <span className="text-sm text-gray-500">
                        • {getRecipientDisplay(message)}
                      </span>
                    </div>
                    <CardTitle className="text-xl">{message.title}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(message.createdAt).toLocaleDateString()} at {new Date(message.createdAt).toLocaleTimeString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {readCount} of {totalRecipients} read ({readPercentage}%)
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {/* Read Status Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Read Status</span>
                    <span>{readCount}/{totalRecipients} employees</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${readPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Recent Readers */}
                {message.readBy && message.readBy.length > 0 && (
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-sm text-gray-600 mb-2">Recent readers:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.readBy.slice(0, 5).map((reader: any, index: number) => {
                        const employee = employees.find((emp: any) => emp.id === reader.userId);
                        return (
                          <div key={index} className="flex items-center gap-1 text-xs bg-gray-100 rounded-full px-2 py-1">
                            {employee && (
                              <>
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={employee.profilePhoto} />
                                  <AvatarFallback className="text-xs">
                                    {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{employee.firstName} {employee.lastName}</span>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {message.readBy.length > 5 && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          +{message.readBy.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredMessages.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
          <p className="text-gray-600 mb-4">
            {messageTypeFilter !== "all"
              ? "Try changing your message type filter"
              : "Send your first message to get started"
            }
          </p>
          {messageTypeFilter === "all" && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Send First Message
            </Button>
          )}
        </div>
      )}
    </div>
  );
}