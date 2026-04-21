'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from '../auth-forms.module.css';

export function ForgotPasswordClient({ returnTo }: { returnTo: string }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/identity/public/password/forgot', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim()
        })
      });
      const payload = (await response.json()) as { success?: boolean; message?: string; error?: string };

      if (!response.ok) {
        const message = payload.error ?? payload.message ?? 'Unable to start password reset.';
        if (message.includes('SMTP is not configured')) {
          throw new Error(
            'Password reset email is unavailable right now because outbound email is not configured. Contact support or a marketplace operator to enable SMTP, then retry.'
          );
        }

        throw new Error(message);
      }

      setSuccess('If the account exists and email delivery is available, a reset link has been sent.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to start password reset.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.panel}>
          <div className={styles.eyebrow}>Recovery</div>
          <div>
            <h1 className={styles.title}>Reset your password safely.</h1>
            <p className={styles.copy}>
              Enter the email used for your marketplace account. The recovery flow uses the live auth system and sends a reset link when SMTP delivery is available.
            </p>
          </div>

          {success ? <div className={styles.success}>{success}</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.fieldWide}>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <div className={styles.actions}>
              <button type="submit" className={styles.submit} disabled={submitting}>
                {submitting ? 'Sending reset link...' : 'Send Reset Link'}
              </button>
              <Link href={`/signin?returnTo=${encodeURIComponent(returnTo)}`} className={styles.secondary}>
                Back to Sign In
              </Link>
            </div>
          </form>
        </section>

        <aside className={styles.aside}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Delivery dependency</div>
            <div className={styles.cardCopy}>
              Password reset email depends on SMTP. If SMTP is not configured, this page shows that explicitly instead of pretending the request succeeded.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>If delivery is unavailable</div>
            <div className={styles.cardCopy}>
              Ask an admin to configure SMTP in the control plane before retrying. Registration and sign-in stay available even when recovery email is offline.
            </div>
          </div>
          <div className={styles.statusList}>
            <div className={styles.statusRow}>
              <span>Return path</span>
              <strong>{returnTo}</strong>
            </div>
            <div className={styles.statusRow}>
              <span>Token lifetime</span>
              <strong>30 min</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
