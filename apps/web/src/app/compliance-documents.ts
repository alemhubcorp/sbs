import { randomUUID, createHmac, createHash } from 'node:crypto';

type S3Config = {
  endpoint: string;
  port: number;
  rootUser: string;
  rootPassword: string;
  bucket: string;
  region: string;
};

type StoreDocumentInput = {
  apiBaseUrl: string;
  accessToken: string;
  documentType: 'commercial' | 'compliance' | 'other';
  documentName: string;
  storageKey: string;
  contentType: string;
  pdf: Buffer;
  metadata: Record<string, unknown>;
  dealId?: string | null;
  contractId?: string | null;
};

export function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildPdf(lines: string[]) {
  const content = [
    'BT',
    '/F1 12 Tf',
    '72 760 Td',
    ...lines.map((line, index) => {
      const safe = escapePdfText(line);
      return index === 0 ? `(${safe}) Tj` : `T* (${safe}) Tj`;
    }),
    'ET'
  ].join('\n');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
    `5 0 obj << /Length ${Buffer.byteLength(content, 'utf8')} >> stream\n${content}\nendstream\nendobj\n`
  ];

  const header = '%PDF-1.4\n';
  let body = '';
  const offsets = ['0000000000 65535 f \n'];
  let position = Buffer.byteLength(header, 'utf8');

  for (const object of objects) {
    offsets.push(`${String(position).padStart(10, '0')} 00000 n \n`);
    body += object;
    position += Buffer.byteLength(object, 'utf8');
  }

  const xrefOffset = Buffer.byteLength(header + body, 'utf8');
  const xref = `xref\n0 ${objects.length + 1}\n${offsets.join('')}trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(header + body + xref, 'utf8');
}

export async function storeComplianceDocument(input: StoreDocumentInput) {
  const config = readS3Config();
  const payloadHash = sha256Hex(input.pdf);
  const key = input.storageKey.replace(/^\/+/, '');

  await ensureBucket(config);
  await signedS3Request(config, 'PUT', `${config.bucket}/${encodeS3Path(key)}`, input.pdf, input.contentType, payloadHash);

  const existing = await findExistingDocument(input.apiBaseUrl, input.accessToken, key);
  if (existing) {
    return existing;
  }

  const created = await createDocumentRecord(input, config.bucket, key);

  if (input.dealId || input.contractId) {
    await fetch(`${input.apiBaseUrl}/api/documents/${created.id}/links`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${input.accessToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        ...(input.dealId ? { dealId: input.dealId, linkType: 'deal_attachment' } : {}),
        ...(input.contractId ? { contractId: input.contractId, linkType: 'contract_attachment' } : {})
      }),
      cache: 'no-store'
    });
  }

  return created;
}

export function readS3Config(): S3Config {
  return {
    endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
    port: Number(process.env.MINIO_PORT ?? 9000),
    rootUser: process.env.MINIO_ROOT_USER ?? 'minio',
    rootPassword: process.env.MINIO_ROOT_PASSWORD ?? 'change-me',
    bucket: process.env.MINIO_BUCKET_DOCUMENTS ?? 'documents',
    region: process.env.MINIO_REGION ?? 'us-east-1'
  };
}

export async function ensureBucket(config: S3Config) {
  await signedS3Request(config, 'PUT', config.bucket, null, 'application/octet-stream', sha256Hex(''));
}

export async function signedS3Request(
  config: S3Config,
  method: 'PUT' | 'GET' | 'HEAD',
  path: string,
  body: Buffer | null,
  contentType: string,
  payloadHashOverride?: string
) {
  const host = `${config.endpoint}:${config.port}`;
  const amzDate = toAmzDate(new Date());
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = payloadHashOverride ?? sha256Hex(body ?? Buffer.from(''));
  const canonicalUri = `/${path}`;
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    method,
    canonicalUri,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join('\n');
  const signingKey = getSignatureKey(config.rootPassword, dateStamp, config.region, 's3');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
  const authorization = `${algorithm} Credential=${config.rootUser}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`http://${host}/${path}`, {
    method,
    headers: {
      authorization,
      host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      ...(method !== 'HEAD' ? { 'content-type': contentType } : {})
    },
    body: method === 'GET' || method === 'HEAD' ? null : body ? new Uint8Array(body) : null,
    cache: 'no-store'
  });

  if (!response.ok && response.status !== 409) {
    throw new Error(`MinIO request failed with status ${response.status}`);
  }
}

export function encodeS3Path(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function sha256Hex(value: Buffer | string) {
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

async function findExistingDocument(apiBaseUrl: string, accessToken: string, storageKey: string) {
  const response = await fetch(`${apiBaseUrl}/api/documents`, {
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { items?: Array<{ id: string; storageKey?: string | null }> };
  return payload.items?.find((item) => item.storageKey === storageKey) ?? null;
}

async function createDocumentRecord(input: StoreDocumentInput, bucket: string, key: string) {
  const response = await fetch(`${input.apiBaseUrl}/api/documents`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      documentType: input.documentType,
      name: input.documentName,
      contentType: input.contentType,
      storageBucket: bucket,
      storageKey: key,
      sizeBytes: input.pdf.byteLength,
      checksum: sha256Hex(input.pdf),
      metadata: {
        ...input.metadata,
        storageKey: key,
        bucket
      }
    }),
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Unable to register document (${response.status}).`);
  }

  return response.json() as Promise<{ id: string; storageBucket?: string | null; storageKey?: string | null }>;
}
