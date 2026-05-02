import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getOptionalAccessToken } from '../../../../lib/auth';
import { encodeS3Path, ensureBucket, readS3Config, sha256Hex, signedS3Request } from '../../../compliance-documents';

export const runtime = 'nodejs';

const apiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

function baseUrl(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') ?? 'http';
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3001';
  return process.env.NEXT_PUBLIC_WEB_URL ?? `${protocol}://${host}`;
}

function webpFileName(name: string) {
  const withoutExtension = name.replace(/\.[a-z0-9]+$/i, '').trim();
  return `${withoutExtension || 'product-image'}.webp`;
}

async function createUploadRecord(accessToken: string, input: Record<string, unknown>) {
  try {
    await fetch(`${apiBaseUrl}/api/documents/uploaded-files`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(input),
      cache: 'no-store'
    });
  } catch {
    // Upload success must not depend on the admin index record.
  }
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

  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  let buffer: Buffer;
  try {
    buffer = Buffer.from(
      await sharp(sourceBuffer)
        .rotate()
        .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 84 })
        .toBuffer()
    );
  } catch {
    return NextResponse.json({ success: false, error: 'Image could not be converted to WebP.' }, { status: 400 });
  }

  const config = readS3Config();
  const storageKey = `products/${productId}/${Date.now()}-${randomUUID()}.webp`;
  const checksum = sha256Hex(buffer);

  await ensureBucket(config);
  await signedS3Request(config, 'PUT', `${config.bucket}/${encodeS3Path(storageKey)}`, buffer, 'image/webp', checksum);

  const publicUrl = `${baseUrl(request)}/product-media/${storageKey.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`;

  await createUploadRecord(accessToken, {
    documentType: 'attachment',
    name: webpFileName(file.name),
    contentType: 'image/webp',
    storageBucket: config.bucket,
    storageKey,
    sizeBytes: buffer.byteLength,
    checksum,
    metadata: {
      fileGroup: 'image',
      source: 'product-image-upload',
      originalName: file.name,
      originalContentType: file.type || null,
      productId,
      publicUrl
    }
  });

  return NextResponse.json({
    success: true,
    storageKey,
    publicUrl
  });
}
