import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getCSRFTokenForClient } from '@/lib/csrf';

/**
 * GET /api/csrf - Get CSRF token for client-side use
 */
export async function GET(request: NextRequest) {
  try {
    // Get user information if available
    const token = await getToken({ req: request });
    const userId = token?.id as string;
    
    // Generate CSRF token
    const { token: csrfToken, cookieValue } = getCSRFTokenForClient(userId);
    
    // Create response with CSRF token
    const response = NextResponse.json({
      success: true,
      data: {
        csrfToken,
        expiresIn: 15 * 60 * 1000, // 15 minutes in milliseconds
      },
    });
    
    // Set the CSRF secret cookie (HttpOnly, Secure, SameSite)
    response.cookies.set('csrf-secret', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes in seconds
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CSRF_TOKEN_ERROR',
          message: 'Failed to generate CSRF token',
        },
      },
      { status: 500 }
    );
  }
}