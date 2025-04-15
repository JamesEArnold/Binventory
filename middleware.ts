import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Routes that require authentication
const protectedRoutes = [
  '/profile',
  '/admin',
];

// Routes that are public
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/b', // QR code redirect routes
  '/api/auth',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
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
  
  return NextResponse.next();
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