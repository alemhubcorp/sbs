import { createHmac, createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getOptionalAccessToken } from '../../../../../lib/auth';
import { readS3Config } from '../../../../compliance-documents';

export const runtime = 'nodejs';

const apiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

function sha256Hex(value: Buffer | string) {
  return createHash('sha256').update(value).digest('hex');
}

function getSignatureKey(secret: string, dateStamp: string, region: string, service: string) {
  const kDate = createHmac('sha256', `AWS4${secret}`).update(dateStamp).digest();
  const kRegion = createHmac('sha256', kDate).update(region).digest();
  const kService = createHmac('sha256', kRegion).update(service).digest();
  return createHmac('sha256', kService).update('aws4_request').digest();
}

function toAmzDate(date: Date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

async function fetchSignedObject(bucket: string, key: string, contentType: string) {
  const config = readS3Config();
  const host = `${config.endpoint}:${config.port}`;
  const amzDate = toAmzDate(new Date());
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex('');
  const canonicalUri = `/${bucket}/${key}`;
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['GET', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [algorithm, amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const signingKey = getSignatureKey(config.rootPassword, dateStamp, config.region, 's3');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  const authorization = `${algorithm} Credential=${config.rootUser}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(`http://${host}/${bucket}/${key}`, {
    method: 'GET',
    headers: {
      authorization,
      host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'content-type': contentType
    },
    cache: 'no-store'
  });
}

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const accessToken = await getOptionalAccessToken();
  if (!accessToken) {
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }

  const { id } = await context.params;
  const response = await fetch(`${apiBaseUrl}/api/documents/${id}`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    return new NextResponse(await response.text(), { status: response.status });
  }

  const document = (await response.json()) as {
    name?: string | null;
    contentType?: string | null;
    storageBucket?: string | null;
    storageKey?: string | null;
  };

  if (!document.storageBucket || !document.storageKey) {
    return NextResponse.json({ success: false, error: 'Document storage is not available.' }, { status: 404 });
  }

  const objectResponse = await fetchSignedObject(document.storageBucket, document.storageKey, document.contentType ?? 'application/octet-stream');
  if (!objectResponse.ok || !objectResponse.body) {
    return NextResponse.json({ success: false, error: 'Unable to load document content.' }, { status: 502 });
  }

  const headers = new Headers();
  headers.set('content-type', document.contentType ?? objectResponse.headers.get('content-type') ?? 'application/octet-stream');
  headers.set('content-disposition', `attachment; filename="${(document.name ?? 'document').replace(/"/g, '')}"`);
  headers.set('cache-control', 'no-store');

  return new NextResponse(objectResponse.body, {
    status: 200,
    headers
  });
}
