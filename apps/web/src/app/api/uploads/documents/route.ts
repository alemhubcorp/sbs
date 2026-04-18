import { createHash, randomUUID } from 'node:crypto';
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

  if (contentType.includes('pdf')) return 'pdf';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('jpg')) return 'jpg';
  return 'bin';
}

export async function POST(request: NextRequest) {
  const accessToken = await getOptionalAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const requirementCode = String(formData.get('requirementCode') ?? '').trim();
  const scope = String(formData.get('scope') ?? '').trim();
  const profileId = String(formData.get('profileId') ?? '').trim();
  const documentType = String(formData.get('documentType') ?? 'compliance').trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'A file is required.' }, { status: 400 });
  }

  if (!requirementCode || !scope || !profileId) {
    return NextResponse.json({ success: false, error: 'Missing onboarding metadata.' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || 'application/octet-stream';
  const config = readS3Config();
  const extension = fileExtension(file.name, contentType);
  const storageKey = `compliance/${scope}/${profileId}/${requirementCode}/${Date.now()}-${randomUUID()}.${extension}`;
  const checksum = sha256Hex(buffer);

  await ensureBucket(config);
  await signedS3Request(config, 'PUT', `${config.bucket}/${encodeS3Path(storageKey)}`, buffer, contentType, checksum);

  const response = await fetch(`${apiBaseUrl}/api/compliance/documents`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      documentType,
      name: file.name,
      contentType,
      storageBucket: config.bucket,
      storageKey,
      sizeBytes: buffer.byteLength,
      checksum,
      requirementCode,
      metadata: {
        originalName: file.name,
        scope,
        profileId
      }
    }),
    cache: 'no-store'
  });

  const text = await response.text();
  const headers = new Headers();
  headers.set('cache-control', 'no-store');
  headers.set('content-type', response.headers.get('content-type') ?? 'application/json');

  return new NextResponse(text, {
    status: response.status,
    headers
  });
}
