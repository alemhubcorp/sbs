import { NextResponse } from 'next/server';
import { buildLogoutUrl, clearSession, getOptionalSession } from '../../lib/auth';

export async function GET(request: Request) {
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
