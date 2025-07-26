'use client';

import { FC, useState, useEffect } from 'react';
import { Action, ObjectType, SubjectType } from '@/types/permission';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useAuth } from '@/hooks/useAuth';

interface SharingModalProps {
  objectType: ObjectType;
  objectId: string;
  objectName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Permission {
  id: string;
  subjectType: SubjectType;
  subjectId: string;
  action: Action;
  subjectName?: string; // Display name for the subject (user name, organization name)
}

export const SharingModal: FC<SharingModalProps> = ({
  objectType,
  objectId,
  objectName,
  isOpen,
  onClose
}) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [subjectType, setSubjectType] = useState<SubjectType>(SubjectType.USER);
  const [subjectId, setSubjectId] = useState('');
  const [action, setAction] = useState<Action>(Action.READ);
  
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<Array<{ id: string, name: string, email: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { user } = useAuth();
  const { organizations } = useOrganization();
  
  // Load existing permissions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadPermissions();
    }
  }, [isOpen, objectType, objectId]);
  
  // Search users as user types
  useEffect(() => {
    if (userSearchQuery.length >= 2) {
      searchUsers(userSearchQuery);
    } else {
      setUserSearchResults([]);
    }
  }, [userSearchQuery]);
  
  const loadPermissions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/objects/${objectType}/${objectId}/permissions`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load permissions');
      }
      
      if (data.success && data.data) {
        setPermissions(data.data);
      }
    } catch (err) {
      console.error('Error loading permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  };
  
  const searchUsers = async (query: string) => {
    if (query.length < 2) return;
    
    setIsSearching(true);
    
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'User search failed');
      }
      
      if (data.success && data.data) {
        setUserSearchResults(data.data);
      }
    } catch (err) {
      console.error('User search error:', err);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleAddPermission = async () => {
    if (!subjectId) {
      setError('Please select a user or organization');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objectType,
          objectId,
          subjectType,
          subjectId,
          action,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to add permission');
      }
      
      setSuccessMessage('Permission added successfully');
      
      // Clear form and reload permissions
      setSubjectId('');
      setUserSearchQuery('');
      setUserSearchResults([]);
      loadPermissions();
    } catch (err) {
      console.error('Error adding permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to add permission');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemovePermission = async (permissionId: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch(`/api/permissions/${permissionId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to remove permission');
      }
      
      setSuccessMessage('Permission removed successfully');
      
      // Reload permissions
      loadPermissions();
    } catch (err) {
      console.error('Error removing permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove permission');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get display name for permission action
  const getActionLabel = (action: Action) => {
    switch (action) {
      case Action.READ:
        return 'View';
      case Action.WRITE:
        return 'Edit';
      case Action.ADMIN:
        return 'Admin';
      default:
        return action;
    }
  };
  
  // Get subject type label
  const getSubjectTypeLabel = (type: SubjectType) => {
    switch (type) {
      case SubjectType.USER:
        return 'User';
      case SubjectType.ORGANIZATION:
        return 'Organization';
      default:
        return type;
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Sharing - {objectName}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4">Add people or organizations</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Share with
              </label>
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setSubjectType(SubjectType.USER);
                    setSubjectId('');
                    setUserSearchQuery('');
                  }}
                  className={`px-4 py-2 rounded-md ${
                    subjectType === SubjectType.USER
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}
                >
                  User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubjectType(SubjectType.ORGANIZATION);
                    setSubjectId('');
                    setUserSearchQuery('');
                  }}
                  className={`px-4 py-2 rounded-md ${
                    subjectType === SubjectType.ORGANIZATION
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}
                >
                  Organization
                </button>
              </div>
            </div>
            
            {subjectType === SubjectType.USER && (
              <div>
                <label htmlFor="userSearch" className="block text-sm font-medium text-gray-700 mb-1">
                  Search users
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="userSearch"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search by name or email"
                  />
                  {isSearching && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </span>
                  )}
                </div>
                
                {userSearchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-md overflow-hidden max-h-40 overflow-y-auto">
                    {userSearchResults.map((result) => (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => {
                          setSubjectId(result.id);
                          setUserSearchQuery(result.name || result.email);
                          setUserSearchResults([]);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                      >
                        <div>
                          <div className="font-medium">{result.name || 'Unnamed User'}</div>
                          <div className="text-sm text-gray-500">{result.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {subjectType === SubjectType.ORGANIZATION && (
              <div>
                <label htmlFor="organization" className="block text-sm font-medium text-gray-700 mb-1">
                  Select organization
                </label>
                {organizations.length > 0 ? (
                  <select
                    id="organization"
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select an organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-500">You don't have any organizations.</p>
                )}
              </div>
            )}
            
            <div>
              <label htmlFor="permission" className="block text-sm font-medium text-gray-700 mb-1">
                Permission
              </label>
              <select
                id="permission"
                value={action}
                onChange={(e) => setAction(e.target.value as Action)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={Action.READ}>Can view</option>
                <option value={Action.WRITE}>Can edit</option>
                <option value={Action.ADMIN}>Admin</option>
              </select>
            </div>
            
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddPermission}
                disabled={isLoading || !subjectId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-4">Current permissions</h3>
          
          {isLoading ? (
            <div className="text-center py-6">
              <svg className="animate-spin h-8 w-8 mx-auto text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-2 text-sm text-gray-500">Loading permissions...</p>
            </div>
          ) : permissions.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No additional permissions have been added.</p>
          ) : (
            <div className="overflow-x-auto border rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permission
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {permissions.map((permission) => (
                    <tr key={permission.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getSubjectTypeLabel(permission.subjectType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {permission.subjectName || permission.subjectId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getActionLabel(permission.action)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleRemovePermission(permission.id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={isLoading}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}; 