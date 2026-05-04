import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { adminCookieNames } from './lib/auth';

function getWebAppUrl(request: NextRequest) {
  return (process.env.WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? process.env.APP_URL ?? request.nextUrl.origin).replace(/\/$/, '');
}

function getAdminBaseUrl(request: NextRequest) {
  return (process.env.ADMIN_URL ?? process.env.NEXT_PUBLIC_ADMIN_URL ?? `${request.nextUrl.protocol}//${request.nextUrl.host}/admin`).replace(/\/$/, '');
}

// Public routes that don't require authentication
const PUBLIC_PATHS = [
  '/admin/auth/login',
  '/admin/auth/callback',
  '/admin/auth/refresh',
  '/admin/auth/logout',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Compliance redirect (must stay before auth check)
  if (pathname === '/admin/compliance' || pathname === '/compliance') {
    return NextResponse.redirect(new URL('/compliance', getWebAppUrl(request)));
  }

  // Skip auth check for public auth routes
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isPublic) {
    return NextResponse.next();
  }

  // Auth gate: check session cookies exist and token is not expired.
  // Full JWT cryptographic verification happens in requireAccessToken() inside each page.
  // Here we do a fast cookie-presence + expiry check to reject unauthenticated
  // requests at the edge before any page component runs.
  const accessToken = request.cookies.get(adminCookieNames.accessToken)?.value;
  const expiresAt = Number(request.cookies.get(adminCookieNames.expiresAt)?.value ?? '0');
  const refreshToken = request.cookies.get(adminCookieNames.refreshToken)?.value;

  const hasValidSession = Boolean(accessToken) && Boolean(refreshToken);
  const isExpired = expiresAt > 0 && expiresAt <= Date.now() + 30_000;

  if (!hasValidSession) {
    // No session at all → redirect to login
    const adminBase = getAdminBaseUrl(request);
    const loginUrl = new URL(`${adminBase}/auth/login`);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isExpired) {
    // Token expired → redirect to refresh endpoint which will renew silently
    const adminBase = getAdminBaseUrl(request);
    const refreshUrl = new URL(`${adminBase}/auth/refresh`);
    refreshUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(refreshUrl);
  }

  // Add security headers to every admin response
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all admin routes EXCEPT Next.js internals and static assets.
     * This covers /admin, /compliance, and any sub-path.
     */
    '/admin/:path*',
    '/compliance',
  ]
};
