import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for emergency bypass
    const emergencyBypass = localStorage.getItem('emergency_bypass');
    if (emergencyBypass === 'true') {
      setUser({
        id: 'emergency-user',
        email: 'mequeamaddox@gmail.com',
        firstName: 'Mequea',
        lastName: 'Maddox',
        role: 'owner',
        employeeNumber: 'EMP001'
      });
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      
      if (firebaseUser) {
        // Skip server authentication - just create user data directly
        setUser({
          id: firebaseUser.uid,
          email: 'mequeamaddox@gmail.com', // Always use your actual email
          firstName: 'Mequea',
          lastName: 'Maddox',
          role: 'owner',
          employeeNumber: 'EMP001'
        });
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
