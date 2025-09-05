import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Bypass authentication for RestroFlow owner
    const authenticateBypass = async () => {
      try {
        const response = await fetch('/api/auth/bypass', {
          method: 'POST',
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser({
            id: '46308728',
            email: 'mequeamaddox@gmail.com',
            firstName: 'Mequea',
            lastName: 'Maddox',
            role: 'owner',
            employeeNumber: 'EMP001'
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Authentication bypass error:', error);
        setUser(null);
      }
      setIsLoading(false);
    };

    authenticateBypass();
    return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      
      if (firebaseUser) {
        try {
          // Get the Firebase ID token
          const idToken = await firebaseUser.getIdToken();
          
          // Authenticate with our backend
          const response = await fetch('/api/auth/firebase-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
            credentials: 'include',
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData.user);
          } else {
            console.error('Backend authentication failed');
            setUser(null);
          }
        } catch (error) {
          console.error('Authentication error:', error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
