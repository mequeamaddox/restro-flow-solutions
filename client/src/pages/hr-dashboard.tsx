import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Calendar, CheckSquare, Clock, MessageSquare, UserPlus, Building, Briefcase } from "lucide-react";
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

  const pendingTasks = tasks.filter((task: any) => task.status !== 'completed').length;
  const todayShifts = shifts.filter((shift: any) => {
    const today = new Date().toDateString();
    const shiftDate = new Date(shift.date).toDateString();
    return shiftDate === today;
  }).length;
  const unreadMessages = messages.filter((msg: any) => !msg.readBy?.length).length;

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Across all locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Shifts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayShifts}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadMessages}</div>
            <p className="text-xs text-muted-foreground">New notifications</p>
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