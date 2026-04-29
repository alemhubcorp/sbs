import { NextResponse } from 'next/server';
import { buildLogoutUrl, clearSession, getOptionalSession } from '../../lib/auth';

export async function GET(request: Request) {
  const requestHost = request.headers.get('host');
  const fallbackUrl = new URL('/', requestHost?.match(/^(localhost|127\.0\.0\.1|::1)(:\d+)?$/i) ? `http://${requestHost}` : process.env.WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? process.env.APP_URL ?? 'http://localhost:3001');
  return NextResponse.redirect(fallbackUrl);
}

export async function POST(request: Request) {
  const session = await getOptionalSession();
  await clearSession();
  const requestHost = request.headers.get('host');
  const logoutUrl = buildLogoutUrl(session?.idToken, requestHost);

  return NextResponse.redirect(logoutUrl, {
    headers: {
      Location: logoutUrl
    }
  });
}
