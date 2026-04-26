'use client';

import type { FormEvent } from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [publicSettings, setPublicSettings] = useState<null | {
    governance?: {
      emailVerificationRequired?: boolean;
      emailVerificationBlockedReason?: string | null;
      consent?: {
        registrationDocumentSlugs?: string[];
        supplierRegistrationDocumentSlugs?: string[];
      };
    };
    legalDocuments?: Array<{ slug: string; title: string; version: string; href: string }>;
  }>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetch('/api/platform/public-settings', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as {
          governance?: {
            emailVerificationRequired?: boolean;
            emailVerificationBlockedReason?: string | null;
            consent?: {
              registrationDocumentSlugs?: string[];
              supplierRegistrationDocumentSlugs?: string[];
            };
          };
          legalDocuments?: Array<{ slug: string; title: string; version: string; href: string }>;
        };
      })
      .then((data) => {
        if (!cancelled) {
          if (data) {
            setPublicSettings(data);
          }
          setSettingsLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSettingsLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const requiredConsentSlugs = useMemo(() => {
    const consent = publicSettings?.governance?.consent;
    return kind === 'supplier' ? consent?.supplierRegistrationDocumentSlugs ?? [] : consent?.registrationDocumentSlugs ?? [];
  }, [kind, publicSettings]);

  const requiredConsentDocs = useMemo(
    () => (publicSettings?.legalDocuments ?? []).filter((document) => requiredConsentSlugs.includes(document.slug)),
    [publicSettings, requiredConsentSlugs]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (state.password !== state.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!legalAccepted) {
      setError('You must accept the Terms & Conditions and Privacy Policy to continue.');
      return;
    }

    if (!settingsLoaded) {
      setError('Registration requirements are still loading. Please try again in a moment.');
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
          ...(state.country.trim() ? { country: state.country.trim() } : {}),
          consents: requiredConsentDocs.map((document) => ({
            documentSlug: document.slug,
            version: document.version
          }))
        })
      });

      if (!response.ok) {
        throw new Error(await readJsonError(response));
      }

      const payload = (await response.json()) as { emailVerificationRequired?: boolean };

      window.location.assign(
        `/signin?registered=${encodeURIComponent(payload.emailVerificationRequired ? 'verification' : kind)}&email=${encodeURIComponent(state.email.trim())}&returnTo=${encodeURIComponent(returnTo)}`
      );
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to complete registration.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.shell}>
      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.intro}>
          <div className={styles.eyebrow}>{kind === 'buyer' ? 'Buyer onboarding' : 'Supplier onboarding'}</div>
          <h2 className={styles.title}>{kind === 'buyer' ? 'Set up a buyer workspace built for sourcing and escrow.' : 'Set up a supplier workspace built for quotes and payout release.'}</h2>
          <p className={styles.copy}>
            {kind === 'buyer'
              ? 'Create a production-ready buyer account with the details needed for requests, checkout, and order tracking.'
              : 'Create a supplier account with the details needed for RFQ response, deal execution, and payout operations.'}
          </p>
        </div>

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
            <div className={styles.passwordWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={state.password}
                onChange={(event) => setState((current) => ({ ...current, password: event.target.value }))}
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
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Confirm password</span>
            <div className={styles.passwordWrap}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={state.confirmPassword}
                onChange={(event) => setState((current) => ({ ...current, confirmPassword: event.target.value }))}
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
        {publicSettings?.governance?.emailVerificationRequired ? (
          <div className={styles.notice}>
            A verification email will be sent after registration. Check your inbox before signing in.
          </div>
        ) : null}
        {publicSettings?.governance?.emailVerificationBlockedReason ? (
          <div className={styles.error}>{publicSettings.governance.emailVerificationBlockedReason}</div>
        ) : null}

        <div className={styles.consentCard}>
          <label className={styles.consentItem}>
            <input
              type="checkbox"
              checked={legalAccepted}
              onChange={(event) => setLegalAccepted(event.target.checked)}
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" target="_blank">Terms &amp; Conditions</Link>
              {' and '}
              <Link href="/privacy" target="_blank">Privacy Policy</Link>
              {kind === 'supplier' ? (
                <>
                  {' and '}
                  <Link href="/seller-policy" target="_blank">Seller Policy</Link>
                </>
              ) : null}
            </span>
          </label>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submit} disabled={submitting || !settingsLoaded}>
            {!settingsLoaded ? 'Loading...' : submitting ? 'Creating account...' : kind === 'buyer' ? 'Create buyer account' : 'Create supplier account'}
          </button>
          <div className={styles.helper}>After registration you will be redirected to sign in.</div>
        </div>
      </form>

      <aside className={styles.aside}>
        <div className={styles.asideCard}>
          <div className={styles.asideLabel}>What opens next</div>
          <div className={styles.asideValue}>{kind === 'buyer' ? 'Dashboard' : 'Quotes and payouts'}</div>
          <div className={styles.asideCopy}>
            {kind === 'buyer'
              ? 'Buyers move into requests, checkout, escrow-backed payments, and order follow-up.'
              : 'Suppliers move into RFQ intake, deal execution, shipment follow-up, and payout release readiness.'}
          </div>
          <div className={styles.asideList}>
            {(kind === 'buyer'
              ? [
                  ['Requests', 'Create sourcing requests and compare supplier responses.'],
                  ['Payments', 'Track buyer payment state in one cabinet.'],
                  ['Orders', 'Keep post-checkout delivery follow-up visible.']
                ]
              : [
                  ['RFQ inbox', 'Respond to inbound demand from one live supplier surface.'],
                  ['Deals', 'Follow accepted quotes into escrow and delivery.'],
                  ['Payouts', 'Review held, releasable, and released funds.']
                ]
            ).map(([title, copy]) => (
              <div key={title} className={styles.bullet}>
                <div className={styles.bulletTitle}>{title}</div>
                <div className={styles.bulletCopy}>{copy}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.asideCard}>
          <div className={styles.asideLabel}>Access checklist</div>
          <div className={styles.asideList}>
            <div className={styles.asideItem}>
              <span>Public route</span>
              <strong>Live</strong>
            </div>
            <div className={styles.asideItem}>
              <span>Password rule</span>
              <strong>10+ chars</strong>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
