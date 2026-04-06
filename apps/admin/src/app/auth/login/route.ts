import { NextRequest } from 'next/server';
import { createLoginRedirect } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo') ?? '/';
  await createLoginRedirect(returnTo);
}
