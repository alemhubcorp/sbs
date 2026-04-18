'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './core-flow.module.css';

type AssignmentKind = 'shipment' | 'customs';

type AssignmentItem = {
  id: string;
  tenantId: string;
  kind: AssignmentKind;
  subjectType: string;
  subjectId: string;
  reference: string | null;
  status: string;
  notes: string | null;
  partnerOrganization?: { id: string; name: string; legalName?: string | null; status?: string | null; partnerType?: string | null } | null;
  partnerUser?: { id: string; email?: string | null; firstName?: string | null; lastName?: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

type LoadState<T> = {
  loading: boolean;
  data: T;
  error: string | null;
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

async function partnerJson<T>(path: string, init?: RequestInit) {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const response = await fetch(`/api/partner-ops/${path}`, {
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
    if (response.status === 401 || response.status === 403) {
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

function statusLabel(kind: AssignmentKind, status: string) {
  if (kind === 'shipment') {
    if (status === 'accepted') return 'Accepted';
    if (status === 'in_transit') return 'In transit';
    if (status === 'delivered') return 'Delivered';
    if (status === 'completed') return 'Completed';
  }

  if (kind === 'customs') {
    if (status === 'documents_requested') return 'Documents requested';
    if (status === 'under_clearance') return 'Under clearance';
    if (status === 'cleared') return 'Cleared';
    if (status === 'issue_flagged') return 'Issue flagged';
  }

  return status;
}

function statusTone(status: string) {
  if (['delivered', 'completed', 'cleared'].includes(status)) {
    return `${styles.status} ${styles.statusSuccess}`;
  }

  if (['issue_flagged'].includes(status)) {
    return `${styles.status} ${styles.statusError}`;
  }

  return `${styles.status} ${styles.statusWarning}`;
}

const SHIPMENT_STATUSES = ['accepted', 'in_transit', 'delivered', 'completed'];
const CUSTOMS_STATUSES = ['documents_requested', 'under_clearance', 'cleared', 'issue_flagged'];

export function PartnerOperationsBoard({ kind, role }: { kind: AssignmentKind; role: 'logistics' | 'customs' }) {
  const [state, setState] = useState<LoadState<AssignmentItem[]>>({ loading: true, data: [], error: null });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAssignments() {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await partnerJson<{ items: AssignmentItem[] }>(`assignments?kind=${kind}`);
      setState({ loading: false, data: response.items ?? [], error: null });
      setSelectedId((current) => current ?? response.items?.[0]?.id ?? null);
    } catch (failure) {
      if ((failure as Error).name === 'AuthRedirectError') {
        return;
      }
      setState({
        loading: false,
        data: [],
        error: failure instanceof Error ? failure.message : 'Unable to load assignments.'
      });
    }
  }

  useEffect(() => {
    void loadAssignments();
    const interval = setInterval(() => {
      void loadAssignments();
    }, 20_000);

    return () => clearInterval(interval);
  }, [kind]);

  const selected = useMemo(() => state.data.find((assignment) => assignment.id === selectedId) ?? state.data[0] ?? null, [state.data, selectedId]);
  const statuses = kind === 'shipment' ? SHIPMENT_STATUSES : CUSTOMS_STATUSES;

  async function updateStatus(nextStatus: string) {
    if (!selected) {
      return;
    }

    setSavingId(selected.id);
    setError(null);

    try {
      await partnerJson(`assignments/${selected.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      await loadAssignments();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to update status.');
    } finally {
      setSavingId(null);
    }
  }

  if (state.loading && state.data.length === 0) {
    return <div className={styles.emptyState}>Loading {role === 'logistics' ? 'shipment' : 'customs'} assignments...</div>;
  }

  return (
    <div className={styles.stack}>
      {state.error ? <div className={styles.errorBox}>{state.error}</div> : null}
      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.sectionTitle}>{role === 'logistics' ? 'Assigned shipments' : 'Assigned customs cases'}</div>
          <div className={styles.subtle}>
            {state.data.length ? `${state.data.length} assigned item(s)` : role === 'logistics' ? 'No shipments assigned yet.' : 'No customs cases assigned yet.'}
          </div>
          <div className={styles.stack} style={{ marginTop: 12 }}>
            {state.data.length ? (
              state.data.map((assignment) => (
                <button
                  key={assignment.id}
                  type="button"
                  onClick={() => setSelectedId(assignment.id)}
                  className={styles.row}
                  style={{
                    textAlign: 'left',
                    border: assignment.id === selected?.id ? '1px solid #2563eb' : '1px solid #e5e7eb',
                    background: assignment.id === selected?.id ? '#eff6ff' : '#fff',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                >
                  <span className={styles.label}>#{assignment.reference ?? assignment.id.slice(0, 8)}</span>
                  <span className={statusTone(assignment.status)}>{statusLabel(kind, assignment.status)}</span>
                </button>
              ))
            ) : (
              <div className={styles.emptyState}>{role === 'logistics' ? 'No shipments assigned yet.' : 'No customs cases assigned yet.'}</div>
            )}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionTitle}>Assignment detail</div>
          {selected ? (
            <div className={styles.stack}>
              <div className={styles.inlineMeta}>
                <span>Reference: {selected.reference ?? 'n/a'}</span>
                <span>Subject: {selected.subjectType}</span>
                <span>ID: {selected.subjectId}</span>
              </div>
              <div className={styles.inlineMeta}>
                <span>Partner: {selected.partnerOrganization?.name ?? 'n/a'}</span>
                <span>User: {selected.partnerUser?.email ?? 'n/a'}</span>
                <span>Status: {statusLabel(kind, selected.status)}</span>
              </div>
              <div className={styles.subtle}>{selected.notes ?? 'No notes supplied.'}</div>
              <div className={styles.buttonRow} style={{ marginTop: 12 }}>
                {statuses.map((nextStatus) => (
                  <button
                    key={nextStatus}
                    type="button"
                    className={styles.buttonSecondary}
                    onClick={() => void updateStatus(nextStatus)}
                    disabled={savingId === selected.id || nextStatus === selected.status}
                  >
                    {savingId === selected.id && nextStatus !== selected.status ? 'Saving...' : statusLabel(kind, nextStatus)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>Select an assignment to see detail and update status.</div>
          )}
        </div>
      </div>
    </div>
  );
}
