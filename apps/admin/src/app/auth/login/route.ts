import { NextRequest, NextResponse } from 'next/server';
import { adminCookieNames, buildAdminLoginRequest, getAdminCookieOptions } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/';
  const requestHost = request.headers.get('host');
  const loginRequest = buildAdminLoginRequest(returnTo, requestHost);
  const response = NextResponse.redirect(loginRequest.authUrl);
  const cookieOptions = getAdminCookieOptions(requestHost);

  response.cookies.set(adminCookieNames.state, loginRequest.state, cookieOptions);
  response.cookies.set(adminCookieNames.returnTo, loginRequest.returnTo, cookieOptions);

  return response;
}
