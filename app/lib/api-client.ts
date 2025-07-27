/**
 * Client-side API wrapper for auth operations
 * This provides the same interface as direct service imports but makes HTTP requests
 */

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
  error?: string;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; image?: string }
): Promise<AuthResult> {
  try {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, ...data }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to update profile',
      };
    }

    return result;
  } catch (error) {
    console.error('Error updating profile:', error);
    return {
      success: false,
      error: 'Network error occurred',
    };
  }
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<AuthResult> {
  try {
    const response = await fetch('/api/profile/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        currentPassword,
        newPassword,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to change password',
      };
    }

    return result;
  } catch (error) {
    console.error('Error changing password:', error);
    return {
      success: false,
      error: 'Network error occurred',
    };
  }
}