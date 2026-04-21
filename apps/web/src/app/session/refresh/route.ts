import { NextRequest, NextResponse } from 'next/server';
import { getOptionalSession, persistSession, refreshSessionTokens } from '../../../lib/auth';

function getPublicAppUrl(host?: string | null) {
  const requestHost = host?.split(',')[0]?.trim();
  if (requestHost && /^(localhost|127\.0\.0\.1|::1)(:\d+)?$/i.test(requestHost)) {
    return `http://${requestHost}`;
  }

  return process.env.WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? process.env.APP_URL ?? 'http://localhost:3001';
}

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/';
  const session = await getOptionalSession();
  const requestHost = request.headers.get('host');
  const appUrl = getPublicAppUrl(requestHost);

  if (!session) {
    return NextResponse.redirect(new URL(`/signin?returnTo=${encodeURIComponent(returnTo)}`, appUrl));
  }

  try {
    const refreshed = await refreshSessionTokens(session.refreshToken, requestHost);
    await persistSession(refreshed);
    return NextResponse.redirect(new URL(returnTo, appUrl));
  } catch {
    return NextResponse.redirect(new URL(`/signin?returnTo=${encodeURIComponent(returnTo)}`, appUrl));
  }
}
