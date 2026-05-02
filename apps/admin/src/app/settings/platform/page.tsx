import {
  updateAiContentSettingsAction,
  updateBrandingSettingsAction,
  updateContactSettingsAction,
  updateGovernanceSettingsAction,
  updateSocialLinksSettingsAction
} from '../../actions';
import { requireAccessToken } from '../../../lib/auth';

const internalBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

async function fetchJson<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${internalBaseUrl}${path}`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

type SettingRow = { value?: unknown };
const defaultBrandingSetting: SettingRow = {
  value: {
    siteName: 'Alemhub',
    logoAlt: 'Alemhub logo',
    markText: 'AH',
    logoUrl: ''
  }
};

async function fetchJsonOrDefault<T>(path: string, accessToken: string, fallback: T): Promise<T> {
  try {
    return await fetchJson<T>(path, accessToken);
  } catch {
    return fallback;
  }
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

export default async function PlatformSettingsPage() {
  const accessToken = await requireAccessToken('/settings/platform');
  const [governanceSetting, brandingSetting, socialSetting, contactSetting, aiSetting, emailSetting] = await Promise.all([
    fetchJson<SettingRow>('/api/admin/settings/governance:auth', accessToken),
    fetchJsonOrDefault<SettingRow>('/api/admin/settings/public:branding', accessToken, defaultBrandingSetting),
    fetchJson<SettingRow>('/api/admin/settings/public:social-links', accessToken),
    fetchJson<SettingRow>('/api/admin/settings/public:contact-settings', accessToken),
    fetchJson<SettingRow>('/api/admin/settings/ai:content-assistant', accessToken),
    fetchJson<{ email?: { smtpConfigured?: boolean } }>('/api/platform/public-settings', accessToken)
  ]);

  const governance = asRecord(governanceSetting.value);
  const branding = asRecord(brandingSetting.value);
  const socialItems = asArray(asRecord(socialSetting.value).items);
  const addresses = asArray(asRecord(contactSetting.value).addresses);
  const phones = asArray(asRecord(contactSetting.value).phones);
  const ai = asRecord(aiSetting.value);
  const smtpConfigured = Boolean(emailSetting.email?.smtpConfigured);

  return (
    <main style={{ display: 'grid', gap: 24 }}>
      <section style={{ padding: 24, borderRadius: 26, background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(148,163,184,0.18)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: '#0f172a' }}>Platform Governance</h1>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Control public auth behavior, footer links, and company contacts from one admin surface.</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href="/admin/users">Users</a>
            <a href="/admin/settings/legal">Legal</a>
            <a href="/admin/settings/smtp">SMTP</a>
          </div>
        </div>
      </section>

      <section style={{ padding: 24, borderRadius: 26, background: 'rgba(235,255,244,0.92)', border: '1px solid rgba(16,185,129,0.18)' }}>
        <form action={updateGovernanceSettingsAction} style={{ display: 'grid', gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, color: '#064e3b' }}>Email verification</h2>
            <p style={{ margin: '8px 0 0', color: '#065f46' }}>Turn email verification on or off for real registration and login behavior.</p>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#0f172a' }}>
            <input type="checkbox" name="emailVerificationRequired" defaultChecked={Boolean(governance.emailVerificationRequired)} />
            <span>Require email verification before sign-in for newly registered accounts.</span>
          </label>
          {Boolean(governance.emailVerificationRequired) && !smtpConfigured ? (
            <div style={{ padding: 14, borderRadius: 16, background: '#fff7ed', color: '#9a3412', border: '1px solid rgba(251,146,60,0.35)' }}>
              Warning: SMTP is not fully configured. Enabling email verification will block registration until email delivery is completed.
            </div>
          ) : null}
          <div>
            <button type="submit">Save governance</button>
          </div>
        </form>
      </section>

      <section style={{ padding: 24, borderRadius: 26, background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(148,163,184,0.18)' }}>
        <form action={updateBrandingSettingsAction} style={{ display: 'grid', gap: 18 }}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a' }}>Site branding</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Upload the public logo and control the header/footer brand name shown across the marketplace.</p>
          </div>
          {String(branding.logoUrl ?? '').trim() ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, borderRadius: 18, background: '#f8fafc', border: '1px solid rgba(226,232,240,0.9)' }}>
              <img
                src={String(branding.logoUrl)}
                alt={String(branding.logoAlt ?? 'Alemhub logo')}
                style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 12, background: '#fff', border: '1px solid rgba(226,232,240,0.9)', padding: 8 }}
              />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Current logo</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>This image is used in the public header and footer.</div>
              </div>
            </div>
          ) : null}
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <input name="siteName" defaultValue={String(branding.siteName ?? 'Alemhub')} placeholder="site name" />
            <input name="markText" defaultValue={String(branding.markText ?? 'AH')} placeholder="mark text" maxLength={4} />
            <input name="logoAlt" defaultValue={String(branding.logoAlt ?? 'Alemhub logo')} placeholder="logo alt text" />
            <input name="logoUrl" defaultValue={String(branding.logoUrl ?? '')} placeholder="https://... or leave blank when uploading a file" />
          </div>
          <label style={{ display: 'grid', gap: 8, color: '#0f172a' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Upload logo file</span>
            <input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" />
            <span style={{ fontSize: 12, color: '#64748b' }}>Supported: PNG, JPG, WEBP, SVG. Max 1 MB. Uploaded file overrides the URL field.</span>
          </label>
          <div>
            <button type="submit">Save branding</button>
          </div>
        </form>
      </section>

      <section style={{ padding: 24, borderRadius: 26, background: 'rgba(248,250,255,0.96)', border: '1px solid rgba(96,165,250,0.18)' }}>
        <form action={updateAiContentSettingsAction} style={{ display: 'grid', gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a' }}>AI content assistant</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>
              Control supplier-side AI copy generation for descriptions, SEO fields, and translations. Suggestions stay manual until the supplier applies them.
            </p>
          </div>
          <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: '#0f172a' }}>
            <input type="checkbox" name="enabled" defaultChecked={Boolean(ai.enabled)} />
            <span>Enable AI content assistant in supplier product create/edit forms.</span>
          </label>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <input name="provider" defaultValue={String(ai.provider ?? 'openai')} placeholder="provider" />
            <input name="model" defaultValue={String(ai.model ?? 'gpt-5.2')} placeholder="model" />
            <input name="apiBaseUrl" defaultValue={String(ai.apiBaseUrl ?? 'https://api.openai.com/v1/responses')} placeholder="api base url" />
            <input name="apiKey" type="password" defaultValue="" placeholder={ai.apiKey === null ? 'Configured - leave blank to keep current key' : 'Paste API key'} />
          </div>
          <input
            name="translationLanguages"
            defaultValue={Array.isArray(ai.translationLanguages) ? ai.translationLanguages.map((value) => String(value)).join(', ') : 'en, ru, kk, tr, zh-CN'}
            placeholder="en, ru, kk"
          />
          <textarea name="notes" defaultValue={String(ai.notes ?? '')} rows={3} placeholder="Operational notes for the content team." />
          {Boolean(ai.enabled) && !String(ai.apiBaseUrl ?? '').trim() ? (
            <div style={{ padding: 14, borderRadius: 16, background: '#fff7ed', color: '#9a3412', border: '1px solid rgba(251,146,60,0.35)' }}>
              Warning: AI is enabled without an API base URL. Supplier AI buttons will fail until this is configured.
            </div>
          ) : null}
          <div>
            <button type="submit">Save AI settings</button>
          </div>
        </form>
      </section>

      <section style={{ padding: 24, borderRadius: 26, background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(148,163,184,0.18)' }}>
        <form action={updateSocialLinksSettingsAction} style={{ display: 'grid', gap: 18 }}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a' }}>Public social links</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Shown on the public homepage and footer. Leave unused rows blank.</p>
          </div>
          {Array.from({ length: 6 }, (_, index) => {
            const entry = asRecord(socialItems[index]);
            return (
              <div
                key={`social-${index}`}
                style={{
                  display: 'grid',
                  gap: 12,
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  padding: 16,
                  borderRadius: 18,
                  border: '1px solid rgba(226,232,240,0.9)'
                }}
              >
                <input name={`social_id_${index}`} defaultValue={String(entry.id ?? '')} placeholder="id" />
                <input name={`social_name_${index}`} defaultValue={String(entry.name ?? '')} placeholder="name" />
                <input name={`social_url_${index}`} defaultValue={String(entry.url ?? '')} placeholder="https://..." />
                <input name={`social_icon_${index}`} defaultValue={String(entry.icon ?? '')} placeholder="icon text" />
                <input name={`social_logoUrl_${index}`} defaultValue={String(entry.logoUrl ?? '')} placeholder="logo url" />
                <input name={`social_displayOrder_${index}`} type="number" min={1} defaultValue={String(entry.displayOrder ?? index + 1)} placeholder="order" />
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input name={`social_active_${index}`} type="checkbox" defaultChecked={Boolean(entry.active)} />
                  Active
                </label>
              </div>
            );
          })}
          <div>
            <button type="submit">Save social links</button>
          </div>
        </form>
      </section>

      <section style={{ padding: 24, borderRadius: 26, background: 'rgba(255,255,255,0.96)', border: '1px solid rgba(148,163,184,0.18)' }}>
        <form action={updateContactSettingsAction} style={{ display: 'grid', gap: 24 }}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a' }}>Company contacts</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b' }}>Only active entries are shown publicly.</p>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Addresses</h3>
            {Array.from({ length: 4 }, (_, index) => {
              const entry = asRecord(addresses[index]);
              return (
                <div key={`address-${index}`} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <input name={`address_id_${index}`} defaultValue={String(entry.id ?? '')} placeholder="id" />
                  <input name={`address_label_${index}`} defaultValue={String(entry.label ?? '')} placeholder="label" />
                  <input name={`address_value_${index}`} defaultValue={String(entry.value ?? '')} placeholder="address" />
                  <input name={`address_displayOrder_${index}`} type="number" min={1} defaultValue={String(entry.displayOrder ?? index + 1)} placeholder="order" />
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input name={`address_active_${index}`} type="checkbox" defaultChecked={Boolean(entry.active)} />
                    Active
                  </label>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Phones</h3>
            {Array.from({ length: 4 }, (_, index) => {
              const entry = asRecord(phones[index]);
              return (
                <div key={`phone-${index}`} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                  <input name={`phone_id_${index}`} defaultValue={String(entry.id ?? '')} placeholder="id" />
                  <input name={`phone_label_${index}`} defaultValue={String(entry.label ?? '')} placeholder="label" />
                  <input name={`phone_value_${index}`} defaultValue={String(entry.value ?? '')} placeholder="phone" />
                  <input name={`phone_displayOrder_${index}`} type="number" min={1} defaultValue={String(entry.displayOrder ?? index + 1)} placeholder="order" />
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input name={`phone_active_${index}`} type="checkbox" defaultChecked={Boolean(entry.active)} />
                    Active
                  </label>
                </div>
              );
            })}
          </div>
          <div>
            <button type="submit">Save contacts</button>
          </div>
        </form>
      </section>
    </main>
  );
}
