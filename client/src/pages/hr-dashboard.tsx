import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, CheckSquare, Clock, MessageSquare, UserPlus, Building, Briefcase, TrendingUp, DollarSign, Target, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

export default function HRDashboard() {
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/hr/employees'],
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['/api/hr/shifts'],
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/hr/tasks'],
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['/api/hr/messages'],
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['/api/hr/time-entries'],
  });

  const { data: timeOffRequests = [] } = useQuery({
    queryKey: ['/api/hr/time-off-requests'],
  });

  const { data: analytics } = useQuery({
    queryKey: ['/api/hr/analytics'],
  });

  // Analytics calculations
  const pendingTasks = tasks.filter((task: any) => task.status !== 'completed').length;
  const todayShifts = shifts.filter((shift: any) => {
    const today = new Date().toDateString();
    const shiftDate = new Date(shift.date).toDateString();
    return shiftDate === today;
  }).length;
  const unreadMessages = messages.filter((msg: any) => !msg.readBy?.length).length;
  
  // Advanced analytics - use from API if available, otherwise calculate locally
  const currentlyWorking = analytics?.currentlyWorking ?? timeEntries.filter((entry: any) => entry.status === 'clocked-in').length;
  const pendingTimeOff = analytics?.pendingTimeOff ?? timeOffRequests.filter((request: any) => request.status === 'pending').length;
  
  // Weekly hours calculation
  const weeklyHours = shifts.reduce((total: number, shift: any) => {
    const start = new Date(`2000-01-01T${shift.startTime}`);
    const end = new Date(`2000-01-01T${shift.endTime}`);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const actualHours = Math.max(0, hours - (shift.breakDuration / 60));
    return total + actualHours;
  }, 0);

  // Calculate average hourly rate (example calculation)
  const avgHourlyRate = employees.reduce((total: number, emp: any) => {
    return total + (emp.hourlyRate || 15);
  }, 0) / Math.max(employees.length, 1);

  const estimatedWeeklyLabor = analytics?.totalWeeklyHours ? (analytics.totalWeeklyHours * avgHourlyRate) : (weeklyHours * avgHourlyRate);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Employee Management</h1>
        <p className="text-gray-600">Comprehensive HR system for managing your restaurant team</p>
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">ADD-ON</div>
            <span className="text-blue-700 font-medium">Employee Management System Active</span>
          </div>
          <p className="text-blue-600 text-sm mt-1">
            Additional $79/month - Save 22% vs competitors like MarginEdge
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Total team size</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Working</CardTitle>
            <Clock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{currentlyWorking}</div>
            <p className="text-xs text-muted-foreground">Clocked in now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayShifts}</div>
            <p className="text-xs text-muted-foreground">Scheduled today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Off Requests</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingTimeOff}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadMessages}</div>
            <p className="text-xs text-muted-foreground">Team messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Labor Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Weekly Labor Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{weeklyHours.toFixed(1)}</div>
            <p className="text-sm text-gray-600 mt-1">Total scheduled hours this week</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">
                {(weeklyHours / employees.length).toFixed(1)} hrs/employee
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Est. Weekly Labor Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${estimatedWeeklyLabor.toFixed(0)}</div>
            <p className="text-sm text-gray-600 mt-1">Based on avg rate ${avgHourlyRate.toFixed(2)}/hr</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-green-600">
                ~{((estimatedWeeklyLabor / (weeklyHours || 1)) * 100 / 25).toFixed(1)}% of target
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{((1 - (pendingTasks / Math.max(tasks.length, 1))) * 100).toFixed(0)}%</div>
            <p className="text-sm text-gray-600 mt-1">Task completion rate</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-purple-600">
                {tasks.length} total tasks
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/hr/employees">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 mx-auto mb-2 text-blue-600" />
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>Manage employee profiles, contact info, and roles</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Employees
              </Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/hr/scheduling">
            <CardHeader className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-2 text-green-600" />
              <CardTitle>Scheduling</CardTitle>
              <CardDescription>Create shifts, manage availability, and track time off</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Calendar className="h-4 w-4 mr-2" />
                View Schedule
              </Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/hr/tasks">
            <CardHeader className="text-center">
              <CheckSquare className="h-12 w-12 mx-auto mb-2 text-orange-600" />
              <CardTitle>Task Management</CardTitle>
              <CardDescription>Assign tasks, track progress, and set deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <CheckSquare className="h-4 w-4 mr-2" />
                Manage Tasks
              </Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/hr/time-clock">
            <CardHeader className="text-center">
              <Clock className="h-12 w-12 mx-auto mb-2 text-purple-600" />
              <CardTitle>Time Clock</CardTitle>
              <CardDescription>Clock in/out, track hours, and manage breaks</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Clock className="h-4 w-4 mr-2" />
                Time Tracking
              </Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/hr/messaging">
            <CardHeader className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 text-teal-600" />
              <CardTitle>Team Communication</CardTitle>
              <CardDescription>Send announcements, direct messages, and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/hr/departments">
            <CardHeader className="text-center">
              <Building className="h-12 w-12 mx-auto mb-2 text-indigo-600" />
              <CardTitle>Departments</CardTitle>
              <CardDescription>Organize teams by departments and locations</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Building className="h-4 w-4 mr-2" />
                Manage Departments
              </Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/hr/positions">
            <CardHeader className="text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-2 text-red-600" />
              <CardTitle>Positions</CardTitle>
              <CardDescription>Define job roles, responsibilities, and pay rates</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Briefcase className="h-4 w-4 mr-2" />
                Manage Positions
              </Button>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/hr/analytics">
            <CardHeader className="text-center">
              <Users className="h-12 w-12 mx-auto mb-2 text-pink-600" />
              <CardTitle>HR Analytics</CardTitle>
              <CardDescription>Labor costs, productivity metrics, and reporting</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Users className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}