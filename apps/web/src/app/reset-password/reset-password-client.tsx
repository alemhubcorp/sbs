'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from '../auth-forms.module.css';

export function ResetPasswordClient({ token }: { token: string | null }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('This password reset link is invalid or expired.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/identity/public/password/reset', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword
        })
      });
      const payload = (await response.json()) as { success?: boolean; message?: string; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? payload.message ?? 'Unable to reset password.');
      }

      setSuccess('Password updated successfully. You can sign in now.');
      setPassword('');
      setConfirmPassword('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.panel}>
          <div className={styles.eyebrow}>Set new password</div>
          <div>
            <h1 className={styles.title}>Finish password recovery.</h1>
            <p className={styles.copy}>
              Set a new marketplace password using the secure reset token from your email.
            </p>
          </div>

          {!token ? <div className={styles.error}>This password reset link is invalid or expired.</div> : null}
          {error ? <div className={styles.error}>{error}</div> : null}
          {success ? <div className={styles.success}>{success}</div> : null}

          <form className={styles.form} onSubmit={onSubmit}>
            <label className={styles.fieldWide}>
              <span>New password</span>
              <div className={styles.passwordWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <label className={styles.fieldWide}>
              <span>Confirm password</span>
              <div className={styles.passwordWrap}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={10}
                  required
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  aria-pressed={showConfirmPassword}
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <div className={styles.hint}>Password must be at least 10 characters long.</div>

            <div className={styles.actions}>
              <button type="submit" className={styles.submit} disabled={submitting || !token}>
                {submitting ? 'Updating password...' : 'Set New Password'}
              </button>
              <Link href="/signin?registered=reset" className={styles.secondary}>
                Back to Sign In
              </Link>
            </div>
          </form>
        </section>

        <aside className={styles.aside}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Recovery notes</div>
            <div className={styles.cardCopy}>
              Reset tokens expire automatically. If this link fails, request a fresh reset email from the forgot password page.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
