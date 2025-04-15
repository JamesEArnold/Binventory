import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: Role;
};

export type Session = {
  user: SessionUser;
};

/**
 * Get the current session from the server
 */
export async function getSession() {
  try {
    return await getServerSession(authOptions);
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}

/**
 * Get the current user from the session
 * @returns The current user or null if not authenticated
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Check if the user is authenticated
 * @param redirectTo The path to redirect to if not authenticated
 */
export async function requireAuth(redirectTo: string = "/login") {
  const user = await getCurrentUser();
  if (!user) {
    redirect(redirectTo);
  }
  return user;
}

/**
 * Check if the user has the required role
 * @param role The required role
 * @param redirectTo The path to redirect to if not authorized
 */
export async function requireRole(role: Role, redirectTo: string = "/") {
  const user = await requireAuth();
  if (user.role !== role && user.role !== Role.ADMIN) {
    redirect(redirectTo);
  }
  return user;
}

/**
 * Check if the user has the required permission
 * @param permission The permission to check
 */
export function hasPermission(user: SessionUser | null, permission: string): boolean {
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