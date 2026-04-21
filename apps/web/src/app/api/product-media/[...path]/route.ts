import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { readS3Config, signedS3Fetch } from '../../../compliance-documents';

export const runtime = 'nodejs';

function guessContentType(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'application/octet-stream';
}

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const storageKey = path.join('/');
  const config = readS3Config();
  const response = await signedS3Fetch(
    config,
    'GET',
    `${config.bucket}/${storageKey}`,
    null,
    guessContentType(storageKey)
  );

  if (!response.ok) {
    return NextResponse.json({ error: 'Media not found.' }, { status: response.status });
  }

  const headers = new Headers();
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('content-type', response.headers.get('content-type') ?? guessContentType(storageKey));

  return new NextResponse(response.body, {
    status: 200,
    headers
  });
}
