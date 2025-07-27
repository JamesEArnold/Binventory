import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

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
  
  // Basic API authentication check
  if (pathname.startsWith('/api/')) {
    // Allow public auth routes
    if (pathname.startsWith('/api/auth/') || pathname.startsWith('/api/csrf')) {
      return NextResponse.next();
    }
    
    // Check authentication for protected API routes
    const token = await getToken({ req: request });
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
    
    return NextResponse.next();
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
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Check admin access
  if (pathname.startsWith('/admin') && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Apply basic security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

// Define which routes this middleware should run on
export const config = {
  matcher: [
    '/((?!api/auth|_next|_static|images|favicon.ico).*)',
  ],
};