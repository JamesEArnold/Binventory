'use client';

import { FC, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrganizationWithMemberDetails } from '@/types/organization';

interface OrganizationSettingsProps {
  organization: OrganizationWithMemberDetails;
  onSettingsUpdate: () => Promise<void>;
}

export const OrganizationSettings: FC<OrganizationSettingsProps> = ({
  organization,
  onSettingsUpdate
}) => {
  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [description, setDescription] = useState(organization.description || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  const router = useRouter();
  
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Organization name is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          slug,
          description
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update organization');
      }
      
      setSuccessMessage('Organization updated successfully');
      
      // Refresh organization data
      await onSettingsUpdate();
    } catch (err) {
      console.error('Error updating organization:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while updating organization');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (deleteConfirmation !== organization.name) {
      setError('Please type the organization name correctly to confirm deletion');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to delete organization');
      }
      
      // Redirect to home page
      router.push('/');
    } catch (err) {
      console.error('Error deleting organization:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting organization');
      setIsLoading(false);
    }
  };
  
  return (
    <div>
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
      
      <h2 className="text-lg font-semibold mb-6">Organization Settings</h2>
      
      <form onSubmit={handleUpdate}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Organization Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter organization name"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
            URL Slug *
          </label>
          <div className="flex items-center">
            <span className="text-gray-500 mr-2">/organizations/</span>
            <input
              type="text"
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="organization-name"
              pattern="^[a-z0-9-]+$"
              title="Only lowercase letters, numbers, and hyphens are allowed"
              required
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Only lowercase letters, numbers, and hyphens. No spaces.
          </p>
        </div>
        
        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe your organization"
            rows={3}
          />
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
      
      <div className="mt-12 border-t border-gray-200 pt-8">
        <h3 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h3>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete an organization, there is no going back. Please be certain.
        </p>
        
        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="px-4 py-2 bg-red-100 text-red-700 border border-red-300 rounded-md hover:bg-red-200"
        >
          Delete Organization
        </button>
      </div>
      
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Organization</h3>
            
            <p className="text-sm text-gray-600 mb-4">
              This action cannot be undone. This will permanently delete the organization, remove all memberships, and delete all associated data.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Please type <span className="font-semibold">{organization.name}</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmation('');
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading || deleteConfirmation !== organization.name}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Deleting...' : 'Delete Organization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 