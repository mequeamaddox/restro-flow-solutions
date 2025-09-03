import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Shield, Save, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

export default function EmployeeSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: (user as any)?.firstName || '',
    lastName: (user as any)?.lastName || '',
    phone: '',
    emergencyContactName: '',
    emergencyContactPhone: ''
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    breakReminders: true,
    scheduleAlerts: true,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; phone: string; emergencyContactName: string; emergencyContactPhone: string }) => {
      return apiRequest(`/api/employees/${(user as any)?.id}/profile`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setIsEditingProfile(false);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleCancelEdit = () => {
    setProfileData({
      firstName: (user as any)?.firstName || '',
      lastName: (user as any)?.lastName || '',
      phone: '',
      emergencyContactName: '',
      emergencyContactPhone: ''
    });
    setIsEditingProfile(false);
  };

  const handleSavePreferences = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully",
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">My Settings</h1>
          <p className="text-slate-300">Manage your account preferences and notifications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Information
              </div>
              {!isEditingProfile ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingProfile(true)}
                  className="border-slate-600 hover:bg-slate-700"
                  data-testid="button-edit-profile"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="border-slate-600 hover:bg-slate-700"
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                    data-testid="button-save-profile"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={isEditingProfile ? profileData.firstName : ((user as any)?.firstName || '')}
                onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                disabled={!isEditingProfile}
                className={isEditingProfile ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-700/50 border-slate-600 text-slate-300"}
                data-testid="input-firstName"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={isEditingProfile ? profileData.lastName : ((user as any)?.lastName || '')}
                onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                disabled={!isEditingProfile}
                className={isEditingProfile ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-700/50 border-slate-600 text-slate-300"}
                data-testid="input-lastName"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                disabled={!isEditingProfile}
                placeholder="(555) 123-4567"
                className={isEditingProfile ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-700/50 border-slate-600 text-slate-300"}
                data-testid="input-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
              <Input
                id="emergencyContactName"
                value={profileData.emergencyContactName}
                onChange={(e) => setProfileData(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                disabled={!isEditingProfile}
                placeholder="Full name"
                className={isEditingProfile ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-700/50 border-slate-600 text-slate-300"}
                data-testid="input-emergencyContactName"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
              <Input
                id="emergencyContactPhone"
                value={profileData.emergencyContactPhone}
                onChange={(e) => setProfileData(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                disabled={!isEditingProfile}
                placeholder="(555) 123-4567"
                className={isEditingProfile ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-700/50 border-slate-600 text-slate-300"}
                data-testid="input-emergencyContactPhone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={(user as any)?.email || ''}
                disabled
                className="bg-slate-700/50 border-slate-600 text-slate-300"
                data-testid="input-email"
              />
              <p className="text-sm text-slate-400">
                Contact your manager to update email address
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Bell className="h-5 w-5 mr-2" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Email Notifications</Label>
                <p className="text-sm text-slate-400">
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
      <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Shield className="h-5 w-5 mr-2" />
            Privacy & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-500/20 p-4 rounded-lg border border-blue-500/30">
            <h4 className="font-medium text-blue-300 mb-2">Account Security</h4>
            <p className="text-sm text-blue-200">
              Your account is managed by your employer. Contact your manager for password changes or security concerns.
            </p>
          </div>
          
          <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/50">
            <h4 className="font-medium text-slate-200 mb-2">Data Privacy</h4>
            <p className="text-sm text-slate-300">
              Your time clock data, messages, and work information are securely stored and only accessible to authorized personnel.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}