'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { OrgRole } from '@prisma/client';
import { OperationContext, OrganizationWithMemberDetails } from '@/types/organization';
import { useAuth } from '@/hooks/useAuth';

interface OrganizationContextType {
  context: OperationContext;
  organizations: OrganizationWithMemberDetails[];
  currentOrganization: OrganizationWithMemberDetails | null;
  isLoading: boolean;
  error: string | null;
  switchContext: (newContext: OperationContext) => void;
  userRole: OrgRole | null;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [context, setContext] = useState<OperationContext>({ type: 'personal' });
  const [organizations, setOrganizations] = useState<OrganizationWithMemberDetails[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<OrganizationWithMemberDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<OrgRole | null>(null);
  const isUpdatingContext = useRef(false);
  const initialLoadComplete = useRef(false);
  
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Initial load from localStorage - prioritize this
  useEffect(() => {
    if (typeof window !== 'undefined' && !initialLoadComplete.current) {
      initialLoadComplete.current = true;
      
      try {
        const savedContext = localStorage.getItem('binventory-context');
        if (savedContext) {
          const parsedContext = JSON.parse(savedContext) as OperationContext;
          setContext(parsedContext);
          console.log('Loaded initial context from localStorage:', parsedContext);
        }
      } catch (e) {
        console.error('Failed to load saved context on initial load:', e);
      }
    }
  }, []);

  // Function to fetch organizations
  const fetchOrganizations = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/organizations');
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        setOrganizations(data.data);
      } else {
        throw new Error(data.error?.message || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load organizations on auth state change
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrganizations();
    } else {
      setOrganizations([]);
      setCurrentOrganization(null);
      // Don't reset context here to ensure persistence across logins
    }
  }, [isAuthenticated, fetchOrganizations]);

  // Update current organization when context changes
  useEffect(() => {
    if (context.type === 'organization' && context.id) {
      const org = organizations.find(o => o.id === context.id) || null;
      setCurrentOrganization(org);
      
      // Set user role in current organization
      if (org) {
        const membership = org.memberships.find(m => m.userId === user?.id);
        setUserRole(membership?.role || null);
      } else {
        setUserRole(null);
      }
    } else {
      setCurrentOrganization(null);
      setUserRole(null);
    }
  }, [context, organizations, user]);

  // Function to switch context
  const switchContext = (newContext: OperationContext) => {
    // Always save the context to localStorage first
    localStorage.setItem('binventory-context', JSON.stringify(newContext));
    
    // Then update the state
    setContext(newContext);
    
    // Skip navigation if the flag is set
    if (newContext.skipNavigation) {
      return;
    }
    
    // Update URL to include organization in context if needed
    if (newContext.type === 'organization' && newContext.id) {
      // Only redirect if we're on a page that supports organization context
      if (
        !pathname?.startsWith('/organizations/') &&
        (pathname?.startsWith('/bins') || 
        pathname?.startsWith('/items') || 
        pathname?.startsWith('/categories') || 
        pathname === '/')
      ) {
        // Use /organizations/ prefix
        router.push(`/organizations/${newContext.id}`);
      }
    } else if (newContext.type === 'personal') {
      // Remove organization from URL if we're switching to personal context
      if (pathname?.includes('/organizations/') || pathname?.includes('/org/')) {
        // Figure out which path to redirect to
        let newPath = pathname;
        newPath = newPath.replace(/\/organizations\/[^/]+/, '');
        newPath = newPath.replace(/\/org\/[^/]+/, '');
        router.push(newPath || '/');
      }
    }
  };

  // Extract context id to avoid complex expression in dependency array
  const contextId = context.type === 'organization' ? (context as { id: string }).id : undefined;

  // Parse organization from URL on initial render and route changes
  useEffect(() => {
    // Allow a small delay for the initial load from localStorage to complete
    const timer = setTimeout(() => {
      if (pathname && !isUpdatingContext.current) {
        isUpdatingContext.current = true;
        
        try {
          // Check for both /org/ and /organizations/ patterns
          const orgMatch = pathname.match(/\/org\/([^/]+)/);
          const organizationsMatch = pathname.match(/\/organizations\/([^/]+)/);
          
          // Get the organization ID from either URL pattern
          const orgId = organizationsMatch?.[1] || orgMatch?.[1];
          
          if (orgId && orgId !== 'new') {
            // Safety check - only update if definitely not already set correctly
            const needsUpdate = context.type !== 'organization' || 
              (context.type === 'organization' && 'id' in context && context.id !== orgId);
            
            if (needsUpdate) {
              // Update context and save to localStorage
              const newContext: OperationContext = { 
                type: 'organization', 
                id: orgId, 
                skipNavigation: true 
              };
              setContext(newContext);
              localStorage.setItem('binventory-context', JSON.stringify(newContext));
              console.log('Updated context from URL:', newContext);
            }
          } else if (
            pathname && 
            !pathname.includes('/org/') && 
            !pathname.includes('/organizations/') &&
            pathname !== '/' && // Don't reset context on the dashboard page
            context.type === 'organization'
          ) {
            // We're not changing the context here if it's explicitly set
            // Only check if we're navigating to a non-org page and have a saved context
            const personalContext: OperationContext = { type: 'personal', skipNavigation: true };
            setContext(personalContext);
          }
        } finally {
          // Small timeout to prevent too rapid updates
          setTimeout(() => {
            isUpdatingContext.current = false;
          }, 50);
        }
      }
    }, 100); // Small delay to allow initial load to complete
    
    return () => clearTimeout(timer);
  }, [pathname, context.type, contextId, context]);

  // Load saved context from localStorage on initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedContext = localStorage.getItem('binventory-context');
        if (savedContext) {
          const parsedContext = JSON.parse(savedContext) as OperationContext;
          
          // If we're on a page with organization in URL, prefer that
          const orgMatch = pathname?.match(/\/org\/([^/]+)/);
          const organizationsMatch = pathname?.match(/\/organizations\/([^/]+)/);
          const orgId = organizationsMatch?.[1] || orgMatch?.[1];
          
          if (orgId && orgId !== 'new') {
            // URL has priority
            if (parsedContext.type !== 'organization' || parsedContext.id !== orgId) {
              const newContext = { type: 'organization' as const, id: orgId, skipNavigation: true };
              setContext(newContext);
              localStorage.setItem('binventory-context', JSON.stringify(newContext));
            } else {
              setContext(parsedContext);
            }
          } else {
            // No org in URL, use the saved context
            setContext(parsedContext);
          }
        }
      } catch (e) {
        console.error('Failed to load saved context:', e);
      }
    }
  }, [pathname, context]);

  const refreshOrganizations = async () => {
    await fetchOrganizations();
  };

  return (
    <OrganizationContext.Provider
      value={{
        context,
        organizations,
        currentOrganization,
        isLoading,
        error,
        switchContext,
        userRole,
        refreshOrganizations
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
} 