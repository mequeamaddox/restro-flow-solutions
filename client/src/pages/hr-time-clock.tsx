import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Play, Square, Coffee, UserCheck, Timer, Edit, Trash2, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  department?: { name: string };
  position?: { title: string };
}

interface TimeEntry {
  id: string;
  employeeId: string;
  clockInTime: string;
  clockOutTime?: string;
  breakStartTime?: string;
  breakEndTime?: string;
  totalHours?: string;
  status: 'clocked-in' | 'clocked-out' | 'on-break';
  notes?: string;
  employee?: Employee;
}

export default function HRTimeClock() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    clockInTime: '',
    clockOutTime: '',
    breakStartTime: '',
    breakEndTime: '',
    notes: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/hr/employees'],
  });

  const { data: timeEntries = [], isLoading: entriesLoading } = useQuery<TimeEntry[]>({
    queryKey: ['/api/hr/time-entries'],
  });

  const clockInMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      return await apiRequest('POST', `/api/hr/time-clock/in/${employeeId}`, {});
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Clocked in successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-entries'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to clock in", variant: "destructive" });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async (entryId: string) => {
      return await apiRequest('POST', `/api/hr/time-clock/out/${entryId}`, {});
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Clocked out successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-entries'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to clock out", variant: "destructive" });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      return await apiRequest('PUT', `/api/hr/time-entries/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Time entry updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-entries'] });
      setShowEditDialog(false);
      setEditingEntry(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update time entry", variant: "destructive" });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (entryId: string) => {
      return await apiRequest('DELETE', `/api/hr/time-entries/${entryId}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Time entry deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/time-entries'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete time entry", variant: "destructive" });
    },
  });

  const currentTime = new Date().toLocaleTimeString();
  const currentDate = new Date().toLocaleDateString();

  // Get active time entries (employees currently clocked in)
  const activeEntries = timeEntries.filter((entry: TimeEntry) => 
    entry.status === 'clocked-in' || entry.status === 'on-break'
  );

  // Get recent completed entries (last 7 days)
  const recentEntries = timeEntries.filter((entry: TimeEntry) => {
    const entryDate = new Date(entry.clockInTime);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return entryDate >= sevenDaysAgo && entry.status === 'clocked-out';
  }).sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());

  const getActiveEntry = (employeeId: string) => {
    return activeEntries.find((entry: TimeEntry) => entry.employeeId === employeeId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clocked-in': return 'bg-green-100 text-green-800';
      case 'on-break': return 'bg-yellow-100 text-yellow-800';
      case 'clocked-out': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clocked-in': return <UserCheck className="h-4 w-4" />;
      case 'on-break': return <Coffee className="h-4 w-4" />;
      case 'clocked-out': return <Square className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditForm({
      clockInTime: entry.clockInTime ? new Date(entry.clockInTime).toISOString().slice(0, 16) : '',
      clockOutTime: entry.clockOutTime ? new Date(entry.clockOutTime).toISOString().slice(0, 16) : '',
      breakStartTime: entry.breakStartTime ? new Date(entry.breakStartTime).toISOString().slice(0, 16) : '',
      breakEndTime: entry.breakEndTime ? new Date(entry.breakEndTime).toISOString().slice(0, 16) : '',
      notes: entry.notes || ''
    });
    setShowEditDialog(true);
  };

  const handleUpdateEntry = () => {
    if (!editingEntry) return;
    
    const updateData: any = {};
    if (editForm.clockInTime) updateData.clockInTime = editForm.clockInTime;
    if (editForm.clockOutTime) updateData.clockOutTime = editForm.clockOutTime;
    if (editForm.breakStartTime) updateData.breakStartTime = editForm.breakStartTime;
    if (editForm.breakEndTime) updateData.breakEndTime = editForm.breakEndTime;
    updateData.notes = editForm.notes;
    
    updateEntryMutation.mutate({ id: editingEntry.id, data: updateData });
  };

  const handleDeleteEntry = (entryId: string) => {
    if (confirm('Are you sure you want to delete this time entry?')) {
      deleteEntryMutation.mutate(entryId);
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (employeesLoading || entriesLoading) {
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
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Clock className="h-8 w-8" />
          Time Clock
        </h1>
        <p className="text-gray-600">Track employee hours and manage time entries</p>
      </div>

      {/* Current Time Display */}
      <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-800">
            {currentTime}
          </CardTitle>
          <CardDescription className="text-blue-600 text-lg">
            {currentDate}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Currently Clocked In */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              Currently Working ({activeEntries.length})
            </CardTitle>
            <CardDescription>Employees currently clocked in or on break</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No employees currently clocked in</p>
              </div>
            ) : (
              activeEntries.map((entry: TimeEntry) => {
                const employee = employees.find((emp: Employee) => emp.id === entry.employeeId);
                if (!employee) return null;

                return (
                  <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={employee.profilePhoto} />
                        <AvatarFallback>{getInitials(employee.firstName, employee.lastName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{employee.firstName} {employee.lastName}</p>
                        <p className="text-sm text-gray-500">{employee.position?.title}</p>
                        <p className="text-xs text-gray-400">
                          Started: {new Date(entry.clockInTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(entry.status)}>
                        {getStatusIcon(entry.status)}
                        <span className="ml-2 capitalize">{entry.status.replace('-', ' ')}</span>
                      </Badge>
                      <p className="text-sm text-gray-500 mt-1">
                        {formatDuration(entry.clockInTime)}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => clockOutMutation.mutate(entry.id)}
                        disabled={clockOutMutation.isPending}
                      >
                        Clock Out
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Clock In Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-600" />
              Clock In Employee
            </CardTitle>
            <CardDescription>Select an employee to clock them in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
              {employees
                .filter((employee: Employee) => !getActiveEntry(employee.id))
                .map((employee: Employee) => (
                  <div
                    key={employee.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedEmployeeId === employee.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedEmployeeId(employee.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={employee.profilePhoto} />
                        <AvatarFallback className="text-xs">
                          {getInitials(employee.firstName, employee.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{employee.firstName} {employee.lastName}</p>
                        <p className="text-xs text-gray-500">{employee.position?.title}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {employees.filter((employee: Employee) => !getActiveEntry(employee.id)).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>All employees are currently clocked in</p>
              </div>
            )}

            <Button
              className="w-full"
              disabled={!selectedEmployeeId || clockInMutation.isPending}
              onClick={() => {
                if (selectedEmployeeId) {
                  clockInMutation.mutate(selectedEmployeeId);
                  setSelectedEmployeeId("");
                }
              }}
            >
              <Play className="h-4 w-4 mr-2" />
              Clock In Selected Employee
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Completed Entries */}
      {recentEntries.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-gray-600" />
              Recent Completed Shifts ({recentEntries.length})
            </CardTitle>
            <CardDescription>Recent completed shifts - click Edit to modify time punches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentEntries.map((entry: TimeEntry) => {
                const employee = employees.find((emp: Employee) => emp.id === entry.employeeId);
                if (!employee) return null;

                return (
                  <div key={entry.id} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={employee.profilePhoto} />
                        <AvatarFallback className="text-xs">
                          {getInitials(employee.firstName, employee.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{employee.firstName} {employee.lastName}</p>
                        <p className="text-xs text-gray-500">{employee.position?.title}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date:</span>
                        <span className="text-xs">{new Date(entry.clockInTime).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Clock In:</span>
                        <span>{new Date(entry.clockInTime).toLocaleTimeString()}</span>
                      </div>
                      {entry.clockOutTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Clock Out:</span>
                          <span>{new Date(entry.clockOutTime).toLocaleTimeString()}</span>
                        </div>
                      )}
                      {entry.totalHours && (
                        <div className="flex justify-between font-medium">
                          <span className="text-gray-500">Total Hours:</span>
                          <span>{entry.totalHours}h</span>
                        </div>
                      )}
                      {entry.notes && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Notes:</span>
                          <span className="text-xs">{entry.notes}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Manager Controls */}
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditEntry(entry)}
                        data-testid={`button-edit-${entry.id}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteEntry(entry.id)}
                        data-testid={`button-delete-${entry.id}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Time Entry Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>
              {editingEntry && (
                <>Edit time punch for {employees.find(emp => emp.id === editingEntry.employeeId)?.firstName} {employees.find(emp => emp.id === editingEntry.employeeId)?.lastName}</>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clockIn" className="text-right">Clock In</Label>
              <Input
                id="clockIn"
                type="datetime-local"
                className="col-span-3"
                value={editForm.clockInTime}
                onChange={(e) => setEditForm({...editForm, clockInTime: e.target.value})}
                data-testid="input-clock-in-time"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="clockOut" className="text-right">Clock Out</Label>
              <Input
                id="clockOut"
                type="datetime-local"
                className="col-span-3"
                value={editForm.clockOutTime}
                onChange={(e) => setEditForm({...editForm, clockOutTime: e.target.value})}
                data-testid="input-clock-out-time"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="breakStart" className="text-right">Break Start</Label>
              <Input
                id="breakStart"
                type="datetime-local"
                className="col-span-3"
                value={editForm.breakStartTime}
                onChange={(e) => setEditForm({...editForm, breakStartTime: e.target.value})}
                data-testid="input-break-start-time"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="breakEnd" className="text-right">Break End</Label>
              <Input
                id="breakEnd"
                type="datetime-local"
                className="col-span-3"
                value={editForm.breakEndTime}
                onChange={(e) => setEditForm({...editForm, breakEndTime: e.target.value})}
                data-testid="input-break-end-time"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">Notes</Label>
              <Textarea
                id="notes"
                className="col-span-3"
                value={editForm.notes}
                onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                placeholder="Add notes about this time entry..."
                data-testid="textarea-notes"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateEntry}
              disabled={updateEntryMutation.isPending}
              data-testid="button-save-changes"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}