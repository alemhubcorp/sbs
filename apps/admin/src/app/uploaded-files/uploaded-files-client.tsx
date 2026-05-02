'use client';

type UploadedFile = {
  id: string;
  name: string;
  contentType?: string | null;
  storageBucket?: string | null;
  storageKey?: string | null;
  sizeBytes?: number | null;
  checksum?: string | null;
  createdAt?: string | null;
  uploadedByUser?: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  url: string;
  group: 'image' | 'document';
};

function formatSize(size?: number | null) {
  if (typeof size !== 'number') return 'Unknown';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value?: string | null) {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function uploader(file: UploadedFile) {
  const user = file.uploadedByUser;
  if (!user) return 'System';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email || 'User';
}

export function UploadedFilesGrid({
  title,
  files,
  onDeleteAction
}: {
  title: string;
  files: UploadedFile[];
  onDeleteAction: (formData: FormData) => void | Promise<void>;
}) {
  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
  }

  return (
    <section className="uf-panel">
      <div className="uf-panel-head">
        <div>
          <h2>{title}</h2>
          <p>{files.length} files</p>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="uf-empty">No files match the current filters.</div>
      ) : (
        <div className="uf-grid">
          {files.map((file) => (
            <article key={file.id} className="uf-card">
              <div className="uf-preview">
                {file.group === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.url} alt={file.name} />
                ) : (
                  <span className="uf-doc-icon">📄</span>
                )}
              </div>
              <div className="uf-card-body">
                <h3 title={file.name}>{file.name}</h3>
                <p>{file.contentType ?? 'application/octet-stream'}</p>
                <p>{formatSize(file.sizeBytes)} · {formatDate(file.createdAt)}</p>
              </div>
              <details className="uf-info">
                <summary>File info</summary>
                <dl>
                  <dt>Uploaded by</dt>
                  <dd>{uploader(file)}</dd>
                  <dt>Bucket</dt>
                  <dd>{file.storageBucket ?? 'None'}</dd>
                  <dt>Storage key</dt>
                  <dd>{file.storageKey ?? 'None'}</dd>
                  <dt>Checksum</dt>
                  <dd>{file.checksum ?? 'None'}</dd>
                </dl>
              </details>
              <div className="uf-actions">
                <a href={file.url} target="_blank" rel="noreferrer" download>
                  Download
                </a>
                <button type="button" onClick={() => void copyUrl(file.url)}>
                  Copy URL
                </button>
                <form action={onDeleteAction}>
                  <input type="hidden" name="documentId" value={file.id} />
                  <button type="submit" className="danger">Delete</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

