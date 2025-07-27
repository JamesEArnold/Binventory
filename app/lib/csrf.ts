/**
 * CSRF protection implementation for state-changing operations
 */

import { createHash, randomBytes } from 'crypto';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';

interface CSRFToken {
  token: string;
  timestamp: number;
  userId?: string;
}

// In-memory token storage (consider Redis for production scaling)
const tokenStore = new Map<string, CSRFToken>();

// Token expiration time (15 minutes)
const TOKEN_EXPIRY = 15 * 60 * 1000;

// Cleanup interval (5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, token] of Array.from(tokenStore.entries())) {
    if (now - token.timestamp > TOKEN_EXPIRY) {
      tokenStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(userId?: string): string {
  const token = randomBytes(32).toString('hex');
  const timestamp = Date.now();
  
  tokenStore.set(token, {
    token,
    timestamp,
    userId,
  });
  
  return token;
}

/**
 * Validate a CSRF token
 */
export function validateCSRFToken(token: string, userId?: string): boolean {
  const storedToken = tokenStore.get(token);
  
  if (!storedToken) {
    return false;
  }
  
  // Check if token has expired
  if (Date.now() - storedToken.timestamp > TOKEN_EXPIRY) {
    tokenStore.delete(token);
    return false;
  }
  
  // Check if user matches (if provided)
  if (userId && storedToken.userId && storedToken.userId !== userId) {
    return false;
  }
  
  // Token is valid, remove it (one-time use)
  tokenStore.delete(token);
  return true;
}

/**
 * Create a double-submit cookie CSRF token
 */
export function createDoubleSubmitToken(userId?: string): {
  token: string;
  cookieValue: string;
} {
  const baseToken = randomBytes(32).toString('hex');
  const secret = randomBytes(32).toString('hex');
  
  // Create HMAC-like signature
  const signature = createHash('sha256')
    .update(baseToken + secret + (userId || ''))
    .digest('hex');
  
  const token = `${baseToken}.${signature}`;
  const cookieValue = secret;
  
  return { token, cookieValue };
}

/**
 * Validate double-submit CSRF token
 */
export function validateDoubleSubmitToken(
  token: string,
  cookieValue: string,
  userId?: string
): boolean {
  if (!token || !cookieValue) {
    return false;
  }
  
  const [baseToken, signature] = token.split('.');
  if (!baseToken || !signature) {
    return false;
  }
  
  // Recreate the expected signature
  const expectedSignature = createHash('sha256')
    .update(baseToken + cookieValue + (userId || ''))
    .digest('hex');
  
  // Use timing-safe comparison
  return timingSafeEqual(signature, expectedSignature);
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Middleware function to check CSRF protection
 */
export async function checkCSRFProtection(request: NextRequest): Promise<{
  valid: boolean;
  error?: string;
}> {
  const method = request.method;
  
  // Only check CSRF for state-changing operations
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return { valid: true };
  }
  
  // Skip CSRF check for authentication endpoints (they have their own protection)
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return { valid: true };
  }
  
  // Get user information
  const token = await getToken({ req: request });
  const userId = token?.id as string;
  
  // Get CSRF token from different possible sources
  const csrfToken = 
    request.headers.get('x-csrf-token') ||
    request.headers.get('csrf-token') ||
    request.nextUrl.searchParams.get('csrf_token');
  
  if (!csrfToken) {
    return {
      valid: false,
      error: 'CSRF token missing. Include X-CSRF-Token header or csrf_token parameter.',
    };
  }
  
  // For double-submit pattern, also get the cookie
  const csrfCookie = request.cookies.get('csrf-secret')?.value;
  
  // Try double-submit validation first (more secure)
  if (csrfCookie) {
    const isValid = validateDoubleSubmitToken(csrfToken, csrfCookie, userId);
    return {
      valid: isValid,
      error: isValid ? undefined : 'Invalid CSRF token',
    };
  }
  
  // Fallback to server-side token validation
  const isValid = validateCSRFToken(csrfToken, userId);
  return {
    valid: isValid,
    error: isValid ? undefined : 'Invalid or expired CSRF token',
  };
}

/**
 * Get CSRF token for client-side use
 */
export function getCSRFTokenForClient(userId?: string): {
  token: string;
  cookieValue: string;
} {
  return createDoubleSubmitToken(userId);
}

/**
 * Helper to create CSRF-protected form data
 */
export function addCSRFToFormData(
  formData: FormData,
  csrfToken: string
): FormData {
  formData.append('csrf_token', csrfToken);
  return formData;
}

/**
 * Helper to create CSRF headers
 */
export function getCSRFHeaders(csrfToken: string): HeadersInit {
  return {
    'X-CSRF-Token': csrfToken,
  };
}