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
            window.location.href = '/';
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

    return () => unsubscribe();
  }, []);

  const handleCreateOwnerAccount = async () => {
    try {
      // Import Firebase auth functions
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      
      // Create user with Firebase Auth directly
      const userCredential = await createUserWithEmailAndPassword(auth, 'mequeamaddox@gmail.com', 'RestroFlow2024!');
      
      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: 'Mequea Maddox'
      });

      // The useAuth hook will automatically handle the rest when user is created
      toast({
        title: "Owner account created!",
        description: "Account created successfully. You are now logged in.",
      });
      setShowCreateOwner(false);
    } catch (error: any) {
      console.error('Error creating owner account:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        toast({
          title: "Account already exists",
          description: "Please use the login form to sign in.",
          variant: "destructive",
        });
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
                  Need to create your owner account?
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
                <p>This will create a Firebase account for:</p>
                <ul className="list-disc list-inside text-slate-400 space-y-1">
                  <li>Email: mequeamaddox@gmail.com</li>
                  <li>Password: RestroFlow2024!</li>
                  <li>Role: Owner</li>
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