import { NextRequest, NextResponse } from 'next/server';
import {
  buildWebAppUrl,
  cookieNames,
  exchangeAuthorizationCode,
  getWebCookieOptions
} from '../../../lib/auth';

const internalApiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

function deriveRole(roles?: string[]): string {
  if (roles?.includes('platform_admin')) return 'admin';
  if (roles?.includes('logistics_company')) return 'logistics';
  if (roles?.includes('customs_broker')) return 'customs';
  if (roles?.includes('supplier_user')) return 'supplier';
  if (roles?.includes('customer_user')) return 'buyer';
  return 'guest';
}

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

    // Resolve role using the new session token directly (cookies not set yet on this response).
    let role = 'guest';
    try {
      const ctxResponse = await fetch(`${internalApiBaseUrl}/api/identity/context`, {
        headers: { authorization: `Bearer ${session.accessToken}` },
        cache: 'no-store'
      });
      if (ctxResponse.ok) {
        const ctx = (await ctxResponse.json()) as { roles?: string[] };
        role = deriveRole(ctx.roles);
      }
    } catch {
      // Fall back to guest; cookies still get set so user can retry protected pages.
    }

    const destination = resolvePostLoginPath(returnTo, role);
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
