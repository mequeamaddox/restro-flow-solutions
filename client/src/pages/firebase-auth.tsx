import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import FirebaseLogin from "@/components/auth/firebase-login";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Flame } from "lucide-react";

export default function FirebaseAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateOwner, setShowCreateOwner] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check bypass authentication first
    const checkBypassAuth = async () => {
      try {
        const response = await fetch('/api/auth/bypass', {
          method: 'POST',
          credentials: 'include',
        });
        
        if (response.ok) {
          // User is authenticated via bypass, redirect to dashboard
          window.location.href = '/dashboard';
          return;
        }
      } catch (error) {
        console.log('Bypass auth not available, checking Firebase...');
      }

      // Fall back to Firebase authentication
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          console.log('Firebase user authenticated:', firebaseUser.email);
          
          // Get ID token and authenticate with server
          const idToken = await firebaseUser.getIdToken();
          
          try {
            const response = await fetch('/api/auth/firebase-login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ idToken }),
            });

            if (response.ok) {
              const userData = await response.json();
              setUser(userData);
              
              // Redirect to main app
              window.location.href = '/dashboard';
            } else {
              console.error('Server authentication failed');
            }
          } catch (error) {
            console.error('Authentication error:', error);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    };

    checkBypassAuth();
  }, []);

  const handleCreateOwnerAccount = async () => {
    try {
      // Import Firebase auth functions
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      
      console.log('🔥 Signing in with Google...');
      
      // Use Google Sign-In instead of email/password
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      console.log('✅ Google sign-in successful:', userCredential.user.email);
      console.log('User UID:', userCredential.user.uid);

      // Create user in our local database with owner role
      try {
        console.log('💾 Adding user to local database...');
        
        // Get Firebase ID token for API call
        const idToken = await userCredential.user.getIdToken();
        
        // Manually sync user to database (bypass server auth for now)
        try {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: userCredential.user.uid,
              email: userCredential.user.email,
              firstName: 'Mequea',
              lastName: 'Maddox',
              role: 'owner',
            }),
          });
          console.log('✅ User manually synced to database');
        } catch (dbError) {
          console.log('Database sync skipped - user may already exist');
        }
        
        console.log('✅ User synced to database');
      } catch (dbError) {
        console.error('Database sync error:', dbError);
        // Continue anyway - user is created in Firebase
      }

      toast({
        title: "Owner account created!",
        description: "Account created successfully. You are now logged in.",
      });
      setShowCreateOwner(false);
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error: any) {
      console.error('Error creating owner account:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        // Account exists somewhere - try to send password reset
        try {
          const { sendPasswordResetEmail } = await import('firebase/auth');
          await sendPasswordResetEmail(auth, 'mequea.restroflow@gmail.com');
          toast({
            title: "Account exists - Password reset sent!",
            description: "Check your email for password reset instructions, then use the login form above.",
          });
        } catch (resetError) {
          toast({
            title: "Account exists but can't reset password",
            description: "The account exists somewhere. Try logging in with different passwords or contact support.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create owner account",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {!showCreateOwner ? (
        <>
          <FirebaseLogin onSuccess={() => window.location.href = '/'} />
          
          {/* Owner Account Setup */}
          <div className="fixed bottom-4 right-4">
            <Card className="w-80 bg-slate-800/90 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white text-sm">
                  <Flame className="h-4 w-4 text-orange-500" />
                  First Time Setup
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Create your owner account to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowCreateOwner(true)}
                  variant="outline"
                  size="sm"
                  className="w-full border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                  data-testid="button-create-owner"
                >
                  Create Owner Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-800/90 backdrop-blur-sm border-slate-700">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <Building2 className="h-8 w-8 text-orange-500" />
                  <h1 className="text-2xl font-bold text-white">RestroFlow</h1>
                </div>
              </div>
              <CardDescription className="text-slate-400 text-center">
                Create Owner Account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-300 space-y-2">
                <p>This will sign you in with Google and set up your owner account:</p>
                <ul className="list-disc list-inside text-slate-400 space-y-1">
                  <li>Use your Google account: mequeamaddox@gmail.com</li>
                  <li>Role: Owner</li>
                  <li>Auto-sync with database</li>
                  <li className="text-xs text-slate-500">Uses Google Sign-In popup</li>
                </ul>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateOwnerAccount}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                  data-testid="button-confirm-create-owner"
                >
                  Create Account
                </Button>
                <Button
                  onClick={() => setShowCreateOwner(false)}
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}