import { NextResponse } from 'next/server';
import { adminCookieNames, buildLogoutUrl, getOptionalSession } from '../../../lib/auth';

export async function GET(request: Request) {
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
