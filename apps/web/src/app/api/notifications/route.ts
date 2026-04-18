import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOptionalAccessToken } from '../../../lib/auth';

const apiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const accessToken = await getOptionalAccessToken();
  const targetUrl = new URL(`${apiBaseUrl}/api/notifications`);

  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  const headers = new Headers({ 'cache-control': 'no-cache' });

  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers,
    cache: 'no-store'
  });

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store'
    }
  });
}
