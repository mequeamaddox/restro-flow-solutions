import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar, Clock, Plus, Users, Edit, Trash2, AlertTriangle, DollarSign, TrendingUp, Filter } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "@/contexts/LocationContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

const shiftFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  breakDuration: z.number().min(0).max(480).default(30),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  notes: z.string().optional(),
});

type ShiftFormData = z.infer<typeof shiftFormSchema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position?: { id: string; title: string };
  department?: { id: string; name: string };
  hourlyRate?: string;
}

interface Shift {
  id: string;
  employeeId: string;
  locationId: string;
  departmentId?: string;
  positionId?: string;
  date: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  status: string;
  notes?: string;
  employee?: Employee;
}

interface Department {
  id: string;
  name: string;
}

interface Position {
  id: string;
  title: string;
  departmentId: string;
}

export default function HRScheduling() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const { toast } = useToast();
  const { currentLocation } = useLocation();

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/hr/employees', currentLocation?.id],
    queryFn: async () => {
      const response = await fetch(`/api/hr/employees?locationId=${currentLocation?.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch employees');
      return response.json();
    },
    enabled: !!currentLocation,
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ['/api/hr/shifts', currentLocation?.id],
    queryFn: async () => {
      const response = await fetch(`/api/hr/shifts?locationId=${currentLocation?.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch shifts');
      return response.json();
    },
    enabled: !!currentLocation,
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['/api/hr/departments', currentLocation?.id],
    queryFn: async () => {
      const response = await fetch(`/api/hr/departments?locationId=${currentLocation?.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch departments');
      return response.json();
    },
    enabled: !!currentLocation,
  });

  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ['/api/hr/positions', currentLocation?.id],
    queryFn: async () => {
      const response = await fetch(`/api/hr/positions?locationId=${currentLocation?.id}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch positions');
      return response.json();
    },
    enabled: !!currentLocation,
  });

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      employeeId: "",
      date: selectedDate,
      startTime: "09:00",
      endTime: "17:00",
      breakDuration: 30,
      departmentId: "",
      positionId: "",
      notes: "",
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: ShiftFormData) => {
      return await apiRequest('POST', `/api/hr/shifts?locationId=${currentLocation?.id}`, {
        ...data,
        locationId: currentLocation?.id,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shift created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts', currentLocation?.id] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create shift", variant: "destructive" });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ShiftFormData }) => {
      return await apiRequest('PUT', `/api/hr/shifts/${id}?locationId=${currentLocation?.id}`, {
        ...data,
        locationId: currentLocation?.id,
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shift updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts', currentLocation?.id] });
      setEditingShift(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update shift", variant: "destructive" });
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      return await apiRequest('DELETE', `/api/hr/shifts/${shiftId}?locationId=${currentLocation?.id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shift deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts', currentLocation?.id] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete shift", variant: "destructive" });
    },
  });

  const onSubmit = (data: ShiftFormData) => {
    // Check for conflicts (excluding the current shift if editing)
    const conflicts = detectConflicts(data, editingShift?.id);
    if (conflicts.length > 0) {
      toast({
        title: "Scheduling Conflict",
        description: `${conflicts[0].employee?.firstName} ${conflicts[0].employee?.lastName} already has a shift at this time`,
        variant: "destructive"
      });
      return;
    }

    if (editingShift) {
      updateShiftMutation.mutate({ id: editingShift.id, data });
    } else {
      createShiftMutation.mutate(data);
    }
  };

  const getWeekDates = (date: string) => {
    const currentDate = new Date(date);
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      week.push(day.toISOString().split('T')[0]);
    }
    return week;
  };

  const getShiftsForDate = (date: string) => {
    let dateShifts = shifts.filter(shift => shift.date === date);
    
    // Apply department filter
    if (departmentFilter !== "all") {
      dateShifts = dateShifts.filter(shift => 
        shift.departmentId === departmentFilter || shift.employee?.department?.id === departmentFilter
      );
    }
    
    // Apply position filter
    if (positionFilter !== "all") {
      dateShifts = dateShifts.filter(shift => 
        shift.positionId === positionFilter || shift.employee?.position?.id === positionFilter
      );
    }
    
    return dateShifts;
  };

  const getShiftHours = (startTime: string, endTime: string, breakDuration: number) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.max(0, hours - (breakDuration / 60));
  };

  const calculateLaborCost = (shift: Shift): number => {
    const employee = employees.find(e => e.id === shift.employeeId);
    if (!employee?.hourlyRate) return 0;
    const hours = getShiftHours(shift.startTime, shift.endTime, shift.breakDuration);
    return hours * parseFloat(employee.hourlyRate);
  };

  const detectConflicts = (newShift: ShiftFormData, excludeShiftId?: string): Shift[] => {
    return shifts.filter(existingShift => {
      // Skip the shift being edited
      if (excludeShiftId && existingShift.id === excludeShiftId) return false;
      
      if (existingShift.employeeId !== newShift.employeeId) return false;
      if (existingShift.date !== newShift.date) return false;
      
      const newStart = new Date(`2000-01-01T${newShift.startTime}`);
      const newEnd = new Date(`2000-01-01T${newShift.endTime}`);
      const existingStart = new Date(`2000-01-01T${existingShift.startTime}`);
      const existingEnd = new Date(`2000-01-01T${existingShift.endTime}`);
      
      return (newStart < existingEnd && newEnd > existingStart);
    });
  };

  const weekDates = getWeekDates(selectedDate);
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Calculate weekly statistics
  const weeklyStats = useMemo(() => {
    const weekShifts = shifts.filter(shift => weekDates.includes(shift.date));
    const totalHours = weekShifts.reduce((sum, shift) => 
      sum + getShiftHours(shift.startTime, shift.endTime, shift.breakDuration), 0
    );
    const totalCost = weekShifts.reduce((sum, shift) => sum + calculateLaborCost(shift), 0);
    const uniqueEmployees = new Set(weekShifts.map(s => s.employeeId)).size;
    
    return {
      totalShifts: weekShifts.length,
      totalHours: totalHours.toFixed(1),
      totalCost: totalCost.toFixed(2),
      uniqueEmployees,
    };
  }, [shifts, weekDates, employees]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    const offset = direction === 'prev' ? -7 : 7;
    current.setDate(current.getDate() + offset);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  if (employeesLoading || shiftsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!currentLocation) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a location to view schedules.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-scheduling">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Employee Scheduling</h1>
          <p className="text-gray-600">Manage schedules for {currentLocation.name}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-shift">
              <Plus className="h-4 w-4 mr-2" />
              Add Shift
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Shift</DialogTitle>
              <DialogDescription>
                Schedule a new shift for an employee
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-employee">
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.firstName} {employee.lastName} - {employee.position?.title || 'No position'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-shift-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-start-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-end-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="breakDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Break Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="480" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-break-duration"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Special instructions or notes" {...field} data-testid="input-shift-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createShiftMutation.isPending} data-testid="button-submit-shift">
                    {editingShift ? 'Update Shift' : 'Create Shift'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Weekly Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-shifts">{weeklyStats.totalShifts}</div>
            <p className="text-xs text-gray-500 mt-1">This week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-hours">{weeklyStats.totalHours}h</div>
            <p className="text-xs text-gray-500 mt-1">Scheduled hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Labor Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-labor-cost">${weeklyStats.totalCost}</div>
            <p className="text-xs text-gray-500 mt-1">Projected cost</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-employees">{weeklyStats.uniqueEmployees}</div>
            <p className="text-xs text-gray-500 mt-1">Scheduled this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger data-testid="select-department-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger data-testid="select-position-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  {positions.map(pos => (
                    <SelectItem key={pos.id} value={pos.id}>{pos.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Schedule
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')} data-testid="button-prev-week">
                ← Previous Week
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} data-testid="button-today">
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')} data-testid="button-next-week">
                Next Week →
              </Button>
            </div>
          </div>
          <CardDescription>
            Week of {new Date(weekDates[0]).toLocaleDateString()} - {new Date(weekDates[6]).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-4">
            {weekDates.map((date, index) => {
              const dayShifts = getShiftsForDate(date);
              const totalHours = dayShifts.reduce((sum, shift) => 
                sum + getShiftHours(shift.startTime, shift.endTime, shift.breakDuration), 0
              );
              const totalCost = dayShifts.reduce((sum, shift) => sum + calculateLaborCost(shift), 0);
              const isToday = date === new Date().toISOString().split('T')[0];

              return (
                <div 
                  key={date} 
                  className={`border rounded-lg p-4 min-h-[250px] ${isToday ? 'bg-blue-50 border-blue-300' : ''}`}
                  data-testid={`day-column-${index}`}
                >
                  <div className="font-medium text-sm mb-1">
                    {dayNames[index]}
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  
                  <div className="space-y-2">
                    {dayShifts.map((shift) => {
                      const employee = employees.find(emp => emp.id === shift.employeeId);
                      const hours = getShiftHours(shift.startTime, shift.endTime, shift.breakDuration);
                      const cost = calculateLaborCost(shift);
                      
                      return (
                        <div 
                          key={shift.id} 
                          className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-2 text-xs"
                          data-testid={`shift-${shift.id}`}
                        >
                          <div className="font-medium">
                            {employee?.firstName} {employee?.lastName}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {shift.startTime} - {shift.endTime}
                          </div>
                          <div className="text-gray-500 dark:text-gray-500 flex items-center justify-between">
                            <span>{hours.toFixed(1)}h</span>
                            {cost > 0 && <span className="text-green-600 dark:text-green-400">${cost.toFixed(2)}</span>}
                          </div>
                          {shift.notes && (
                            <div className="text-gray-500 text-xs italic mt-1">{shift.notes}</div>
                          )}
                          <div className="flex gap-1 mt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setEditingShift(shift);
                                form.reset({
                                  employeeId: shift.employeeId,
                                  date: shift.date,
                                  startTime: shift.startTime,
                                  endTime: shift.endTime,
                                  breakDuration: shift.breakDuration,
                                  departmentId: shift.departmentId || "",
                                  positionId: shift.positionId || "",
                                  notes: shift.notes || "",
                                });
                                setIsCreateDialogOpen(true);
                              }}
                              data-testid={`button-edit-shift-${shift.id}`}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={() => deleteShiftMutation.mutate(shift.id)}
                              data-testid={`button-delete-shift-${shift.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {dayShifts.length > 0 && (
                    <div className="mt-3 pt-2 border-t text-xs space-y-1">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users className="h-3 w-3" />
                        {dayShifts.length} shifts
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-3 w-3" />
                        {totalHours.toFixed(1)} hours
                      </div>
                      {totalCost > 0 && (
                        <div className="flex items-center gap-1 text-green-600">
                          <DollarSign className="h-3 w-3" />
                          ${totalCost.toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingShift} onOpenChange={(open) => !open && setEditingShift(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
            <DialogDescription>
              Update shift details
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.firstName} {employee.lastName} - {employee.position?.title || 'No position'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="breakDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Break Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="480" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Special instructions or notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingShift(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateShiftMutation.isPending}>
                  Update Shift
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
