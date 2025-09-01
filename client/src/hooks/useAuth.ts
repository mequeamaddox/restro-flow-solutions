import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFirebaseAuth } from "./useFirebaseAuth";

export function useAuth() {
  const { user: firebaseUser, loading: firebaseLoading, isAuthenticated: firebaseAuthenticated } = useFirebaseAuth();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Also check for Replit authentication
  const { data: replitUser, isLoading: replitLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  useEffect(() => {
    const determineUser = async () => {
      // If we have a Replit user (admin), use that
      if (replitUser) {
        setUser(replitUser);
        setIsLoading(false);
        return;
      }

      // If we have a Firebase user (employee), sync with backend
      if (firebaseUser && firebaseAuthenticated) {
        try {
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
            setUser(userData);
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error('Error syncing Firebase user:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    };

    if (!replitLoading && !firebaseLoading) {
      determineUser();
    }
  }, [replitUser, firebaseUser, firebaseAuthenticated, replitLoading, firebaseLoading]);

  return {
    user,
    isLoading: replitLoading || firebaseLoading || isLoading,
    isAuthenticated: !!user,
  };
}
