import { useState, useEffect } from "react";
import { useFirebaseAuth } from "./useFirebaseAuth";

export function useAuth() {
  const { user: firebaseUser, loading: firebaseLoading, isAuthenticated } = useFirebaseAuth();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncUserWithBackend = async () => {
      if (!firebaseUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        // Get Firebase ID token
        const idToken = await firebaseUser.getIdToken();
        
        // Send token to backend to get/create user profile
        const response = await fetch('/api/auth/firebase-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
          }),
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          console.error('Failed to sync user with backend');
          setUser(null);
        }
      } catch (error) {
        console.error('Error syncing user:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    syncUserWithBackend();
  }, [firebaseUser]);

  return {
    user,
    isLoading: firebaseLoading || isLoading,
    isAuthenticated: isAuthenticated && !!user,
  };
}
