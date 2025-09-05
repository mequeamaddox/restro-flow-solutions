import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { Building2, Lock, Mail } from "lucide-react";

interface FirebaseLoginProps {
  onSuccess: () => void;
}

export default function FirebaseLogin({ onSuccess }: FirebaseLoginProps) {
  const [email, setEmail] = useState("owner@restroflow.com");
  const [password, setPassword] = useState("RestroFlow2024!");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      // Get ID token and send to server
      const idToken = await userCredential.user.getIdToken();
      
      const response = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        toast({ 
          title: "Welcome!", 
          description: "You've successfully signed in with Google." 
        });
        onSuccess();
      } else {
        throw new Error('Server authentication failed');
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast({ 
        title: "Google sign-in failed", 
        description: error.message || "Please try again.",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get ID token and send to server
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        toast({ 
          title: "Welcome back!", 
          description: "You've successfully logged in." 
        });
        onSuccess();
      } else {
        throw new Error('Server authentication failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast({ 
        title: "Login failed", 
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get ID token and send to server
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (response.ok) {
        toast({ 
          title: "Account created!", 
          description: "Welcome to RestroFlow." 
        });
        onSuccess();
      } else {
        throw new Error('Server authentication failed');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({ 
        title: "Signup failed", 
        description: error.message || "Please try again.",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/80 backdrop-blur-sm border-slate-700">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-orange-500" />
              <h1 className="text-2xl font-bold text-white">RestroFlow</h1>
            </div>
          </div>
          <CardDescription className="text-slate-400 text-center">
            Restaurant Operations Platform
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
              <TabsTrigger value="login" className="text-slate-300">Login</TabsTrigger>
              <TabsTrigger value="signup" className="text-slate-300">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white"
                    data-testid="input-login-email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">
                    <Lock className="h-4 w-4 inline mr-2" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white"
                    data-testid="input-login-password"
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
                
                {/* Password Reset Option */}
                <div className="space-y-2">
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        const { sendPasswordResetEmail } = await import('firebase/auth');
                        await sendPasswordResetEmail(auth, email);
                        toast({
                          title: "Password reset sent!",
                          description: "Check your email for reset instructions.",
                        });
                      } catch (error: any) {
                        toast({
                          title: "Reset failed",
                          description: error.message,
                          variant: "destructive",
                        });
                      }
                    }}
                    variant="ghost"
                    size="sm"
                    className="w-full text-slate-400 hover:text-white text-xs"
                  >
                    Send Password Reset Email
                  </Button>
                  
                  <div className="text-xs text-green-400 text-center p-2 bg-green-900/20 rounded">
                    ✓ Account exists! Try logging in or use password reset above.
                  </div>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <div className="text-sm text-slate-300 mb-4 p-3 bg-slate-700/30 rounded">
                <p className="font-medium">Quick Setup for Owner Account:</p>
                <p className="text-xs text-slate-400 mt-1">Using: owner@restroflow.com / RestroFlow2024!</p>
                <p className="text-xs text-yellow-400 mt-1">We'll change the email later to avoid conflicts</p>
              </div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-slate-300">
                    <Mail className="h-4 w-4 inline mr-2" />
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="owner@restroflow.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white"
                    data-testid="input-signup-email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-slate-300">
                    <Lock className="h-4 w-4 inline mr-2" />
                    Password
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-700/50 border-slate-600 text-white"
                    data-testid="input-signup-password"
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
                  disabled={isLoading}
                  data-testid="button-signup"
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}