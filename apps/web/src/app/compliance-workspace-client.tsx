'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MarketplaceRole } from '../lib/marketplace-viewer';
import styles from './core-flow.module.css';

type ComplianceScope = 'buyer_b2b' | 'supplier' | 'logistics' | 'customs';

type Requirement = {
  id: string;
  code: string;
  name: string;
  appliesTo: ComplianceScope[];
  required: boolean;
  allowedFileTypes: string[];
  helpText: string;
  active: boolean;
};

type Document = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown> | null;
};

type ComplianceState = {
  scope: ComplianceScope;
  profile: Record<string, unknown> & {
    id: string;
    userId?: string | null;
    displayName?: string | null;
    buyerType?: string | null;
    supplierType?: string | null;
    b2bStatus?: string | null;
    onboardingStatus?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    contactPerson?: string | null;
    companyName?: string | null;
    legalName?: string | null;
    companyAddress?: string | null;
    personalAddress?: string | null;
    socialLinks?: unknown;
    notes?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  requirements: Requirement[];
  documents: Document[];
  missingRequirements: Requirement[];
  pendingApproval?: {
    id: string;
    status: string;
    reason?: string | null;
    decisionComment?: string | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  canBuyB2C?: boolean;
  canBuyB2B?: boolean;
  canSell?: boolean;
  canOperate?: boolean;
};

type DraftState = {
  firstName: string;
  lastName: string;
  displayName: string;
  personalAddress: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  legalName: string;
  companyAddress: string;
  supplierType: 'trader' | 'manufacturer';
  country: string;
  notes: string;
  socialLinks: string;
};

type LoadState<T> = { loading: boolean; data: T | null; error: string | null };

const emptyDraft: DraftState = {
  firstName: '',
  lastName: '',
  displayName: '',
  personalAddress: '',
  contactPerson: '',
  contactEmail: '',
  contactPhone: '',
  companyName: '',
  legalName: '',
  companyAddress: '',
  supplierType: 'trader',
  country: '',
  notes: '',
  socialLinks: ''
};

function authRedirectError() {
  const error = new Error('Your session is no longer valid. Please sign in again.');
  error.name = 'AuthRedirectError';
  return error;
}

function redirectToSignIn() {
  if (typeof window === 'undefined') {
    return;
  }

  const returnTo = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/signin?returnTo=${encodeURIComponent(returnTo)}`);
}

async function complianceJson<T>(path: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const response = await fetch(`/api/compliance/${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'content-type': 'application/json' } : {}),
      ...(init?.headers ?? {})
    },
    cache: 'no-store'
  });

  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    if (response.status === 401) {
      redirectToSignIn();
      throw authRedirectError();
    }

    const message =
      typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? String((data as { message: string }).message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

function statusTone(status?: string | null) {
  if (['approved', 'active', 'cleared'].includes(status ?? '')) {
    return `${styles.status} ${styles.statusSuccess}`;
  }

  if (['rejected', 'inactive', 'issue_flagged'].includes(status ?? '')) {
    return `${styles.status} ${styles.statusError}`;
  }

  return `${styles.status} ${styles.statusWarning}`;
}

function scopeLabel(scope: ComplianceScope) {
  if (scope === 'buyer_b2b') return 'Buyer B2B';
  if (scope === 'supplier') return 'Supplier';
  if (scope === 'logistics') return 'Logistics';
  return 'Customs';
}

function parseSocialLinks(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function serializeSocialLinks(value: unknown) {
  if (Array.isArray(value)) {
    return value.join('\n');
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((item) => String(item ?? ''))
      .filter(Boolean)
      .join('\n');
  }

  return '';
}

function latestDocumentForRequirement(documents: Document[], requirementCode: string) {
  return [...documents]
    .filter((document) => String(document.metadata?.requirementCode ?? '') === requirementCode)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0];
}

export function ComplianceWorkspaceClient({ role }: { role: Exclude<MarketplaceRole, 'guest' | 'admin'> }) {
  const [state, setState] = useState<LoadState<ComplianceState>>({ loading: true, data: null, error: null });
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCode, setUploadingCode] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function loadState() {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await complianceJson<ComplianceState>('me');
      setState({ loading: false, data: response, error: null });
    } catch (failure) {
      if ((failure as Error).name === 'AuthRedirectError') {
        return;
      }
      setState({ loading: false, data: null, error: failure instanceof Error ? failure.message : 'Unable to load compliance state.' });
    }
  }

  useEffect(() => {
    void loadState();
  }, [role]);

  useEffect(() => {
    if (!state.data) {
      return;
    }

    setDraft({
      firstName: String(state.data.profile.firstName ?? ''),
      lastName: String(state.data.profile.lastName ?? ''),
      displayName: String(state.data.profile.displayName ?? ''),
      personalAddress: String(state.data.profile.personalAddress ?? ''),
      contactPerson: String(state.data.profile.contactPerson ?? ''),
      contactEmail: String(state.data.profile.contactEmail ?? ''),
      contactPhone: String(state.data.profile.contactPhone ?? ''),
      companyName: String(state.data.profile.companyName ?? ''),
      legalName: String(state.data.profile.legalName ?? ''),
      companyAddress: String(state.data.profile.companyAddress ?? ''),
      supplierType: (state.data.profile.supplierType as 'trader' | 'manufacturer' | undefined) ?? 'trader',
      country: String(state.data.profile.country ?? ''),
      notes: String(state.data.profile.notes ?? ''),
      socialLinks: serializeSocialLinks(state.data.profile.socialLinks)
    });
  }, [state.data]);

  const activeRequirements = useMemo(() => (state.data ? state.data.requirements.filter((requirement) => requirement.active) : []), [state.data]);

  const documentCountByRequirement = useMemo(() => {
    const mapping = new Map<string, Document>();
    if (!state.data) {
      return mapping;
    }

    for (const requirement of activeRequirements) {
      const latest = latestDocumentForRequirement(state.data.documents, requirement.code);
      if (latest) {
        mapping.set(requirement.code, latest);
      }
    }
    return mapping;
  }, [activeRequirements, state.data]);

  async function saveProfile() {
    if (!state.data) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await complianceJson('me', {
        method: 'PUT',
        body: JSON.stringify({
          firstName: draft.firstName.trim() || undefined,
          lastName: draft.lastName.trim() || undefined,
          displayName: draft.displayName.trim() || undefined,
          personalAddress: draft.personalAddress.trim() || undefined,
          contactPerson: draft.contactPerson.trim() || undefined,
          contactEmail: draft.contactEmail.trim() || undefined,
          contactPhone: draft.contactPhone.trim() || undefined,
          companyName: draft.companyName.trim() || undefined,
          legalName: draft.legalName.trim() || undefined,
          companyAddress: draft.companyAddress.trim() || undefined,
          supplierType: role === 'supplier' ? draft.supplierType : undefined,
          country: draft.country.trim() || undefined,
          notes: draft.notes.trim() || undefined,
          socialLinks: parseSocialLinks(draft.socialLinks)
        })
      });
      setMessage('Profile saved.');
      await loadState();
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function submitForReview() {
    if (!state.data) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await complianceJson('me/submit', {
        method: 'POST',
        body: JSON.stringify({
          documentIds: currentState.documents.map((document) => document.id),
          firstName: draft.firstName.trim() || undefined,
          lastName: draft.lastName.trim() || undefined,
          displayName: draft.displayName.trim() || undefined,
          personalAddress: draft.personalAddress.trim() || undefined,
          contactPerson: draft.contactPerson.trim() || undefined,
          contactEmail: draft.contactEmail.trim() || undefined,
          contactPhone: draft.contactPhone.trim() || undefined,
          companyName: draft.companyName.trim() || undefined,
          legalName: draft.legalName.trim() || undefined,
          companyAddress: draft.companyAddress.trim() || undefined,
          supplierType: role === 'supplier' ? draft.supplierType : undefined,
          country: draft.country.trim() || undefined,
          notes: draft.notes.trim() || undefined,
          socialLinks: parseSocialLinks(draft.socialLinks)
        })
      });
      setMessage('Submitted for admin review.');
      await loadState();
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Unable to submit onboarding.');
    } finally {
      setSubmitting(false);
    }
  }

  async function uploadRequirement(requirementCode: string) {
    if (!state.data) {
      return;
    }

    const file = files[requirementCode];
    if (!file) {
      setMessage('Choose a file first.');
      return;
    }

    setUploadingCode(requirementCode);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set('file', file);
      formData.set('requirementCode', requirementCode);
      formData.set('scope', state.data.scope);
      formData.set('profileId', state.data.profile.id);
      formData.set('documentType', 'compliance');

      const response = await fetch('/api/uploads/documents', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Upload failed with status ${response.status}`);
      }

      setFiles((current) => ({ ...current, [requirementCode]: null }));
      setMessage('Document uploaded.');
      await loadState();
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Unable to upload document.');
    } finally {
      setUploadingCode(null);
    }
  }

  if (state.loading && !state.data) {
    return <div className={styles.emptyState}>Loading compliance workspace...</div>;
  }

  if (state.error) {
    return <div className={styles.errorBox}>{state.error}</div>;
  }

  if (!state.data) {
    return null;
  }

  const currentState = state.data;
  const statusValue = role === 'buyer' ? currentState.profile.b2bStatus : currentState.profile.onboardingStatus;
  const reviewNote = role === 'buyer' ? currentState.profile.b2bReviewNote : currentState.profile.reviewNote;
  const submittedAt = role === 'buyer' ? currentState.profile.b2bSubmittedAt : currentState.profile.submittedAt;
  const reviewedAt = role === 'buyer' ? currentState.profile.b2bReviewedAt : currentState.profile.reviewedAt;
  const statusLabel = role === 'buyer' ? 'B2B verification status' : 'Onboarding status';
  const approvalFlag = role === 'buyer' ? currentState.canBuyB2B : role === 'supplier' ? currentState.canSell : currentState.canOperate;

  return (
    <div className={styles.stack}>
      {message ? <div className={styles.successBox}>{message}</div> : null}

      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{role === 'buyer' ? 'Buyer onboarding' : role === 'supplier' ? 'Supplier onboarding' : `${scopeLabel(currentState.scope)} onboarding`}</div>
          <div className={styles.inlineMeta}>
            <span>{statusLabel}: {String(statusValue ?? 'draft')}</span>
            <span>Approval: {approvalFlag ? 'active' : 'pending'}</span>
            {submittedAt ? <span>Submitted: {new Date(String(submittedAt)).toLocaleString()}</span> : null}
            {reviewedAt ? <span>Reviewed: {new Date(String(reviewedAt)).toLocaleString()}</span> : null}
          </div>
          <div className={styles.subtle} style={{ marginTop: 10 }}>
            {reviewNote ? `Review note: ${reviewNote}` : 'Save your profile, upload the required documents, and submit for admin review.'}
          </div>
          <div className={styles.buttonRow} style={{ marginTop: 12 }}>
            <button type="button" onClick={() => void saveProfile()} className={styles.buttonSecondary} disabled={saving}>
              {saving ? 'Saving...' : 'Save profile'}
            </button>
            <button type="button" onClick={() => void submitForReview()} className={styles.button} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit for review'}
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>{role === 'buyer' ? 'B2C vs B2B access' : 'Approval gate'}</div>
          {role === 'buyer' ? (
            <div className={styles.stack}>
              <div className={styles.inlineMeta}>
                <span>B2C buying: enabled</span>
                <span>B2B buying: {currentState.canBuyB2B ? 'enabled' : 'locked'}</span>
              </div>
              <div className={styles.subtle}>B2C purchases remain open. B2B purchasing unlocks only after your company profile and documents are approved.</div>
            </div>
          ) : role === 'supplier' ? (
            <div className={styles.stack}>
              <div className={styles.inlineMeta}>
                <span>Supplier selling: {currentState.canSell ? 'enabled' : 'locked'}</span>
                <span>Supplier type: {String(currentState.profile.supplierType ?? 'trader')}</span>
              </div>
              <div className={styles.subtle}>Supplier trading is locked until onboarding is approved by admin.</div>
            </div>
          ) : (
            <div className={styles.stack}>
              <div className={styles.inlineMeta}>
                <span>Operational access: {approvalFlag ? 'enabled' : 'locked'}</span>
                <span>Scope: {scopeLabel(currentState.scope)}</span>
              </div>
              <div className={styles.subtle}>Logistics and customs operators can only update assigned items after approval.</div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Company profile</div>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>First name</span>
              <input value={draft.firstName} onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))} />
            </label>
            <label className={styles.field}>
              <span>Last name</span>
              <input value={draft.lastName} onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))} />
            </label>
          </div>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Display name</span>
              <input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} />
            </label>
            <label className={styles.field}>
              <span>Contact person</span>
              <input value={draft.contactPerson} onChange={(event) => setDraft((current) => ({ ...current, contactPerson: event.target.value }))} />
            </label>
          </div>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Contact email</span>
              <input type="email" value={draft.contactEmail} onChange={(event) => setDraft((current) => ({ ...current, contactEmail: event.target.value }))} />
            </label>
            <label className={styles.field}>
              <span>Contact phone</span>
              <input value={draft.contactPhone} onChange={(event) => setDraft((current) => ({ ...current, contactPhone: event.target.value }))} />
            </label>
          </div>
          <label className={styles.field}>
            <span>Personal / company address</span>
            <textarea value={role === 'buyer' ? draft.personalAddress : draft.companyAddress} onChange={(event) => setDraft((current) => (role === 'buyer' ? { ...current, personalAddress: event.target.value } : { ...current, companyAddress: event.target.value }))} />
          </label>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Legal name</span>
              <input value={draft.legalName} onChange={(event) => setDraft((current) => ({ ...current, legalName: event.target.value }))} />
            </label>
            <label className={styles.field}>
              <span>Company name</span>
              <input value={draft.companyName} onChange={(event) => setDraft((current) => ({ ...current, companyName: event.target.value }))} />
            </label>
          </div>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Country</span>
              <input value={draft.country} onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))} />
            </label>
            {role === 'supplier' ? (
              <label className={styles.field}>
                <span>Supplier type</span>
                <select value={draft.supplierType} onChange={(event) => setDraft((current) => ({ ...current, supplierType: event.target.value as 'trader' | 'manufacturer' }))}>
                  <option value="trader">Trader</option>
                  <option value="manufacturer">Manufacturer</option>
                </select>
              </label>
            ) : (
              <label className={styles.field}>
                <span>Notes</span>
                <input value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            )}
          </div>
          <label className={styles.field}>
            <span>Social links</span>
            <textarea value={draft.socialLinks} onChange={(event) => setDraft((current) => ({ ...current, socialLinks: event.target.value }))} placeholder="One URL per line" />
          </label>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>Required documents</div>
          <div className={styles.subtle}>
            {currentState.missingRequirements.length
              ? `${currentState.missingRequirements.length} required document(s) still missing.`
              : 'All required documents are uploaded.'}
          </div>
          <div className={styles.stack} style={{ marginTop: 12 }}>
            {activeRequirements.length ? (
              activeRequirements.map((requirement) => {
                const uploaded = documentCountByRequirement.get(requirement.code);
                return (
                  <div key={requirement.id} className={styles.row} style={{ alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div className={styles.label}>{requirement.name}</div>
                      <div className={styles.subtle}>{requirement.helpText}</div>
                      <div className={styles.inlineMeta} style={{ marginTop: 8 }}>
                        <span>Files: {requirement.allowedFileTypes.join(', ') || 'any'}</span>
                        <span>Status: {uploaded ? uploaded.status : 'missing'}</span>
                      </div>
                    </div>
                    <div className={styles.stack} style={{ minWidth: 220 }}>
                      <input
                        type="file"
                        accept={requirement.allowedFileTypes.map((type) => `.${type}`).join(',')}
                        onChange={(event) => setFiles((current) => ({ ...current, [requirement.code]: event.target.files?.[0] ?? null }))}
                      />
                      <button
                        type="button"
                        className={styles.buttonSecondary}
                        onClick={() => void uploadRequirement(requirement.code)}
                        disabled={uploadingCode === requirement.code}
                      >
                        {uploadingCode === requirement.code ? 'Uploading...' : uploaded ? 'Replace document' : 'Upload document'}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyState}>No active document requirements configured yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
