import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { apiRateLimiter, authRateLimiter, getUserIdentifier, rateLimit } from '@/lib/rate-limit';
import { getSecurityHeaders, securityConfigs } from '@/lib/security-headers';
import { checkCSRFProtection } from '@/lib/csrf';

// Routes that require authentication
const protectedRoutes = [
  '/',
  '/profile',
  '/admin',
  '/bins',
  '/items',
  '/categories',
  '/scanner',
  '/search'
];

// Routes that are public
const publicRoutes = [
  '/login',
  '/register',
  '/b', // QR code redirect routes
  '/api/auth',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    // Get user identifier for rate limiting
    const token = await getToken({ req: request });
    const userIdentifier = getUserIdentifier(request, token?.id as string);
    
    // Choose appropriate rate limiter
    const limiter = pathname.startsWith('/api/auth/') ? authRateLimiter : apiRateLimiter;
    
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, limiter, userIdentifier);
    
    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...rateLimitResult.headers,
          },
        }
      );
    }
    
    // Add rate limit headers to successful responses
    const response = NextResponse.next();
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Check CSRF protection for state-changing operations
    const csrfCheck = await checkCSRFProtection(request);
    if (!csrfCheck.valid) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: 'CSRF_TOKEN_INVALID',
            message: csrfCheck.error || 'CSRF token validation failed',
          },
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Continue with existing auth middleware for API routes
    if (!pathname.startsWith('/api/auth/') && !pathname.startsWith('/api/csrf')) {
      // Check authentication for protected API routes
      if (!token) {
        return new NextResponse(
          JSON.stringify({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
            },
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }
    
    return response;
  }
  
  // Check if the route is protected
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route) || pathname === route
  );
  
  // Allow public routes
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route) || pathname === route
  );
  
  // If not protected, allow access
  if (!isProtectedRoute || isPublicRoute) {
    return NextResponse.next();
  }
  
  // Get token
  const token = await getToken({ req: request });
  
  // If not authenticated, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    // Add the current path as a callback parameter
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Check admin access
  if (pathname.startsWith('/admin') && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Apply security headers to all responses
  const response = NextResponse.next();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const securityConfig = isDevelopment ? securityConfigs.development : securityConfigs.production;
  const securityHeaders = getSecurityHeaders(securityConfig);
  
  Object.entries(securityHeaders).forEach(([name, value]) => {
    if (value) {
      response.headers.set(name, value);
    }
  });
  
  return response;
}

// Define which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/auth/* (NextAuth.js authentication routes)
     * 2. /_next/* (Next.js internal routes)
     * 3. /_static/* (Static assets)
     * 4. /images/* (Image assets)
     * 5. /favicon.ico, /logo.png, etc. (Static files)
     */
    '/((?!api/auth|_next|_static|images|favicon.ico).*)',
  ],
}; 