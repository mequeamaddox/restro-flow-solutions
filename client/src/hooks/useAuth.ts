import { useState, useEffect } from 'react';

type User = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const checkAuthState = async () => {
    try {
      console.log('🔍 Checking authentication state via session cookie...');
      
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store', // Prevent 304 Not Modified responses
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.user) {
          console.log('✅ Authentication successful:', data.user.email);
          setUser(data.user);
          return data.user;
        }
      }
      
      // Only clear auth on actual auth failures (401/403), not on server errors or 304
      if (response.status === 401 || response.status === 403) {
        console.log('❌ Authentication failed or no session found (401/403)');
        setUser(null);
        return null;
      } else if (response.status >= 500) {
        console.log('⚠️ Server error during auth check, preserving current auth state');
        return user; // Preserve current user if server error
      } else {
        console.log('⚠️ Unexpected response status:', response.status, 'preserving current auth state');
        return user; // Preserve current user for other non-success responses
      }
    } catch (error) {
      console.error('❌ Error checking auth state:', error);
      // Network errors - preserve current auth state
      console.log('⚠️ Network error during auth check, preserving current auth state');
      return user;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      await checkAuthState();
      setIsLoading(false);
      setIsInitialized(true);
    };

    initializeAuth();
  }, []);

  const checkAuth = async () => {
    if (!isInitialized) {
      await checkAuthState();
    }
    return !!user;
  };

  const refreshAuth = async () => {
    setIsLoading(true);
    const authUser = await checkAuthState();
    setIsLoading(false);
    return authUser;
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isInitialized,
    checkAuth,
    refreshAuth,
  };
}
