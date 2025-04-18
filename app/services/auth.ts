import { PrismaClient, User, Role } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export type AuthResult = {
  success: boolean;
  user?: User;
  error?: string;
};

export type UserWithoutPassword = Omit<User, 'password'>;

// Remove password from user object
const excludePassword = (user: User): UserWithoutPassword => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * User registration function
 */
export async function registerUser(data: RegisterInput): Promise<AuthResult> {
  try {
    const { name, email, password } = registerSchema.parse(data);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return { success: false, error: 'User with this email already exists' };
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Create an account record for email/password auth
    await prisma.account.create({
      data: {
        userId: user.id,
        type: 'credentials',
        provider: 'credentials',
        providerAccountId: user.id, // For credentials, we can use the user ID as the provider account ID
      }
    });

    return { success: true, user: excludePassword(user) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to register user' };
  }
}

/**
 * User login function (for credentials provider)
 */
export async function verifyCredentials(
  credentials: LoginInput
): Promise<AuthResult> {
  try {
    const { email, password } = loginSchema.parse(credentials);

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Compare passwords
    const passwordValid = await compare(password, user.password);
    if (!passwordValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    return { success: true, user: excludePassword(user) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<UserWithoutPassword | null> {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return excludePassword(user);
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(user: UserWithoutPassword, permission: string): boolean {
  if (!user) return false;
  
  // Admin role has all permissions
  if (user.role === Role.ADMIN) return true;
  
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
    // Get user with password
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password
    const passwordValid = await compare(currentPassword, user.password);
    if (!passwordValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 10);

    // Update password
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true, user: excludePassword(updatedUser) };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: 'Failed to change password' };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; image?: string }
): Promise<AuthResult> {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return { success: true, user: excludePassword(updatedUser) };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: 'Failed to update profile' };
  }
}

// Factory function for auth service
export function createAuthService() {
  return {
    registerUser,
    verifyCredentials,
    getUserById,
    hasPermission,
    changePassword,
    updateUserProfile,
  };
}

export default createAuthService(); 