import { updateLegalDocumentsAction } from '../../actions';
import { requireAccessToken } from '../../../lib/auth';

const internalBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function fetchJsonOrDefault<T>(path: string, accessToken: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${internalBaseUrl}${path}`, {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      return fallback;
    }

    return response.json() as Promise<T>;
  } catch {
    return fallback;
  }
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export default async function LegalSettingsPage() {
  const accessToken = await requireAccessToken('/settings/legal');
  const setting = await fetchJsonOrDefault<{ value?: unknown }>('/api/admin/settings/legal:documents', accessToken, { value: { documents: [] } });
  const documents = Array.isArray(asRecord(setting.value).documents) ? (asRecord(setting.value).documents as unknown[]) : [];
  const bySlug = new Map(documents.map((entry) => [String(asRecord(entry).slug ?? ''), asRecord(entry)]));
  const slugs = ['terms', 'returns', 'support-policy', 'privacy', 'seller-policy'];

  return (
    <main style={{ display: 'grid', gap: 24 }}>
      <section style={{ padding: 24, borderRadius: 26, background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(148,163,184,0.18)' }}>
        <h1 style={{ margin: 0, fontSize: 28, color: '#0f172a' }}>Legal documents</h1>
        <p style={{ margin: '8px 0 0', color: '#64748b' }}>Edit the public legal pages and footer links without shipping frontend text changes.</p>
      </section>

      <form action={updateLegalDocumentsAction} style={{ display: 'grid', gap: 20 }}>
        {slugs.map((slug) => {
          const document = bySlug.get(slug) ?? {};
          return (
            <section
              key={slug}
              style={{ display: 'grid', gap: 14, padding: 24, borderRadius: 26, background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(148,163,184,0.18)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 20, color: '#0f172a' }}>{String(document.title ?? slug)}</strong>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" name={`${slug}_active`} defaultChecked={Boolean(document.active ?? true)} />
                    Active
                  </label>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" name={`${slug}_showInFooter`} defaultChecked={Boolean(document.showInFooter ?? true)} />
                    Show in footer
                  </label>
                </div>
              </div>
              <input name={`${slug}_title`} defaultValue={String(document.title ?? '')} placeholder="Title" />
              <input name={`${slug}_footerLabel`} defaultValue={String(document.footerLabel ?? '')} placeholder="Footer label" />
              <input name={`${slug}_version`} defaultValue={String(document.version ?? '')} placeholder="Version" />
              <textarea name={`${slug}_summary`} defaultValue={String(document.summary ?? '')} placeholder="Summary" rows={3} />
              <textarea name={`${slug}_content`} defaultValue={String(document.content ?? '')} placeholder="Document body" rows={8} />
            </section>
          );
        })}
        <div>
          <button type="submit">Save legal documents</button>
        </div>
      </form>
    </main>
  );
}
