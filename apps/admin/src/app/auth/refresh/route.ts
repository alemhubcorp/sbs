import { NextRequest, NextResponse } from 'next/server';
import { getOptionalSession, persistSession, refreshSessionTokens } from '../../../lib/auth';

function getPublicAppUrl(host?: string | null) {
  const requestHost = host?.split(',')[0]?.trim();
  if (requestHost && /^(localhost|127\.0\.0\.1|::1)(:\d+)?$/i.test(requestHost)) {
    return `http://${requestHost}/admin`;
  }

  return process.env.ADMIN_URL ?? process.env.NEXT_PUBLIC_ADMIN_URL ?? process.env.APP_URL ?? 'http://localhost:3002';
}

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
  const appUrl = getPublicAppUrl(requestHost);

  if (!session) {
    return NextResponse.redirect(buildRedirectUrl(appUrl, `/auth/login?returnTo=${encodeURIComponent(returnTo)}`));
  }

  try {
    const refreshed = await refreshSessionTokens(session.refreshToken, requestHost);
    await persistSession(refreshed);
    return NextResponse.redirect(buildRedirectUrl(appUrl, returnTo));
  } catch {
    return NextResponse.redirect(buildRedirectUrl(appUrl, `/auth/login?returnTo=${encodeURIComponent(returnTo)}`));
  }
}
