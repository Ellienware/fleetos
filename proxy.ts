import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/about',
  '/contact',
  '/api/webhooks',
  '/join', // Owner self-registration
  '/driver/login', // Driver login page
  '/driver', // Driver portal pages (they use JWT auth, not session)
];

// API routes that don't require session authentication
const publicApiRoutes = [
  '/api/webhooks',
  '/api/driver/auth/request-otp',
  '/api/driver/auth/verify-otp',
  '/api/join', // Owner registration API
];

// Routes that require SUPER_ADMIN role
const adminRoutes = ['/admin'];

// Routes that require tenant context (ASSOCIATION_ADMIN)
const tenantRoutes = ['/tenant'];

// Routes for owners
const ownerRoutes = ['/owner'];

// Driver API routes that require JWT authentication (not session)
const driverApiRoutes = [
  '/api/driver/profile',
  '/api/driver/routes',
  '/api/driver/announcements',
  '/api/driver/shifts',
  '/api/driver/attendance',
  '/api/driver/location',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  // Handle driver API routes - these use JWT, not session cookies
  const isDriverApiRoute = driverApiRoutes.some(route => pathname.startsWith(route));
  if (isDriverApiRoute) {
    // Driver API authentication is handled in the route handlers via JWT
    return NextResponse.next();
  }
  
  // Handle public API routes
  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route));
  if (isPublicApiRoute) {
    return NextResponse.next();
  }
  
  // Skip other API routes from redirect logic (they handle their own auth)
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }
  
  // Get session cookie
  const sessionCookie = request.cookies.get('taxi_session');
  const isAuthenticated = !!sessionCookie?.value;
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  // Allow public routes without authentication
  if (isPublicRoute) {
    // If authenticated user visits login/register, redirect to dashboard
    if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }
  
  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // For authenticated routes, we'll do role-based checks in the page/layout components
  // since we need to decode the session which requires async operations
  // The middleware just ensures the session cookie exists
  
  // Add tenant ID to headers for tenant routes
  if (pathname.startsWith('/tenant/')) {
    const tenantId = pathname.split('/')[2];
    if (tenantId) {
      const response = NextResponse.next();
      response.headers.set('x-tenant-id', tenantId);
      return response;
    }
  }
  
  // Add tenant ID for owner routes
  if (pathname.startsWith('/owner/')) {
    const tenantId = pathname.split('/')[2];
    if (tenantId) {
      const response = NextResponse.next();
      response.headers.set('x-tenant-id', tenantId);
      return response;
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
