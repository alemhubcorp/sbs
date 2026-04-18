import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOptionalAccessToken } from '../../../../lib/auth';

const apiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function proxyPlatformRequest(request: NextRequest, path: string[], method: string) {
  const accessToken = await getOptionalAccessToken();
  const targetUrl = new URL(`${apiBaseUrl}/api/platform/${path.join('/')}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  const headers = new Headers();
  const contentType = request.headers.get('content-type');

  if (contentType) {
    headers.set('content-type', contentType);
  }

  headers.set('cache-control', 'no-cache');

  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(targetUrl, {
    method,
    headers,
    cache: 'no-store',
    body: method === 'GET' ? null : await request.text()
  });

  const responseHeaders = new Headers();
  const responseContentType = response.headers.get('content-type');

  if (responseContentType) {
    responseHeaders.set('content-type', responseContentType);
  }

  responseHeaders.set('cache-control', 'no-store');

  return new NextResponse(await response.text(), {
    status: response.status,
    headers: responseHeaders
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyPlatformRequest(request, path, 'GET');
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyPlatformRequest(request, path, 'POST');
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyPlatformRequest(request, path, 'PUT');
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyPlatformRequest(request, path, 'PATCH');
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyPlatformRequest(request, path, 'DELETE');
}
