import { NextRequest, NextResponse } from 'next/server';
import { consumeLoginState, exchangeAuthorizationCode, persistSession } from '../../../lib/auth';
import { getMarketplaceViewer } from '../../../lib/marketplace-viewer';

function getPublicAppUrl(host?: string | null) {
  const requestHost = host?.split(',')[0]?.trim();
  if (requestHost && /^(localhost|127\.0\.0\.1|::1)(:\d+)?$/i.test(requestHost)) {
    return `http://${requestHost}`;
  }

  return process.env.WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? process.env.APP_URL ?? 'http://localhost:3001';
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
  const { state, returnTo } = await consumeLoginState();
  const requestHost = request.headers.get('host');
  const appUrl = getPublicAppUrl(requestHost);

  if (!code || !returnedState || !state || returnedState !== state) {
    return NextResponse.redirect(new URL('/?auth=invalid-state', appUrl));
  }

  try {
    const session = await exchangeAuthorizationCode(code, requestHost);
    await persistSession(session);

    const viewer = await getMarketplaceViewer();
    const destination = resolvePostLoginPath(returnTo, viewer.role);
    return NextResponse.redirect(new URL(destination, appUrl));
  } catch {
    return NextResponse.redirect(new URL('/?auth=callback-error', appUrl));
  }
}
