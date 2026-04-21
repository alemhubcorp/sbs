import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

function getWebAppUrl(request: NextRequest) {
  return (process.env.WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? process.env.APP_URL ?? request.nextUrl.origin).replace(/\/$/, '');
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/admin/compliance' || request.nextUrl.pathname === '/compliance') {
    return NextResponse.redirect(new URL('/compliance', getWebAppUrl(request)));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/compliance', '/compliance']
};
