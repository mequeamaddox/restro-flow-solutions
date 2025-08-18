import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar, Clock, Plus, Users, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const shiftFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  breakDuration: z.number().min(0).max(480).default(30),
  notes: z.string().optional(),
});

type ShiftFormData = z.infer<typeof shiftFormSchema>;

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  position?: { title: string };
  department?: { name: string };
}

interface Shift {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakDuration: number;
  status: string;
  notes?: string;
  employee?: Employee;
}

export default function HRScheduling() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/hr/employees'],
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery<Shift[]>({
    queryKey: ['/api/hr/shifts'],
  });

  const form = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      employeeId: "",
      date: selectedDate,
      startTime: "09:00",
      endTime: "17:00",
      breakDuration: 30,
      notes: "",
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: ShiftFormData) => {
      return await apiRequest('POST', '/api/hr/shifts', data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shift created successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create shift", variant: "destructive" });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ShiftFormData }) => {
      return await apiRequest('PUT', `/api/hr/shifts/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shift updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
      setEditingShift(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update shift", variant: "destructive" });
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      return await apiRequest('DELETE', `/api/hr/shifts/${shiftId}`, {});
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Shift deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/hr/shifts'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete shift", variant: "destructive" });
    },
  });

  const onSubmit = (data: ShiftFormData) => {
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
    return shifts.filter(shift => shift.date === date);
  };

  const getShiftHours = (startTime: string, endTime: string, breakDuration: number) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.max(0, hours - (breakDuration / 60));
  };

  const weekDates = getWeekDates(selectedDate);
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (employeesLoading || shiftsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedule Management</h1>
          <p className="text-gray-600">Manage employee shifts and weekly schedules</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.firstName} {employee.lastName} - {employee.position?.title}
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
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createShiftMutation.isPending}>
                    Create Shift
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Schedule
          </CardTitle>
          <CardDescription>
            View and manage shifts for the week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Label htmlFor="week-date">Week of:</Label>
            <Input
              id="week-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>

          <div className="grid grid-cols-7 gap-4">
            {weekDates.map((date, index) => {
              const dayShifts = getShiftsForDate(date);
              const totalHours = dayShifts.reduce((sum, shift) => 
                sum + getShiftHours(shift.startTime, shift.endTime, shift.breakDuration), 0
              );

              return (
                <div key={date} className="border rounded-lg p-4 min-h-[200px]">
                  <div className="font-medium text-sm mb-2">
                    {dayNames[index]}
                  </div>
                  <div className="text-xs text-gray-500 mb-3">
                    {new Date(date).toLocaleDateString()}
                  </div>
                  
                  <div className="space-y-2">
                    {dayShifts.map((shift) => {
                      const employee = employees.find(emp => emp.id === shift.employeeId);
                      const hours = getShiftHours(shift.startTime, shift.endTime, shift.breakDuration);
                      
                      return (
                        <div key={shift.id} className="bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                          <div className="font-medium">
                            {employee?.firstName} {employee?.lastName}
                          </div>
                          <div className="text-gray-600">
                            {shift.startTime} - {shift.endTime}
                          </div>
                          <div className="text-gray-500">
                            {hours.toFixed(1)}h
                          </div>
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
                                  notes: shift.notes || "",
                                });
                                setIsCreateDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={() => deleteShiftMutation.mutate(shift.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {dayShifts.length > 0 && (
                    <div className="mt-3 pt-2 border-t text-xs">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Users className="h-3 w-3" />
                        {dayShifts.length} shifts
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-3 w-3" />
                        {totalHours.toFixed(1)} hours
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog (reuses create dialog) */}
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
                            {employee.firstName} {employee.lastName} - {employee.position?.title}
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