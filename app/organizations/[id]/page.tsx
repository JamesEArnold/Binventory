'use client';

/**
 * @description Organization detail page implementation for Phase 7.3: Shared Inventory Experience
 * @phase Shared Inventory Experience
 * @dependencies Phase 7.1, Phase 7.2
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { OrgRole } from '@prisma/client';
import { use } from 'react';

// Tab components for organization settings
import { OrganizationMembers } from '@/components/organization/OrganizationMembers';
import { OrganizationSettings } from '@/components/organization/OrganizationSettings';

type TabType = 'members' | 'settings';

export default function OrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id: organizationId } = unwrappedParams;
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadCompleted = useRef(false);
  const contextSwitchCompleted = useRef(false);
  
  const { user, isAuthenticated } = useAuth();
  const { 
    currentOrganization, 
    userRole, 
    refreshOrganizations, 
    switchContext,
    context
  } = useOrganization();

  // First useEffect to handle context switch only once
  useEffect(() => {
    if (isAuthenticated && organizationId && !contextSwitchCompleted.current) {
      // Check if we're already in the right context to avoid unnecessary switching
      const isAlreadyInContext = 
        context.type === 'organization' && 
        context.id === organizationId;
      
      if (!isAlreadyInContext) {
        // Set the context without triggering navigation
        switchContext({ 
          type: 'organization', 
          id: organizationId,
          skipNavigation: true
        });
      }
      
      contextSwitchCompleted.current = true;
    }
  }, [isAuthenticated, organizationId, context, switchContext]);

  // Second useEffect to handle data fetching only once
  useEffect(() => {
    if (isAuthenticated && organizationId && !initialLoadCompleted.current && contextSwitchCompleted.current) {
      setLoading(true);
      
      refreshOrganizations()
        .then(() => {
          setLoading(false);
          initialLoadCompleted.current = true;
        })
        .catch(err => {
          console.error('Error loading organization:', err);
          setError('Failed to load organization details');
          setLoading(false);
          initialLoadCompleted.current = true;
        });
    }
  }, [isAuthenticated, organizationId, refreshOrganizations]);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-4">
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-6">Sign In Required</h1>
          <p className="text-gray-600 mb-4">You need to be signed in to view this organization.</p>
          <div className="flex justify-center">
            <Link href="/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="max-w-4xl mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="flex space-x-4 mb-6">
              <div className="h-10 bg-gray-200 rounded w-24"></div>
              <div className="h-10 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentOrganization) {
    return (
      <div className="container mx-auto p-4">
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-6">Error</h1>
          <p className="text-gray-600 mb-4">
            {error || 'Organization not found or you do not have access to it.'}
          </p>
          <div className="flex justify-center">
            <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Check if user has admin-level access (owner or admin role)
  const hasAdminAccess = userRole === OrgRole.OWNER || userRole === OrgRole.ADMIN;

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto mt-4">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{currentOrganization.name}</h1>
            
            <button
              onClick={() => {
                // Set context first without navigation
                switchContext({ 
                  type: 'organization', 
                  id: organizationId,
                  skipNavigation: true
                });
                
                // Then manually navigate to bins page
                setTimeout(() => {
                  window.location.href = `/bins`;
                }, 100);
              }}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
              </svg>
              Switch to This Context
            </button>
          </div>
          {currentOrganization.description && (
            <p className="text-gray-600 mt-2">{currentOrganization.description}</p>
          )}
        </header>

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => handleTabChange('members')}
                className={`py-4 px-6 text-sm font-medium ${
                  activeTab === 'members'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Members
              </button>
              {hasAdminAccess && (
                <button
                  onClick={() => handleTabChange('settings')}
                  className={`py-4 px-6 text-sm font-medium ${
                    activeTab === 'settings'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Settings
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'members' && (
              <OrganizationMembers 
                organization={currentOrganization}
                userRole={userRole}
                currentUserId={user?.id || ''}
                onMemberUpdate={refreshOrganizations}
              />
            )}
            
            {activeTab === 'settings' && hasAdminAccess && (
              <OrganizationSettings 
                organization={currentOrganization}
                onSettingsUpdate={refreshOrganizations}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 