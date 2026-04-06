import { NextResponse } from 'next/server';
import { buildLogoutUrl, clearSession, getOptionalSession } from '../../../lib/auth';

export async function GET(request: Request) {
  const session = await getOptionalSession();
  await clearSession();

  return NextResponse.redirect(buildLogoutUrl(session?.idToken), {
    headers: {
      Location: buildLogoutUrl(session?.idToken)
    }
  });
}
