import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  UserPlus,
  Mail,
  MapPin,
  Users,
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  Building2,
} from 'lucide-react';

// Accept invitation form schema
const acceptInvitationSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type AcceptInvitationFormData = z.infer<typeof acceptInvitationSchema>;

interface InvitationDetails {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  location?: {
    name: string;
    address: string;
  };
  department?: {
    name: string;
  };
  position?: {
    title: string;
  };
  expiresAt: string;
}

export default function InvitationAccept() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  // Validate invitation token
  const { 
    data: invitation, 
    isLoading: validatingToken, 
    error: validationError 
  } = useQuery<InvitationDetails>({
    queryKey: ['/api/invitations', token],
    queryFn: async () => {
      const response = await fetch(`/api/invitations/${token}`);
      if (!response.ok) {
        throw new Error('Invalid or expired invitation');
      }
      return response.json();
    },
    retry: false,
  });

  const form = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async (data: AcceptInvitationFormData) => {
      // Create Firebase user account
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        invitation!.email, 
        data.password
      );
      
      // Get Firebase UID
      const firebaseUid = userCredential.user.uid;
      
      // Accept invitation on backend
      return await apiRequest('POST', `/api/invitations/${token}/accept`, {
        password: data.password,
        firebaseUid,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Welcome to the Team!',
        description: 'Your account has been created successfully. You can now log in.',
      });
      
      // Redirect to login page after successful acceptance
      setTimeout(() => {
        setLocation('/login');
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: 'Account Creation Failed',
        description: error.message || 'There was an error creating your account. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: AcceptInvitationFormData) => {
    acceptInvitationMutation.mutate(data);
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      team_lead: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      employee: 'bg-accent text-foreground dark:bg-gray-900 dark:text-gray-200',
    };

    return (
      <Badge className={colors[role as keyof typeof colors] || colors.employee}>
        {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const isExpired = invitation && new Date(invitation.expiresAt) < new Date();

  // Loading state
  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <h3 className="text-lg font-semibold">Validating Invitation</h3>
              <p className="text-muted-foreground">Please wait while we verify your invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (validationError || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h3 className="text-lg font-semibold">Invalid Invitation</h3>
              <p className="text-muted-foreground">
                This invitation link is invalid, expired, or has already been used.
              </p>
              <Button 
                onClick={() => setLocation('/login')}
                variant="outline"
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired invitation
  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Clock className="h-12 w-12 text-orange-500 mx-auto" />
              <h3 className="text-lg font-semibold">Invitation Expired</h3>
              <p className="text-muted-foreground">
                This invitation has expired. Please contact your manager to send a new invitation.
              </p>
              <Button 
                onClick={() => setLocation('/login')}
                variant="outline"
                data-testid="button-go-to-login"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state (after account creation)
  if (acceptInvitationMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">Account Created Successfully!</h3>
              <p className="text-muted-foreground">
                Welcome to the team! Your account has been created and you can now log in to access your dashboard.
              </p>
              <div className="animate-pulse text-sm text-muted-foreground">
                Redirecting to login page...
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main acceptance form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-8 w-8 text-blue-500" />
            <CardTitle className="text-2xl">RestroFlow</CardTitle>
          </div>
          <CardDescription className="text-lg">
            You've been invited to join the team!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invitation Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Email:</span>
                </div>
                <p className="text-sm text-foreground dark:text-gray-300">{invitation.email}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Role:</span>
                </div>
                {getRoleBadge(invitation.role)}
              </div>

              {invitation.location && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Location:</span>
                  </div>
                  <p className="text-sm text-foreground dark:text-gray-300">
                    {invitation.location.name}
                  </p>
                </div>
              )}

              {invitation.department && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Department:</span>
                  </div>
                  <p className="text-sm text-foreground dark:text-gray-300">
                    {invitation.department.name}
                  </p>
                </div>
              )}

              {invitation.position && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Position:</span>
                  </div>
                  <p className="text-sm text-foreground dark:text-gray-300">
                    {invitation.position.title}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Account Creation Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Create Your Account</h3>
            <p className="text-muted-foreground">
              Create a secure password to access your RestroFlow account.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Create a strong password"
                            {...field}
                            data-testid="input-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Must be at least 8 characters with uppercase, lowercase, and number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm your password"
                            {...field}
                            data-testid="input-confirm-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={acceptInvitationMutation.isPending}
                  data-testid="button-create-account"
                >
                  {acceptInvitationMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Account & Join Team
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              By creating an account, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}