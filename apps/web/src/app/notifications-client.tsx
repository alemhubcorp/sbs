'use client';

import { useEffect, useState } from 'react';
import styles from './core-flow.module.css';

type AuthRedirectError = Error & {
  name: 'AuthRedirectError';
};

type NotificationItem = {
  id: string;
  module: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type NotificationResponse = {
  items: NotificationItem[];
};

type LoadState<T> = {
  loading: boolean;
  data: T;
  error: string | null;
};

async function platformJson<T>(path: string) {
  const response = await fetch(`/api/${path}`, {
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
      if (typeof window !== 'undefined') {
        window.location.assign(`/signin?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }

      const error = new Error('Authentication required') as AuthRedirectError;
      error.name = 'AuthRedirectError';
      throw error;
    }

    const message =
      typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message?: unknown }).message === 'string'
        ? String((data as { message: string }).message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function NotificationsBoard() {
  const [state, setState] = useState<LoadState<NotificationItem[]>>({
    loading: true,
    data: [],
    error: null
  });

  async function loadNotifications() {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await platformJson<NotificationResponse>('notifications?limit=50');
      setState({ loading: false, data: response.items, error: null });
    } catch (error) {
      if ((error as AuthRedirectError).name === 'AuthRedirectError') {
        return;
      }

      setState({
        loading: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unable to load notifications.'
      });
    }
  }

  useEffect(() => {
    void loadNotifications();
    const interval = setInterval(() => {
      void loadNotifications();
    }, 15_000);

    return () => clearInterval(interval);
  }, []);

  if (state.loading && state.data.length === 0) {
    return <div className={styles.emptyState}>Loading notifications...</div>;
  }

  return (
    <div className={styles.grid}>
      {state.error ? <div className={styles.errorBox}>{state.error}</div> : null}

      <div className={styles.inlineMeta}>
        <span>Auto-refresh: on</span>
        <span>Source: audit events</span>
        <span>Events: {state.data.length}</span>
      </div>

      {state.data.length ? (
        <div className={styles.stack}>
          {state.data.map((item) => (
            <article className={styles.sectionCard} key={item.id}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>{item.title}</div>
                  <div className={styles.muted}>
                    {new Date(item.createdAt).toLocaleString()} · {item.module} · {item.type}
                  </div>
                </div>
                <span className={`${styles.status} ${item.read ? styles.statusSuccess : styles.statusWarning}`}>
                  {item.read ? 'read' : 'new'}
                </span>
              </div>
              <div className={styles.subtle}>{item.message}</div>
              <div className={styles.inlineMeta} style={{ marginTop: 12 }}>
                <span>Entity: {item.entityType ?? 'n/a'}</span>
                <span>ID: {item.entityId ?? 'n/a'}</span>
                <span>Meta: {item.metadata ? 'available' : 'n/a'}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>No notifications yet. Activity from RFQ, quote, payment, shipping, and delivery will appear here.</div>
      )}
    </div>
  );
}
