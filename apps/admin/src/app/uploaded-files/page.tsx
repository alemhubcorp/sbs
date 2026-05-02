import { deleteUploadedFileAction, uploadAdminFileAction } from '../actions';
import { requireAccessToken } from '../../lib/auth';
import { UploadedFilesGrid } from './uploaded-files-client';

export const dynamic = 'force-dynamic';

const internalBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const webBaseUrl =
  process.env.NEXT_PUBLIC_WEB_URL ?? 'https://alemhub.sbs';

type UploadedFileRecord = {
  id: string;
  name: string;
  contentType?: string | null;
  storageBucket?: string | null;
  storageKey?: string | null;
  sizeBytes?: number | null;
  checksum?: string | null;
  metadata?: unknown;
  createdAt?: string | null;
  uploadedByUser?: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

type UploadedFileView = UploadedFileRecord & {
  url: string;
  group: 'image' | 'document';
};

function metadataValue(record: UploadedFileRecord, key: string) {
  if (!record.metadata || typeof record.metadata !== 'object' || Array.isArray(record.metadata)) {
    return null;
  }
  const value = (record.metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function isImage(record: UploadedFileRecord) {
  return (
    metadataValue(record, 'fileGroup') === 'image' ||
    Boolean(record.contentType?.startsWith('image/')) ||
    Boolean(record.storageKey?.toLowerCase().match(/\.(webp|png|jpe?g|gif|svg)$/))
  );
}

function fileUrl(record: UploadedFileRecord) {
  const publicUrl = metadataValue(record, 'publicUrl');
  if (publicUrl) return publicUrl;

  if (isImage(record) && record.storageKey) {
    const path = record.storageKey.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    return `${webBaseUrl}/product-media/${path}`;
  }

  return `${webBaseUrl}/api/documents/${encodeURIComponent(record.id)}/download`;
}

function toView(record: UploadedFileRecord): UploadedFileView {
  return {
    ...record,
    group: isImage(record) ? 'image' : 'document',
    url: fileUrl(record)
  };
}

function matchesSearch(file: UploadedFileView, query: string) {
  if (!query) return true;
  const haystack = [
    file.name,
    file.contentType,
    file.storageKey,
    file.storageBucket,
    file.uploadedByUser?.email
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function sortFiles(files: UploadedFileView[], sort: string) {
  return [...files].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'size') return (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0);
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });
}

export default async function UploadedFilesPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const accessToken = await requireAccessToken('/uploaded-files');
  const params = (await searchParams) ?? {};
  const type = typeof params.type === 'string' ? params.type : 'all';
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const sort = typeof params.sort === 'string' ? params.sort : 'newest';
  const success = typeof params.success === 'string' ? params.success.replace(/\+/g, ' ') : '';
  const error = typeof params.error === 'string' ? decodeURIComponent(params.error.replace(/\+/g, ' ')) : '';

  let files: UploadedFileView[] = [];
  let loadError: string | null = null;

  try {
    const response = await fetch(`${internalBaseUrl}/api/documents`, {
      headers: {
        authorization: `Bearer ${accessToken}`
      },
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    files = ((await response.json()) as UploadedFileRecord[]).map(toView);
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'Failed to load uploaded files.';
  }

  const filtered = sortFiles(
    files.filter((file) => {
      const typeMatches = type === 'all' || file.group === type;
      return typeMatches && matchesSearch(file, q);
    }),
    sort
  );
  const images = filtered.filter((file) => file.group === 'image');
  const documents = filtered.filter((file) => file.group === 'document');

  return (
    <section className="uf-page">
      <style>{`
        .uf-page { padding: 24px; display: grid; gap: 20px; }
        .uf-hero { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
        .uf-hero h1 { margin: 0; color: #0f172a; font-size: 28px; letter-spacing: -0.04em; }
        .uf-hero p { margin: 6px 0 0; color: #64748b; line-height: 1.6; }
        .uf-upload, .uf-filters, .uf-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 14px 40px rgba(15,23,42,.06); }
        .uf-upload { padding: 16px; min-width: min(100%, 360px); }
        .uf-upload label { display: grid; gap: 8px; color: #0f172a; font-weight: 700; }
        .uf-upload input[type=file] { border: 1px dashed #94a3b8; border-radius: 12px; padding: 14px; background: #f8fafc; }
        .uf-upload button, .uf-filters button, .uf-actions a, .uf-actions button { border: 0; border-radius: 10px; padding: 10px 13px; background: #0f2a55; color: #fff; font-weight: 800; text-decoration: none; cursor: pointer; }
        .uf-filters { padding: 14px; display: grid; grid-template-columns: 1fr 150px 150px auto; gap: 10px; }
        .uf-filters input, .uf-filters select { width: 100%; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; color: #0f172a; background: #fff; }
        .uf-alert { padding: 12px 14px; border-radius: 12px; font-weight: 700; }
        .uf-alert.ok { color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; }
        .uf-alert.err { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; }
        .uf-panel { padding: 18px; display: grid; gap: 14px; }
        .uf-panel-head { display: flex; justify-content: space-between; align-items: center; }
        .uf-panel h2 { margin: 0; color: #0f172a; font-size: 18px; }
        .uf-panel p { margin: 4px 0 0; color: #64748b; }
        .uf-empty { padding: 24px; border: 1px dashed #cbd5e1; border-radius: 14px; color: #64748b; background: #f8fafc; }
        .uf-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
        .uf-card { border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; background: #fff; display: grid; }
        .uf-preview { height: 150px; background: #f1f5f9; display: grid; place-items: center; }
        .uf-preview img { width: 100%; height: 100%; object-fit: cover; }
        .uf-doc-icon { font-size: 44px; filter: grayscale(1); opacity: .75; }
        .uf-card-body { padding: 12px; display: grid; gap: 4px; }
        .uf-card-body h3 { margin: 0; color: #0f172a; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .uf-card-body p { margin: 0; color: #64748b; font-size: 12px; }
        .uf-info { padding: 0 12px 12px; color: #334155; font-size: 12px; }
        .uf-info summary { cursor: pointer; font-weight: 800; color: #0f2a55; }
        .uf-info dl { display: grid; gap: 4px; margin: 10px 0 0; }
        .uf-info dt { color: #64748b; font-weight: 800; }
        .uf-info dd { margin: 0; overflow-wrap: anywhere; }
        .uf-actions { padding: 12px; border-top: 1px solid #e2e8f0; display: flex; gap: 8px; flex-wrap: wrap; }
        .uf-actions a, .uf-actions button { font-size: 12px; padding: 8px 10px; }
        .uf-actions button.danger { background: #b91c1c; }
        @media (max-width: 760px) {
          .uf-page { padding: 16px; }
          .uf-filters { grid-template-columns: 1fr; }
          .uf-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .uf-preview { height: 112px; }
          .uf-actions { display: grid; }
        }
      `}</style>

      <header className="uf-hero">
        <div>
          <h1>Uploaded Files</h1>
          <p>All platform uploads in one place: images are normalized to WebP, documents remain in their original format.</p>
        </div>
        <form action={uploadAdminFileAction} className="uf-upload">
          <label>
            Upload new file
            <input type="file" name="file" required />
          </label>
          <button type="submit" style={{ marginTop: 12 }}>Upload</button>
        </form>
      </header>

      {success ? <div className="uf-alert ok">{success}</div> : null}
      {error || loadError ? <div className="uf-alert err">{error || loadError}</div> : null}

      <form className="uf-filters">
        <input name="q" defaultValue={q} placeholder="Search by name, type, user, storage key..." />
        <select name="type" defaultValue={type}>
          <option value="all">All files</option>
          <option value="image">Images</option>
          <option value="document">Documents</option>
        </select>
        <select name="sort" defaultValue={sort}>
          <option value="newest">Newest first</option>
          <option value="name">Name</option>
          <option value="size">Largest first</option>
        </select>
        <button type="submit">Filter</button>
      </form>

      <UploadedFilesGrid title="Images" files={images} onDeleteAction={deleteUploadedFileAction} />
      <UploadedFilesGrid title="Documents" files={documents} onDeleteAction={deleteUploadedFileAction} />
    </section>
  );
}

