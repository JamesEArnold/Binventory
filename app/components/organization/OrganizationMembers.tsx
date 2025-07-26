'use client';

import { FC, useState } from 'react';
import { OrgRole } from '@prisma/client';
import { OrganizationWithMemberDetails } from '@/types/organization';

interface OrganizationMembersProps {
  organization: OrganizationWithMemberDetails;
  userRole: OrgRole | null;
  currentUserId: string;
  onMemberUpdate: () => Promise<void>;
}

export const OrganizationMembers: FC<OrganizationMembersProps> = ({
  organization,
  userRole,
  currentUserId,
  onMemberUpdate
}) => {
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>(OrgRole.MEMBER);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Check if user has permission to manage members
  const canManageMembers = userRole === OrgRole.OWNER || userRole === OrgRole.ADMIN;
  
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch(`/api/organizations/${organization.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          role: inviteRole
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to invite member');
      }
      
      setSuccessMessage(`Invitation sent to ${email}`);
      setEmail('');
      setInviteRole(OrgRole.MEMBER);
      setIsInviting(false);
      
      // Refresh the members list
      await onMemberUpdate();
    } catch (err) {
      console.error('Error inviting member:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while inviting member');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch(
        `/api/organizations/${organization.id}/members/${memberId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to remove member');
      }
      
      setSuccessMessage('Member removed successfully');
      
      // Refresh the members list
      await onMemberUpdate();
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while removing member');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUpdateRole = async (memberId: string, newRole: OrgRole) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch(
        `/api/organizations/${organization.id}/members/${memberId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: newRole
          })
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update member role');
      }
      
      setSuccessMessage('Member role updated successfully');
      
      // Refresh the members list
      await onMemberUpdate();
    } catch (err) {
      console.error('Error updating member role:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while updating member role');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get role label for display
  const getRoleLabel = (role: OrgRole) => {
    switch (role) {
      case OrgRole.OWNER:
        return 'Owner';
      case OrgRole.ADMIN:
        return 'Admin';
      case OrgRole.EDITOR:
        return 'Editor';
      case OrgRole.VIEWER:
        return 'Viewer';
      default:
        return 'Member';
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
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Organization Members</h2>
        
        {canManageMembers && (
          <button
            onClick={() => setIsInviting(!isInviting)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            disabled={isLoading}
          >
            {isInviting ? 'Cancel' : 'Invite Member'}
          </button>
        )}
      </div>
      
      {isInviting && (
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <h3 className="text-md font-medium mb-3">Invite New Member</h3>
          <form onSubmit={handleInvite}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="user@example.com"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={OrgRole.MEMBER}>Member</option>
                  <option value={OrgRole.VIEWER}>Viewer</option>
                  <option value={OrgRole.EDITOR}>Editor</option>
                  <option value={OrgRole.ADMIN}>Admin</option>
                  {userRole === OrgRole.OWNER && (
                    <option value={OrgRole.OWNER}>Owner</option>
                  )}
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInviting(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md mr-2 hover:bg-gray-200"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              {canManageMembers && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {organization.memberships.map((member) => (
              <tr key={member.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {member.user?.image ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={member.user.image}
                          alt=""
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                          {member.user?.name ? member.user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {member.user?.name || 'Unnamed User'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.user?.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {canManageMembers && member.userId !== currentUserId ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateRole(member.id, e.target.value as OrgRole)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoading || member.role === OrgRole.OWNER}
                    >
                      <option value={OrgRole.MEMBER}>Member</option>
                      <option value={OrgRole.VIEWER}>Viewer</option>
                      <option value={OrgRole.EDITOR}>Editor</option>
                      <option value={OrgRole.ADMIN}>Admin</option>
                      {userRole === OrgRole.OWNER && (
                        <option value={OrgRole.OWNER}>Owner</option>
                      )}
                    </select>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getRoleLabel(member.role)}
                    </span>
                  )}
                </td>
                {canManageMembers && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {member.userId !== currentUserId && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-900 ml-4"
                        disabled={isLoading || member.role === OrgRole.OWNER}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 