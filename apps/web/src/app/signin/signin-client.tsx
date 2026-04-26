'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import styles from '../auth-forms.module.css';

type Props = {
  returnTo: string;
  authState: string | null;
  registered: string | null;
  initialEmail: string;
};

function authMessage(authState: string | null) {
  if (authState === 'invalid-state') {
    return 'Your sign-in session expired before it completed. Try again.';
  }

  if (authState === 'callback-error') {
    return 'The secure auth callback failed. Sign in again or use password recovery.';
  }

  if (authState === 'email-verification-required') {
    return 'Verify your email before signing in.';
  }

  return null;
}

export function SignInClient({ returnTo, authState, registered, initialEmail }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const success = useMemo(() => {
    if (registered === 'buyer') {
      return 'Buyer account created. Sign in to continue into the marketplace.';
    }

    if (registered === 'supplier') {
      return 'Supplier account created. Sign in to continue into the supplier cabinet.';
    }

    if (registered === 'reset') {
      return 'Password updated. Sign in with your new password.';
    }

    if (registered === 'verification') {
      return 'Account created. Verify your email from the message we sent before signing in.';
    }

    return null;
  }, [registered]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/session/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          returnTo
        })
      });
      const payload = (await response.json()) as { success?: boolean; error?: string; redirectTo?: string };

      if (!response.ok || !payload.success || !payload.redirectTo) {
        throw new Error(payload.error ?? 'Unable to sign in.');
      }

      window.location.assign(payload.redirectTo);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.panel}>
          <div className={styles.eyebrow}>Auth entry</div>
          <div>
            <h1 className={styles.title}>Sign in without losing your flow.</h1>
            <p className={styles.copy}>
              Use your marketplace credentials directly here and continue into the same buyer, supplier, logistics, or customs flow.
            </p>
          </div>

          {success ? <div className={styles.success}>{success}</div> : null}
          {authMessage(authState) ? <div className={styles.error}>{authMessage(authState)}</div> : null}
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

            <label className={styles.fieldWide}>
              <span>Password</span>
              <div className={styles.passwordWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
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

            <div className={styles.actions}>
              <button type="submit" className={styles.submit} disabled={submitting}>
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
              <Link href={`/register?returnTo=${encodeURIComponent(returnTo)}`} className={styles.secondary}>
                Create Account
              </Link>
            </div>
          </form>

          <div className={styles.linkRow}>
            <Link href={`/forgot-password?returnTo=${encodeURIComponent(returnTo)}`} className={styles.link}>
              Forgot password?
            </Link>
            <Link href={`/register?returnTo=${encodeURIComponent(returnTo)}`} className={styles.link}>
              Create account
            </Link>
          </div>
        </section>

        <aside className={styles.aside}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>What happens next</div>
            <div className={styles.cardCopy}>
              Buyers return to requests, checkout, and orders. Suppliers return to products, quotes, deals, and payouts.
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Recovery path</div>
            <div className={styles.cardCopy}>
              Password recovery uses the same production auth system. If SMTP is unavailable, the page now shows that explicitly instead of failing silently.
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
