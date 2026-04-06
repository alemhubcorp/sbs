import { NextRequest, NextResponse } from 'next/server';
import { getOptionalSession, persistSession, refreshSessionTokens } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/';
  const session = await getOptionalSession();

  if (!session) {
    return NextResponse.redirect(new URL(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`, request.url));
  }

  try {
    const refreshed = await refreshSessionTokens(session.refreshToken);
    await persistSession(refreshed);
    return NextResponse.redirect(new URL(returnTo, request.url));
  } catch {
    return NextResponse.redirect(new URL(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`, request.url));
  }
}
