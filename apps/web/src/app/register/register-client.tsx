'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import styles from './register.module.css';

type RegistrationKind = 'buyer' | 'supplier';

type Props = {
  kind: RegistrationKind;
  returnTo: string;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  country: string;
};

const initialState: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  companyName: '',
  country: ''
};

async function readJsonError(response: Response) {
  const text = await response.text();

  try {
    const data = text ? JSON.parse(text) : null;
    if (typeof data === 'object' && data !== null) {
      if ('message' in data && typeof (data as { message?: unknown }).message === 'string') {
        return (data as { message: string }).message;
      }

      if ('error' in data && typeof (data as { error?: unknown }).error === 'string') {
        return (data as { error: string }).error;
      }
    }
  } catch {
    // Fall through to raw text.
  }

  return text || `Request failed with status ${response.status}`;
}

export function RegistrationForm({ kind, returnTo }: Props) {
  const [state, setState] = useState<FormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (state.password !== state.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/identity/public/register/${kind}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          firstName: state.firstName.trim(),
          lastName: state.lastName.trim(),
          email: state.email.trim(),
          password: state.password,
          ...(state.companyName.trim() ? { companyName: state.companyName.trim() } : {}),
          ...(state.country.trim() ? { country: state.country.trim() } : {})
        })
      });

      if (!response.ok) {
        throw new Error(await readJsonError(response));
      }

      window.location.assign(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to complete registration.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>First name</span>
          <input
            type="text"
            value={state.firstName}
            onChange={(event) => setState((current) => ({ ...current, firstName: event.target.value }))}
            autoComplete="given-name"
            required
          />
        </label>
        <label className={styles.field}>
          <span>Last name</span>
          <input
            type="text"
            value={state.lastName}
            onChange={(event) => setState((current) => ({ ...current, lastName: event.target.value }))}
            autoComplete="family-name"
            required
          />
        </label>
      </div>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email"
            value={state.email}
            onChange={(event) => setState((current) => ({ ...current, email: event.target.value }))}
            autoComplete="email"
            required
          />
        </label>
        <label className={styles.field}>
          <span>Password</span>
          <input
            type="password"
            value={state.password}
            onChange={(event) => setState((current) => ({ ...current, password: event.target.value }))}
            autoComplete="new-password"
            minLength={10}
            required
          />
        </label>
      </div>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Confirm password</span>
          <input
            type="password"
            value={state.confirmPassword}
            onChange={(event) => setState((current) => ({ ...current, confirmPassword: event.target.value }))}
            autoComplete="new-password"
            minLength={10}
            required
          />
        </label>
        <label className={styles.field}>
          <span>{kind === 'supplier' ? 'Company name' : 'Company name (optional)'}</span>
          <input
            type="text"
            value={state.companyName}
            onChange={(event) => setState((current) => ({ ...current, companyName: event.target.value }))}
            autoComplete="organization"
            required={kind === 'supplier'}
          />
        </label>
      </div>

      <label className={styles.field}>
        <span>Country</span>
        <input
          type="text"
          value={state.country}
          onChange={(event) => setState((current) => ({ ...current, country: event.target.value }))}
          autoComplete="country-name"
        />
      </label>

      {error ? <div className={styles.error}>{error}</div> : null}

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={submitting}>
          {submitting ? 'Creating account...' : kind === 'buyer' ? 'Create buyer account' : 'Create supplier account'}
        </button>
        <div className={styles.helper}>
          After signup you will be sent to the sign-in flow with a valid local session target.
        </div>
      </div>
    </form>
  );
}
