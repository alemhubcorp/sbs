import { NextRequest, NextResponse } from 'next/server';
import { consumeLoginState, exchangeAuthorizationCode, persistSession } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const returnedState = request.nextUrl.searchParams.get('state');
  const { state, returnTo } = await consumeLoginState();

  if (!code || !returnedState || !state || returnedState !== state) {
    return NextResponse.redirect(new URL('/?auth=invalid-state', request.url));
  }

  const session = await exchangeAuthorizationCode(code);
  await persistSession(session);

  return NextResponse.redirect(new URL(returnTo, request.url));
}
