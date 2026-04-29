import { NextResponse } from 'next/server';
import { buildLogoutUrl, clearSession, getOptionalSession } from '../../lib/auth';

function getSafeFallbackUrl(request: Request) {
  const requestHost = request.headers.get('host');
  return new URL(
    '/',
    requestHost?.match(/^(localhost|127\.0\.0\.1|::1)(:\d+)?$/i)
      ? `http://${requestHost}`
      : process.env.WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? process.env.APP_URL ?? 'http://localhost:3001'
  );
}

export async function GET(request: Request) {
  return NextResponse.redirect(getSafeFallbackUrl(request));
}

export async function POST(request: Request) {
  const session = await getOptionalSession();
  await clearSession();

  // If we have an idToken, redirect through Keycloak's logout endpoint so it
  // can clear the SSO session without showing the confirmation screen.
  // Without id_token_hint Keycloak always prompts "Do you want to log out?".
  // When the token is absent (e.g. password-grant login or cookie expired),
  // skip the Keycloak round-trip — cookies are already cleared above.
  if (session?.idToken) {
    const requestHost = request.headers.get('host');
    const logoutUrl = buildLogoutUrl(session.idToken, requestHost);
    return NextResponse.redirect(logoutUrl, { headers: { Location: logoutUrl } });
  }

  return NextResponse.redirect(getSafeFallbackUrl(request));
}
