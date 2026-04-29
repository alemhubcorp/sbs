import { NextRequest, NextResponse } from 'next/server';
import {
  buildWebAppUrl,
  cookieNames,
  exchangeAuthorizationCode,
  getWebCookieOptions
} from '../../../lib/auth';
import { getMarketplaceViewer } from '../../../lib/marketplace-viewer';

function resolvePostLoginPath(returnTo: string, role: string) {
  const genericTargets = new Set(['/', '/dashboard', '/signin', '/register', '/register/buyer', '/register/supplier']);

  if (!genericTargets.has(returnTo)) {
    return returnTo;
  }

  if (role === 'logistics') {
    return '/logistics';
  }

  if (role === 'customs') {
    return '/customs';
  }

  if (role === 'supplier' || role === 'buyer' || role === 'admin') {
    return '/dashboard';
  }

  return returnTo;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const returnedState = request.nextUrl.searchParams.get('state');
  const requestHost = request.headers.get('host');
  const appUrl = buildWebAppUrl(requestHost);
  const state = request.cookies.get(cookieNames.state)?.value ?? null;
  const returnTo = request.cookies.get(cookieNames.returnTo)?.value ?? '/';

  if (!code || !returnedState || !state || returnedState !== state) {
    return NextResponse.redirect(new URL('/signin?auth=invalid-state', appUrl));
  }

  try {
    const session = await exchangeAuthorizationCode(code, requestHost);

    if (session.profile.emailVerified === false) {
      return NextResponse.redirect(new URL('/signin?auth=email-verification-required', appUrl));
    }
    const viewer = await getMarketplaceViewer();
    const destination = resolvePostLoginPath(returnTo, viewer.role);
    const response = NextResponse.redirect(new URL(destination, appUrl));
    const cookieOptions = getWebCookieOptions(requestHost);

    response.cookies.delete(cookieNames.state);
    response.cookies.delete(cookieNames.returnTo);
    response.cookies.set(cookieNames.accessToken, session.accessToken, cookieOptions);
    response.cookies.set(cookieNames.refreshToken, session.refreshToken, cookieOptions);
    response.cookies.set(cookieNames.expiresAt, String(session.expiresAt), cookieOptions);

    if (session.idToken) {
      response.cookies.set(cookieNames.idToken, session.idToken, cookieOptions);
    } else {
      response.cookies.delete(cookieNames.idToken);
    }

    return response;
  } catch {
    return NextResponse.redirect(new URL('/signin?auth=callback-error', appUrl));
  }
}
