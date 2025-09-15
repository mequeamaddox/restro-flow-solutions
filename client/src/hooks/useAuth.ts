import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncWithBackend = async (firebaseUser: User | null) => {
    if (firebaseUser) {
      try {
        const idToken = await firebaseUser.getIdToken();
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.warn('Backend sync failed during auth check');
        }
      } catch (error) {
        console.warn('Backend sync error:', error);
        // Continue even if backend sync fails - Firebase auth is primary
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      
      if (firebaseUser) {
        // User is signed in
        setUser(firebaseUser);
        await syncWithBackend(firebaseUser);
      } else {
        // User is signed out
        setUser(null);
      }
      
      setIsLoading(false);
    });

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, []);

  const checkAuth = async () => {
    // For compatibility with existing code, return the current auth state
    return !!user;
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    checkAuth,
  };
}
