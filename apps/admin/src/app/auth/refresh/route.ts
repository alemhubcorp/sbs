import { NextRequest, NextResponse } from 'next/server';
import {
  adminCookieNames,
  buildAdminAppUrl,
  getAdminCookieOptions,
  getOptionalSession,
  refreshSessionTokens
} from '../../../lib/auth';

function buildRedirectUrl(appUrl: string, targetPath: string) {
  const url = new URL(appUrl);
  const [pathname = '/', search = ''] = targetPath.split('?');
  const basePath = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  url.pathname = `${basePath}${normalizedPath}`;
  url.search = search ? `?${search}` : '';
  return url;
}

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/';
  const session = await getOptionalSession();
  const requestHost = request.headers.get('host');
  const appUrl = buildAdminAppUrl(requestHost);

  if (!session) {
    return NextResponse.redirect(buildRedirectUrl(appUrl, `/auth/login?returnTo=${encodeURIComponent(returnTo)}`));
  }

  try {
    const refreshed = await refreshSessionTokens(session.refreshToken, requestHost);
    const response = NextResponse.redirect(buildRedirectUrl(appUrl, returnTo));
    const cookieOptions = getAdminCookieOptions(requestHost);

    response.cookies.set(adminCookieNames.accessToken, refreshed.accessToken, cookieOptions);
    response.cookies.set(adminCookieNames.refreshToken, refreshed.refreshToken, cookieOptions);
    response.cookies.set(adminCookieNames.expiresAt, String(refreshed.expiresAt), cookieOptions);

    if (refreshed.idToken) {
      response.cookies.set(adminCookieNames.idToken, refreshed.idToken, cookieOptions);
    } else {
      response.cookies.delete(adminCookieNames.idToken);
    }

    return response;
  } catch {
    return NextResponse.redirect(buildRedirectUrl(appUrl, `/auth/login?returnTo=${encodeURIComponent(returnTo)}`));
  }
}
