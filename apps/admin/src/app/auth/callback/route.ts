import { NextRequest, NextResponse } from 'next/server';
import {
  adminCookieNames,
  buildAdminAppUrl,
  exchangeAuthorizationCode,
  getAdminCookieOptions
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
  const code = request.nextUrl.searchParams.get('code');
  const returnedState = request.nextUrl.searchParams.get('state');
  const requestHost = request.headers.get('host');
  const appUrl = buildAdminAppUrl(requestHost);
  const state = request.cookies.get(adminCookieNames.state)?.value ?? null;
  const returnTo = request.cookies.get(adminCookieNames.returnTo)?.value ?? '/';
  const cookieOptions = getAdminCookieOptions(requestHost);

  if (!code || !returnedState || !state || returnedState !== state) {
    return NextResponse.redirect(buildRedirectUrl(appUrl, '/?auth=invalid-state'));
  }

  try {
    const session = await exchangeAuthorizationCode(code, requestHost);
    const response = NextResponse.redirect(buildRedirectUrl(appUrl, returnTo));

    response.cookies.delete(adminCookieNames.state);
    response.cookies.delete(adminCookieNames.returnTo);
    response.cookies.set(adminCookieNames.accessToken, session.accessToken, cookieOptions);
    response.cookies.set(adminCookieNames.refreshToken, session.refreshToken, cookieOptions);
    response.cookies.set(adminCookieNames.expiresAt, String(session.expiresAt), cookieOptions);

    if (session.idToken) {
      response.cookies.set(adminCookieNames.idToken, session.idToken, cookieOptions);
    } else {
      response.cookies.delete(adminCookieNames.idToken);
    }

    return response;
  } catch {
    return NextResponse.redirect(buildRedirectUrl(appUrl, '/?auth=callback-error'));
  }
}
