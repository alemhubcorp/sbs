'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './core-flow.module.css';

type Requirement = {
  id: string;
  code: string;
  name: string;
  appliesTo: string[];
  required: boolean;
  allowedFileTypes: string[];
  helpText: string;
  active: boolean;
};

type Approval = {
  id: string;
  approvalType: string;
  status: string;
  module: string;
  tenantId?: string | null;
  subjectType: string;
  subjectId: string;
  reason?: string | null;
  decisionComment?: string | null;
  payload?: Record<string, unknown> | null;
  requestedByUser?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null;
  decidedByUser?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null;
  createdAt: string;
  decidedAt?: string | null;
};

type DocumentItem = {
  id: string;
  name: string;
  status: string;
  storageKey?: string | null;
  storageBucket?: string | null;
  metadata?: Record<string, unknown> | null;
  uploadedByUser?: { email?: string | null; firstName?: string | null; lastName?: string | null } | null;
  createdAt: string;
};

function redirectToSignIn() {
  if (typeof window !== 'undefined') {
    window.location.assign(`/signin?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }
}

async function adminJson<T>(path: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const response = await fetch(`/api/${path}`, {
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
      throw new Error('Authentication required');
    }

    const message =
      typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? String((data as { message: string }).message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function AdminComplianceBoard() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>('');
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | 'needs_more_info' | 'all'>('pending');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRequirements, setSavingRequirements] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [approvalResponse, requirementResponse, documentResponse] = await Promise.all([
        adminJson<{ items: Approval[] }>(
          `admin/approvals?module=compliance-core${approvalStatus === 'all' ? '' : `&status=${encodeURIComponent(approvalStatus)}`}`
        ),
        adminJson<{ items: Requirement[] }>('compliance/requirements'),
        adminJson<{ items: DocumentItem[] }>('documents')
      ]);

      const nextApprovals = approvalResponse.items ?? [];
      setApprovals(nextApprovals);
      setSelectedApprovalId((current) => current || nextApprovals[0]?.id || '');
      setRequirements(requirementResponse.items ?? []);
      setDocuments(documentResponse.items ?? []);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to load compliance admin data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [approvalStatus]);

  const selectedApproval = useMemo(() => approvals.find((approval) => approval.id === selectedApprovalId) ?? approvals[0] ?? null, [approvals, selectedApprovalId]);
  const selectedDocuments = useMemo(() => {
    const ids = new Set<string>((selectedApproval?.payload?.documentIds as string[] | undefined) ?? []);
    return documents.filter((document) => ids.has(document.id));
  }, [documents, selectedApproval]);

  async function updateApproval(action: 'approve' | 'reject' | 'request-more-info') {
    if (!selectedApproval) {
      return;
    }

    setMessage(null);
    try {
      await adminJson(`admin/approvals/${selectedApproval.id}/${action}`, {
        method: 'POST',
        body: JSON.stringify(comment.trim() ? { comment: comment.trim() } : {})
      });
      setComment('');
      await load();
      setMessage(`Approval ${action.replace('-', ' ')}d.`);
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Unable to update approval.');
    }
  }

  async function saveRequirements() {
    setSavingRequirements(true);
    setMessage(null);

    try {
      await adminJson('compliance/requirements', {
        method: 'PUT',
        body: JSON.stringify({
          requirements: requirements.map((requirement) => ({
            ...requirement,
            appliesTo: requirement.appliesTo,
            allowedFileTypes: requirement.allowedFileTypes
              .map((item) => item.trim())
              .filter(Boolean)
          }))
        })
      });
      setMessage('Compliance requirements saved.');
      await load();
    } catch (failure) {
      setMessage(failure instanceof Error ? failure.message : 'Unable to save requirements.');
    } finally {
      setSavingRequirements(false);
    }
  }

  if (loading) {
    return <div className={styles.emptyState}>Loading compliance approvals...</div>;
  }

  if (error) {
    return <div className={styles.errorBox}>{error}</div>;
  }

  return (
    <div className={styles.stack}>
      {message ? <div className={styles.successBox}>{message}</div> : null}

      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.sectionTitle}>Compliance approvals</div>
          <label className={styles.field}>
            <span>Status filter</span>
            <select value={approvalStatus} onChange={(event) => setApprovalStatus(event.target.value as typeof approvalStatus)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="needs_more_info">Needs more info</option>
              <option value="all">All</option>
            </select>
          </label>
          <div className={styles.subtle}>{approvals.length ? `${approvals.length} item(s) waiting review.` : 'No pending compliance approvals.'}</div>
          <div className={styles.stack} style={{ marginTop: 12 }}>
            {approvals.length ? (
              approvals.map((approval) => (
                <button
                  key={approval.id}
                  type="button"
                  className={styles.row}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: approval.id === selectedApproval?.id ? '1px solid #2563eb' : '1px solid #e5e7eb',
                    background: approval.id === selectedApproval?.id ? '#eff6ff' : '#fff'
                  }}
                  onClick={() => setSelectedApprovalId(approval.id)}
                >
                  <span className={styles.label}>{approval.approvalType}</span>
                  <span>{approval.status}</span>
                </button>
              ))
            ) : (
              <div className={styles.emptyState}>Nothing to review.</div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>Review detail</div>
          {selectedApproval ? (
            <div className={styles.stack}>
              <div className={styles.inlineMeta}>
                <span>Type: {selectedApproval.approvalType}</span>
                <span>Module: {selectedApproval.module}</span>
                <span>Status: {selectedApproval.status}</span>
              </div>
              <div className={styles.subtle}>Subject: {selectedApproval.subjectType} / {selectedApproval.subjectId}</div>
              <div className={styles.subtle}>Requested by: {selectedApproval.requestedByUser?.email ?? 'n/a'}</div>
              <div className={styles.subtle}>Reason: {selectedApproval.reason ?? 'n/a'}</div>
              {selectedApproval.decisionComment ? <div className={styles.subtle}>Decision note: {selectedApproval.decisionComment}</div> : null}
              <div className={styles.buttonRow}>
                <button type="button" className={styles.buttonSecondary} onClick={() => void updateApproval('approve')} disabled={selectedApproval.status !== 'pending'}>
                  Approve
                </button>
                <button type="button" className={styles.buttonSecondary} onClick={() => void updateApproval('reject')} disabled={selectedApproval.status !== 'pending'}>
                  Reject
                </button>
                <button type="button" className={styles.button} onClick={() => void updateApproval('request-more-info')} disabled={selectedApproval.status !== 'pending'}>
                  Request more info
                </button>
              </div>
              <label className={styles.field}>
                <span>Internal comment</span>
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} />
              </label>
              <div className={styles.sectionTitle} style={{ marginTop: 12 }}>Submitted documents</div>
              <div className={styles.stack}>
                {selectedDocuments.length ? (
                  selectedDocuments.map((document) => (
                    <div key={document.id} className={styles.row}>
                      <span className={styles.label}>{document.name}</span>
                      <a href={`/api/documents/${document.id}/download`} target="_blank" rel="noreferrer" className={styles.buttonSecondary}>
                        Download
                      </a>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>No linked documents found for this approval.</div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>Select an approval to review details.</div>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionTitle}>Document requirements</div>
        <div className={styles.subtle}>Edit the active KYC-lite document requirements used by buyer, supplier, logistics, and customs onboarding.</div>
        <div className={styles.stack} style={{ marginTop: 12 }}>
          {requirements.map((requirement, index) => (
            <div key={requirement.id} className={styles.card} style={{ background: '#f8fafc' }}>
              <div className={styles.inlineMeta}>
                <span>Requirement {index + 1}</span>
                <span>{requirement.code}</span>
              </div>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Name</span>
                  <input
                    value={requirement.name}
                    onChange={(event) =>
                      setRequirements((current) =>
                        current.map((item, currentIndex) => (currentIndex === index ? { ...item, name: event.target.value } : item))
                      )
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Code / slug</span>
                  <input
                    value={requirement.code}
                    onChange={(event) =>
                      setRequirements((current) =>
                        current.map((item, currentIndex) => (currentIndex === index ? { ...item, code: event.target.value } : item))
                      )
                    }
                  />
                </label>
              </div>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Applies to</span>
                  <input
                    value={requirement.appliesTo.join(',')}
                    onChange={(event) =>
                      setRequirements((current) =>
                        current.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, appliesTo: event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean) } : item
                        )
                      )
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Allowed file types</span>
                  <input
                    value={requirement.allowedFileTypes.join(',')}
                    onChange={(event) =>
                      setRequirements((current) =>
                        current.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, allowedFileTypes: event.target.value.split(',').map((entry) => entry.trim()).filter(Boolean) } : item
                        )
                      )
                    }
                  />
                </label>
              </div>
              <label className={styles.field}>
                <span>Help text</span>
                <textarea
                  value={requirement.helpText}
                  onChange={(event) =>
                    setRequirements((current) =>
                      current.map((item, currentIndex) => (currentIndex === index ? { ...item, helpText: event.target.value } : item))
                    )
                  }
                />
              </label>
              <div className={styles.inlineMeta}>
                <label>
                  <input
                    type="checkbox"
                    checked={requirement.required}
                    onChange={(event) =>
                      setRequirements((current) =>
                        current.map((item, currentIndex) => (currentIndex === index ? { ...item, required: event.target.checked } : item))
                      )
                    }
                  />{' '}
                  Required
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={requirement.active}
                    onChange={(event) =>
                      setRequirements((current) =>
                        current.map((item, currentIndex) => (currentIndex === index ? { ...item, active: event.target.checked } : item))
                      )
                    }
                  />{' '}
                  Active
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.buttonRow} style={{ marginTop: 12 }}>
          <button type="button" className={styles.buttonSecondary} onClick={() => setRequirements((current) => [...current, { id: `req-${Date.now()}`, code: '', name: '', appliesTo: ['buyer_b2b'], required: true, allowedFileTypes: ['pdf'], helpText: '', active: true }])}>
            Add requirement
          </button>
          <button type="button" className={styles.button} onClick={() => void saveRequirements()} disabled={savingRequirements}>
            {savingRequirements ? 'Saving...' : 'Save requirements'}
          </button>
        </div>
      </div>
    </div>
  );
}
