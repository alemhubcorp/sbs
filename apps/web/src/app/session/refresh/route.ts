import { NextRequest, NextResponse } from 'next/server';
import { buildWebAppUrl, cookieNames, getOptionalSession, getWebCookieOptions, refreshSessionTokens } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/';
  const session = await getOptionalSession();
  const requestHost = request.headers.get('host');
  const appUrl = buildWebAppUrl(requestHost);

  if (!session) {
    return NextResponse.redirect(new URL(`/signin?returnTo=${encodeURIComponent(returnTo)}`, appUrl));
  }

  try {
    const refreshed = await refreshSessionTokens(session.refreshToken, requestHost);
    const response = NextResponse.redirect(new URL(returnTo, appUrl));
    const cookieOptions = getWebCookieOptions(requestHost);

    response.cookies.set(cookieNames.accessToken, refreshed.accessToken, cookieOptions);
    response.cookies.set(cookieNames.refreshToken, refreshed.refreshToken, cookieOptions);
    response.cookies.set(cookieNames.expiresAt, String(refreshed.expiresAt), cookieOptions);

    if (refreshed.idToken) {
      response.cookies.set(cookieNames.idToken, refreshed.idToken, cookieOptions);
    } else {
      response.cookies.delete(cookieNames.idToken);
    }

    return response;
  } catch {
    return NextResponse.redirect(new URL(`/signin?returnTo=${encodeURIComponent(returnTo)}`, appUrl));
  }
}
