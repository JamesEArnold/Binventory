'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user;
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  /**
   * Check authentication status and redirect to login if not authenticated
   * @param redirectIfUnauthenticated Whether to redirect to login if not authenticated
   */
  useEffect(() => {
    if (status === 'unauthenticated' && window.location.pathname !== '/login' && 
        window.location.pathname !== '/register' && !window.location.pathname.startsWith('/b/')) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [status, router]);

  /**
   * Login handler with redirect
   */
  const login = async (email: string, password: string, callbackUrl?: string) => {
    try {
      const result = await signIn('credentials', { 
        email, 
        password, 
        redirect: false 
      });

      if (result?.error) {
        return { success: false, error: result.error };
      }

      if (callbackUrl) {
        router.push(callbackUrl);
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  /**
   * Logout handler with redirect
   */
  const logout = async (callbackUrl: string = '/login') => {
    await signOut({ redirect: false });
    router.push(callbackUrl);
  };

  /**
   * Check if user has admin role
   */
  const isAdmin = user?.role === 'ADMIN';

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    // Admin role has all permissions
    if (user.role === 'ADMIN') return true;
    
    // Define permissions for USER role
    const userPermissions = [
      'bins:read',
      'bins:create',
      'items:read',
      'items:create',
      'profile:read',
      'profile:update'
    ];
    
    return userPermissions.includes(permission);
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    isAdmin,
    login,
    logout,
    hasPermission,
  };
} 