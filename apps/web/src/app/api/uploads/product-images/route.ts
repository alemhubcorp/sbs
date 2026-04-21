import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOptionalAccessToken } from '../../../../lib/auth';
import { encodeS3Path, ensureBucket, readS3Config, sha256Hex, signedS3Request } from '../../../compliance-documents';

export const runtime = 'nodejs';

const apiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

function fileExtension(name: string, contentType: string) {
  const lower = name.toLowerCase();
  const match = lower.match(/\.([a-z0-9]+)$/);
  if (match?.[1]) {
    return match[1];
  }

  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  return 'bin';
}

function baseUrl(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') ?? 'http';
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3001';
  return process.env.NEXT_PUBLIC_WEB_URL ?? `${protocol}://${host}`;
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

export async function POST(request: NextRequest) {
  const accessToken = (await getOptionalAccessToken()) ?? bearerToken(request);
  if (!accessToken) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  const identityResponse = await fetch(`${apiBaseUrl}/api/identity/context`, {
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });
  const identityPayload = identityResponse.ok
    ? ((await identityResponse.json()) as { roles?: string[] })
    : { roles: [] as string[] };
  const roles = identityPayload.roles ?? [];

  if (!roles.includes('supplier_user') && !roles.includes('platform_admin')) {
    return NextResponse.json({ success: false, error: 'Supplier access required.' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const productId = String(formData.get('productId') ?? 'draft').trim() || 'draft';

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'A file is required.' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ success: false, error: 'Only image uploads are supported.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const config = readS3Config();
  const extension = fileExtension(file.name, file.type || 'application/octet-stream');
  const storageKey = `products/${productId}/${Date.now()}-${randomUUID()}.${extension}`;
  const checksum = sha256Hex(buffer);

  await ensureBucket(config);
  await signedS3Request(config, 'PUT', `${config.bucket}/${encodeS3Path(storageKey)}`, buffer, file.type || 'application/octet-stream', checksum);

  const publicUrl = `${baseUrl(request)}/product-media/${storageKey.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`;

  return NextResponse.json({
    success: true,
    storageKey,
    publicUrl
  });
}
