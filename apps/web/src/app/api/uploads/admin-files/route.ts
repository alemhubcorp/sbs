import { randomUUID } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { getOptionalAccessToken } from '../../../../lib/auth';
import { encodeS3Path, ensureBucket, readS3Config, sha256Hex, signedS3Request } from '../../../compliance-documents';

export const runtime = 'nodejs';

const apiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}

function baseUrl(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') ?? 'http';
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3001';
  return process.env.NEXT_PUBLIC_WEB_URL ?? `${protocol}://${host}`;
}

function fileExtension(name: string, contentType: string) {
  const lower = name.toLowerCase();
  const match = lower.match(/\.([a-z0-9]+)$/);
  if (match?.[1]) return match[1];
  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.includes('csv')) return 'csv';
  if (contentType.includes('json')) return 'json';
  if (contentType.includes('word')) return 'docx';
  if (contentType.includes('excel') || contentType.includes('spreadsheet')) return 'xlsx';
  return 'bin';
}

function webpFileName(name: string) {
  const withoutExtension = name.replace(/\.[a-z0-9]+$/i, '').trim();
  return `${withoutExtension || 'uploaded-image'}.webp`;
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

  if (!(identityPayload.roles ?? []).includes('platform_admin')) {
    return NextResponse.json({ success: false, error: 'Platform admin access required.' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ success: false, error: 'A file is required.' }, { status: 400 });
  }

  const originalContentType = file.type || 'application/octet-stream';
  const sourceBuffer = Buffer.from(await file.arrayBuffer());
  const config = readS3Config();
  const isImage = originalContentType.startsWith('image/');

  let buffer = sourceBuffer;
  let contentType = originalContentType;
  let storedName = file.name;
  let storageKey: string;

  if (isImage) {
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
    contentType = 'image/webp';
    storedName = webpFileName(file.name);
    storageKey = `uploads/images/${Date.now()}-${randomUUID()}.webp`;
  } else {
    const extension = fileExtension(file.name, originalContentType);
    storageKey = `uploads/documents/${Date.now()}-${randomUUID()}.${extension}`;
  }

  const checksum = sha256Hex(buffer);

  await ensureBucket(config);
  await signedS3Request(config, 'PUT', `${config.bucket}/${encodeS3Path(storageKey)}`, buffer, contentType, checksum);

  const publicUrl = isImage
    ? `${baseUrl(request)}/product-media/${storageKey.split('/').map((segment) => encodeURIComponent(segment)).join('/')}`
    : `${baseUrl(request)}/api/documents`;

  const documentResponse = await fetch(`${apiBaseUrl}/api/documents`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      documentType: isImage ? 'attachment' : 'other',
      name: storedName,
      contentType,
      storageBucket: config.bucket,
      storageKey,
      sizeBytes: buffer.byteLength,
      checksum,
      metadata: {
        fileGroup: isImage ? 'image' : 'document',
        source: 'admin-upload',
        originalName: file.name,
        originalContentType,
        publicUrl: isImage ? publicUrl : null
      }
    }),
    cache: 'no-store'
  });

  const text = await documentResponse.text();
  return new NextResponse(text, {
    status: documentResponse.status,
    headers: {
      'content-type': documentResponse.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store'
    }
  });
}
