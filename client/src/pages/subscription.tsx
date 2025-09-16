import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Check, 
  CreditCard, 
  Calendar, 
  Building, 
  Star, 
  Crown, 
  ChefHat, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Settings,
  Users,
  TrendingUp,
  X
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

interface SubscriptionInfo {
  id: string;
  plan: string;
  status: string;
  nextBillingDate: string;
  totalAmount: number;
  hrAddonLocations: number;
  createdAt: string;
  squareCustomerId?: string;
  squareSubscriptionId?: string;
}

interface Location {
  id: string;
  name: string;
  type: string;
  hrAddonEnabled: boolean;
}

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Handle post-checkout success redirect to onboarding
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isSuccess = urlParams.get('success') === 'true';
    const sessionId = urlParams.get('session_id');
    
    if (isSuccess && user) {
      // Show success message
      toast({
        title: "🎉 Subscription Activated!",
        description: "Welcome to RestroFlow! Let's get your business set up.",
      });
      
      // Clean up URL and redirect to settings for business setup
      window.history.replaceState({}, document.title, '/subscription');
      
      // Redirect to settings page for initial business/location setup
      setTimeout(() => {
        setLocation('/settings');
      }, 2000);
    }
  }, [user, toast, setLocation]);

  // Fetch current subscription
  const { data: subscription, isLoading: subscriptionLoading, error: subscriptionError } = useQuery<SubscriptionInfo>({
    queryKey: ['/api/subscriptions/current'],
    enabled: !!user
  });

  // Fetch user locations for HR add-on status
  const { data: locations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
    enabled: !!user
  });

  // Fetch available plans for upgrade/downgrade
  const { data: availablePlans } = useQuery({
    queryKey: ['/api/subscriptions/plans']
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await apiRequest('POST', '/api/subscriptions/cancel', { reason });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled. You'll retain access until the end of your billing period.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setShowCancelDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Upgrade plan mutation
  const upgradePlanMutation = useMutation({
    mutationFn: async (newPlan: string) => {
      const response = await apiRequest('POST', '/api/subscriptions/upgrade', { plan: newPlan });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: "Plan Updated",
          description: "Your subscription plan has been updated successfully!",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/subscriptions/current'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to upgrade plan. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Get plan display information
  const getPlanInfo = (planId: string) => {
    switch (planId) {
      case 'free':
        return { name: 'Free', icon: ChefHat, color: 'from-slate-500 to-gray-500', price: 0 };
      case 'professional':
        return { name: 'Professional', icon: Star, color: 'from-orange-500 to-red-500', price: 179 };
      case 'enterprise':
        return { name: 'Enterprise', icon: Crown, color: 'from-purple-500 to-pink-500', price: 329 };
      default:
        return { name: 'Unknown', icon: ChefHat, color: 'from-gray-500 to-gray-600', price: 0 };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleManageBilling = () => {
    if (subscription?.squareCustomerId) {
      // In a real app, this would redirect to Square's customer portal
      toast({
        title: "Billing Portal",
        description: "Redirecting to Square billing portal...",
      });
      // window.location.href = squareCustomerPortalUrl;
    } else {
      toast({
        title: "No Billing Information",
        description: "No billing information found. Please contact support.",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-sm border-slate-700/50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Authentication Required</h2>
            <p className="text-slate-300 mb-4">Please log in to view your subscription details.</p>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Log In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlan = subscription ? getPlanInfo(subscription.plan) : null;
  const hrEnabledLocations = locations?.filter(loc => loc.hrAddonEnabled) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Subscription Management</h1>
              <p className="text-slate-300">Manage your RestroFlow subscription and billing</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/pricing">
                <Button variant="outline" className="border-slate-600 text-slate-300 hover:text-white">
                  View All Plans
                </Button>
              </Link>
              <Button
                onClick={handleManageBilling}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-manage-billing"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {subscriptionLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-slate-800/80 backdrop-blur-sm border-slate-700/50">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-4 bg-slate-700" />
                  <Skeleton className="h-8 w-32 mb-2 bg-slate-700" />
                  <Skeleton className="h-4 w-full bg-slate-700" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {subscriptionError && (
          <Alert className="mb-6 bg-red-900/20 border-red-500/50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-200">
              Failed to load subscription information. Please refresh the page or contact support.
            </AlertDescription>
          </Alert>
        )}

        {/* Subscription Content */}
        {!subscriptionLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Plan */}
            <Card className="lg:col-span-2 bg-slate-800/80 backdrop-blur-sm border-slate-700/50">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Settings className="h-5 w-5 mr-2" />
                  Current Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {subscription ? (
                  <>
                    {/* Plan Details */}
                    <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentPlan?.color} flex items-center justify-center`}>
                          {currentPlan?.icon && <currentPlan.icon className="h-6 w-6 text-white" />}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{currentPlan?.name} Plan</h3>
                          <p className="text-slate-300 text-sm">
                            ${subscription.totalAmount}/month • {subscription.status === 'active' ? 'Active' : subscription.status}
                          </p>
                        </div>
                      </div>
                      <Badge variant={subscription.status === 'active' ? 'default' : 'destructive'} 
                             className={subscription.status === 'active' ? 'bg-green-600' : ''}>
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </Badge>
                    </div>

                    {/* Billing Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center mb-2">
                          <Calendar className="h-4 w-4 text-blue-400 mr-2" />
                          <span className="text-sm font-medium text-slate-300">Next Billing Date</span>
                        </div>
                        <p className="text-white font-semibold">
                          {formatDate(subscription.nextBillingDate)}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center mb-2">
                          <CreditCard className="h-4 w-4 text-green-400 mr-2" />
                          <span className="text-sm font-medium text-slate-300">Monthly Total</span>
                        </div>
                        <p className="text-white font-semibold">
                          ${subscription.totalAmount}
                        </p>
                      </div>
                    </div>

                    {/* HR Add-on Status */}
                    {subscription.hrAddonLocations > 0 && (
                      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Users className="h-5 w-5 text-blue-400 mr-2" />
                            <span className="font-medium text-white">HR Employee Management Add-on</span>
                          </div>
                          <Badge className="bg-blue-600 text-white">
                            {subscription.hrAddonLocations} location{subscription.hrAddonLocations > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        {locationsLoading ? (
                          <Skeleton className="h-4 w-48 bg-slate-700" />
                        ) : (
                          <div className="text-sm text-slate-300">
                            Active in: {hrEnabledLocations.map(loc => loc.name).join(', ') || 'Loading...'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Plan Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-600">
                      <div className="space-x-2">
                        {subscription.plan !== 'enterprise' && (
                          <Button
                            onClick={() => upgradePlanMutation.mutate('enterprise')}
                            disabled={upgradePlanMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            data-testid="button-upgrade-plan"
                          >
                            {upgradePlanMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <TrendingUp className="h-4 w-4 mr-2" />
                            )}
                            Upgrade Plan
                          </Button>
                        )}
                      </div>
                      
                      {subscription.plan !== 'free' && (
                        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                          <DialogTrigger asChild>
                            <Button variant="destructive" size="sm" data-testid="button-cancel-subscription">
                              Cancel Subscription
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-800 border-slate-700">
                            <DialogHeader>
                              <DialogTitle className="text-white">Cancel Subscription</DialogTitle>
                              <DialogDescription className="text-slate-300">
                                Are you sure you want to cancel your subscription? You'll retain access until {formatDate(subscription.nextBillingDate)}.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-white">Reason for cancellation (optional)</Label>
                                <Textarea
                                  value={cancelReason}
                                  onChange={(e) => setCancelReason(e.target.value)}
                                  placeholder="Help us improve by sharing why you're cancelling..."
                                  className="bg-slate-700 border-slate-600 text-white"
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setShowCancelDialog(false)}
                                  className="border-slate-600 text-slate-300"
                                >
                                  Keep Subscription
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => cancelSubscriptionMutation.mutate(cancelReason)}
                                  disabled={cancelSubscriptionMutation.isPending}
                                  data-testid="button-confirm-cancel"
                                >
                                  {cancelSubscriptionMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <X className="h-4 w-4 mr-2" />
                                  )}
                                  Cancel Subscription
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </>
                ) : (
                  /* Free Plan */
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-500 to-gray-500 flex items-center justify-center mx-auto mb-4">
                      <ChefHat className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Free Plan</h3>
                    <p className="text-slate-300 mb-6">You're currently on the free plan with basic features.</p>
                    <Link href="/pricing">
                      <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                        Upgrade to Premium
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions & Support */}
            <div className="space-y-6">
              {/* Usage Overview */}
              <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Usage Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">OCR Processing</span>
                    <span className="text-white font-medium">
                      {subscription?.plan === 'free' ? `${(user as any)?.ocrCreditsUsed || 0}/5` : 'Unlimited'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Locations</span>
                    <span className="text-white font-medium">
                      {locations?.length || 0} {subscription?.plan === 'free' ? '(max 1)' : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 text-sm">Plan Type</span>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {currentPlan?.name || 'Free'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Support */}
              <Card className="bg-slate-800/80 backdrop-blur-sm border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-slate-600 text-slate-300 hover:text-white"
                    onClick={() => window.open('mailto:support@restroflow.com', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start border-slate-600 text-slate-300 hover:text-white"
                    onClick={() => window.open('/docs', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Documentation
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}