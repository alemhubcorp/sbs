import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function normalizeReturnTo(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/auth') || value.startsWith('/become-')) {
    return '/dashboard';
  }

  return value;
}

export async function GET(request: NextRequest) {
  const returnTo = normalizeReturnTo(request.nextUrl.searchParams.get('returnTo'));
  const url = new URL('/register', request.url);
  if (returnTo !== '/dashboard') {
    url.searchParams.set('returnTo', returnTo);
  }

  return NextResponse.redirect(url);
}
