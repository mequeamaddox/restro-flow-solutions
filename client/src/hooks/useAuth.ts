import { useState, useEffect } from "react";
import { useFirebaseAuth } from "./useFirebaseAuth";

export function useAuth() {
  const { user: firebaseUser, loading: firebaseLoading, isAuthenticated: firebaseAuthenticated } = useFirebaseAuth();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const determineUser = async () => {
      setIsLoading(true);
      
      try {
        // First try Replit authentication (for admin)
        const replitResponse = await fetch('/api/auth/user');
        if (replitResponse.ok) {
          const replitUser = await replitResponse.json();
          setUser(replitUser);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        // Replit auth not available, continue to Firebase
      }

      // If no Replit user, try Firebase authentication (for employees)
      if (firebaseUser && firebaseAuthenticated) {
        try {
          console.log('🔄 Syncing Firebase user with backend:', firebaseUser.email);
          const idToken = await firebaseUser.getIdToken();
          
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
            console.log('✅ Backend sync successful:', userData.email);
            setUser(userData);
          } else {
            const errorText = await response.text();
            console.error('❌ Backend sync failed:', response.status, errorText);
            setUser(null);
          }
        } catch (error) {
          console.error('❌ Error syncing Firebase user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    };

    if (!firebaseLoading) {
      determineUser();
    }
  }, [firebaseUser, firebaseAuthenticated, firebaseLoading]);

  return {
    user,
    isLoading: firebaseLoading || isLoading,
    isAuthenticated: !!user,
  };
}
