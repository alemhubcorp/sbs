import { NextResponse } from 'next/server';
import { adminCookieNames, buildLogoutUrl, getOptionalSession } from '../../../lib/auth';

export async function GET(request: Request) {
  const requestHost = request.headers.get('host');
  const appUrl =
    requestHost?.match(/^(localhost|127\.0\.0\.1|::1)(:\d+)?$/i)
      ? `http://${requestHost}`
      : process.env.ADMIN_URL ?? process.env.NEXT_PUBLIC_ADMIN_URL ?? process.env.APP_URL ?? 'http://localhost:3002';

  return NextResponse.redirect(new URL('/admin', appUrl));
}

export async function POST(request: Request) {
  const session = await getOptionalSession();
  const requestHost = request.headers.get('host');
  const logoutUrl = buildLogoutUrl(session?.idToken, requestHost);
  const response = NextResponse.redirect(logoutUrl, {
    headers: {
      Location: logoutUrl
    }
  });

  for (const name of Object.values(adminCookieNames)) {
    response.cookies.delete(name);
  }

  return response;
}
