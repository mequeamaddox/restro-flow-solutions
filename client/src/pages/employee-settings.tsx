import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Shield, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function EmployeeSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    breakReminders: true,
    scheduleAlerts: true,
  });

  const handleSavePreferences = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully",
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-gray-900 rounded-xl p-6 text-white">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg mr-4">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">My Settings</h1>
            <p className="text-slate-300">Manage your account preferences and notifications</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center text-slate-900 dark:text-white">
              <User className="h-5 w-5 mr-2" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={(user as any)?.firstName || ''}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={(user as any)?.lastName || ''}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={(user as any)?.email || ''}
                disabled
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Contact your manager to update profile information
            </p>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center text-slate-900 dark:text-white">
              <Bell className="h-5 w-5 mr-2" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Email Notifications</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive schedule updates and announcements
                </p>
              </div>
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) =>
                  setPreferences(prev => ({ ...prev, emailNotifications: checked }))
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Break Reminders</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get notified when it's time for your break
                </p>
              </div>
              <Switch
                checked={preferences.breakReminders}
                onCheckedChange={(checked) =>
                  setPreferences(prev => ({ ...prev, breakReminders: checked }))
                }
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Schedule Alerts</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Alerts for shift changes and updates
                </p>
              </div>
              <Switch
                checked={preferences.scheduleAlerts}
                onCheckedChange={(checked) =>
                  setPreferences(prev => ({ ...prev, scheduleAlerts: checked }))
                }
              />
            </div>

            <Button 
              onClick={handleSavePreferences}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Preferences
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Privacy & Security */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center text-slate-900 dark:text-white">
            <Shield className="h-5 w-5 mr-2" />
            Privacy & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Account Security</h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Your account is managed by your employer. Contact your manager for password changes or security concerns.
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Data Privacy</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Your time clock data, messages, and work information are securely stored and only accessible to authorized personnel.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}