'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import styles from '../auth-forms.module.css';

type Mode = 'signin' | 'register';
type Role = 'buyer' | 'supplier';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  country: string;
};

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  companyName: '',
  country: '',
};

type Props = {
  returnTo: string;
  authState: string | null;
  registered: string | null;
  initialEmail: string;
  initialMode: Mode;
  initialRole: Role | null;
};

function authError(authState: string | null) {
  if (authState === 'invalid-state') return 'Your sign-in session expired. Try again.';
  if (authState === 'callback-error') return 'Auth callback failed. Sign in again or use password recovery.';
  if (authState === 'email-verification-required') return 'Verify your email before signing in.';
  return null;
}

async function readJsonError(res: Response) {
  const text = await res.text();
  try {
    const d = text ? JSON.parse(text) : null;
    if (d && typeof d === 'object') {
      if (typeof d.message === 'string') return d.message;
      if (typeof d.error === 'string') return d.error;
    }
  } catch { /* fall through */ }
  return text || `Request failed with status ${res.status}`;
}

export function AuthClient({ returnTo, authState, registered, initialEmail, initialMode, initialRole }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [role, setRole] = useState<Role | null>(initialRole);

  // Sign-in state
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signinSubmitting, setSigninSubmitting] = useState(false);
  const [signinError, setSigninError] = useState<string | null>(null);

  // Register state
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [publicSettings, setPublicSettings] = useState<null | {
    governance?: {
      emailVerificationRequired?: boolean;
      emailVerificationBlockedReason?: string | null;
      consent?: { registrationDocumentSlugs?: string[]; supplierRegistrationDocumentSlugs?: string[] };
    };
    legalDocuments?: Array<{ slug: string; title: string; version: string; href: string }>;
  }>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/platform/public-settings', { cache: 'no-store' })
      .then(async (r) => (r.ok ? (await r.json()) as typeof publicSettings : null))
      .then((d) => { if (!cancelled) { if (d) setPublicSettings(d); setSettingsLoaded(true); } })
      .catch(() => { if (!cancelled) setSettingsLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const requiredConsentSlugs = useMemo(() => {
    const c = publicSettings?.governance?.consent;
    return role === 'supplier' ? c?.supplierRegistrationDocumentSlugs ?? [] : c?.registrationDocumentSlugs ?? [];
  }, [role, publicSettings]);

  const requiredConsentDocs = useMemo(
    () => (publicSettings?.legalDocuments ?? []).filter((d) => requiredConsentSlugs.includes(d.slug)),
    [publicSettings, requiredConsentSlugs],
  );

  const registeredBanner = useMemo(() => {
    if (registered === 'buyer') return 'Buyer account created. Sign in to continue.';
    if (registered === 'supplier') return 'Supplier account created. Sign in to continue.';
    if (registered === 'reset') return 'Password updated. Sign in with your new password.';
    if (registered === 'verification') return 'Account created. Verify your email before signing in.';
    return null;
  }, [registered]);

  function switchMode(next: Mode) {
    setMode(next);
    setSigninError(null);
    setRegError(null);
    if (next === 'signin') setRole(null);
  }

  async function onSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSigninSubmitting(true);
    setSigninError(null);
    try {
      const res = await fetch('/session/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, returnTo }),
      });
      const payload = (await res.json()) as { success?: boolean; error?: string; redirectTo?: string };
      if (!res.ok || !payload.success || !payload.redirectTo) throw new Error(payload.error ?? 'Unable to sign in.');
      window.location.assign(payload.redirectTo);
    } catch (err) {
      setSigninError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSigninSubmitting(false);
    }
  }

  async function onRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!role) return;
    setRegError(null);
    if (form.password !== form.confirmPassword) { setRegError('Passwords do not match.'); return; }
    if (!legalAccepted) { setRegError('You must accept the Terms & Conditions and Privacy Policy to continue.'); return; }
    if (!settingsLoaded) { setRegError('Registration requirements are still loading. Try again in a moment.'); return; }
    setRegSubmitting(true);
    try {
      const res = await fetch(`/api/identity/public/register/${role}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          ...(form.companyName.trim() ? { companyName: form.companyName.trim() } : {}),
          ...(form.country.trim() ? { country: form.country.trim() } : {}),
          consents: requiredConsentDocs.map((d) => ({ documentSlug: d.slug, version: d.version })),
        }),
      });
      if (!res.ok) throw new Error(await readJsonError(res));
      const payload = (await res.json()) as { emailVerificationRequired?: boolean };
      window.location.assign(
        `/signin?registered=${encodeURIComponent(payload.emailVerificationRequired ? 'verification' : role)}&email=${encodeURIComponent(form.email.trim())}&returnTo=${encodeURIComponent(returnTo)}`,
      );
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Unable to complete registration.');
    } finally {
      setRegSubmitting(false);
    }
  }

  const field = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.panel}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={mode === 'signin' ? styles.tabActive : styles.tab}
              onClick={() => switchMode('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={mode === 'register' ? styles.tabActive : styles.tab}
              onClick={() => switchMode('register')}
            >
              Create Account
            </button>
          </div>

          {registeredBanner && <div className={styles.success}>{registeredBanner}</div>}
          {authError(authState) && <div className={styles.error}>{authError(authState)}</div>}

          {mode === 'signin' && (
            <>
              <div>
                <h1 className={styles.title}>Secure access to deals.</h1>
                <p className={styles.copy}>Sign in to continue requests, quotes, checkout, and escrow-backed orders.</p>
              </div>

              {signinError && <div className={styles.error}>{signinError}</div>}

              <form className={styles.form} onSubmit={onSignIn}>
                <label className={styles.fieldWide}>
                  <span>Email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                </label>

                <label className={styles.fieldWide}>
                  <span>Password</span>
                  <div className={styles.passwordWrap}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <button type="button" className={styles.passwordToggle} onClick={() => setShowPassword((v) => !v)}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>

                <div className={styles.actions}>
                  <button type="submit" className={styles.submit} disabled={signinSubmitting}>
                    {signinSubmitting ? 'Signing in…' : 'Sign In'}
                  </button>
                  <Link href={`/forgot-password?returnTo=${encodeURIComponent(returnTo)}`} className={styles.secondary}>
                    Forgot password?
                  </Link>
                </div>
              </form>

              <p className={styles.switchHint}>
                No account?{' '}
                <button type="button" className={styles.switchLink} onClick={() => switchMode('register')}>
                  Create one
                </button>
              </p>
            </>
          )}

          {mode === 'register' && (
            <>
              {!role && (
                <>
                  <div>
                    <h1 className={styles.title}>Create your workspace.</h1>
                    <p className={styles.copy}>Choose the correct role first. Buyer and supplier access is separated for safer deal flow.</p>
                  </div>

                  <div className={styles.roleGrid}>
                    <button type="button" className={styles.roleCard} onClick={() => setRole('buyer')}>
                      <div className={styles.roleIcon}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                        </svg>
                      </div>
                      <div className={styles.roleTitle}>Buyer</div>
                      <div className={styles.roleDesc}>Source products, create RFQs, manage checkout, and track escrow-backed orders.</div>
                      <div className={styles.roleArrow}>Get started →</div>
                    </button>

                    <button type="button" className={styles.roleCard} onClick={() => setRole('supplier')}>
                      <div className={styles.roleIcon}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="1" y="3" width="15" height="13" rx="2"/>
                          <path d="M16 8h4l3 8H16V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                        </svg>
                      </div>
                      <div className={styles.roleTitle}>Supplier</div>
                      <div className={styles.roleDesc}>Answer RFQs, execute deals, manage payouts and payout release.</div>
                      <div className={styles.roleArrow}>Get started →</div>
                    </button>
                  </div>

                  <p className={styles.switchHint}>
                    Already have an account?{' '}
                    <button type="button" className={styles.switchLink} onClick={() => switchMode('signin')}>
                      Sign in
                    </button>
                  </p>
                </>
              )}

              {role && (
                <>
                  <div>
                    <button type="button" className={styles.backBtn} onClick={() => setRole(null)}>
                      ← Change role
                    </button>
                    <h1 className={styles.title}>
                      {role === 'buyer' ? 'Create a buyer account.' : 'Create a supplier account.'}
                    </h1>
                    <p className={styles.copy}>
                      {role === 'buyer'
                        ? 'Set up your buyer workspace for sourcing, RFQs, and escrow-backed orders.'
                        : 'Set up your supplier workspace for RFQ intake, deal execution, and payout operations.'}
                    </p>
                  </div>

                  {regError && <div className={styles.error}>{regError}</div>}
                  {publicSettings?.governance?.emailVerificationRequired && (
                    <div className={styles.notice}>A verification email will be sent. Check your inbox before signing in.</div>
                  )}
                  {publicSettings?.governance?.emailVerificationBlockedReason && (
                    <div className={styles.error}>{publicSettings.governance.emailVerificationBlockedReason}</div>
                  )}

                  <form className={styles.form} onSubmit={onRegister}>
                    <div className={styles.fieldGrid}>
                      <label className={styles.fieldWide}>
                        <span>First name</span>
                        <input type="text" autoComplete="given-name" required {...field('firstName')} />
                      </label>
                      <label className={styles.fieldWide}>
                        <span>Last name</span>
                        <input type="text" autoComplete="family-name" required {...field('lastName')} />
                      </label>
                    </div>

                    <div className={styles.fieldGrid}>
                      <label className={styles.fieldWide}>
                        <span>Email</span>
                        <input type="email" autoComplete="email" required {...field('email')} />
                      </label>
                      <label className={styles.fieldWide}>
                        <span>{role === 'supplier' ? 'Company name' : 'Company name (optional)'}</span>
                        <input type="text" autoComplete="organization" required={role === 'supplier'} {...field('companyName')} />
                      </label>
                    </div>

                    <div className={styles.fieldGrid}>
                      <label className={styles.fieldWide}>
                        <span>Password</span>
                        <div className={styles.passwordWrap}>
                          <input
                            type={showRegPass ? 'text' : 'password'}
                            autoComplete="new-password"
                            minLength={10}
                            required
                            {...field('password')}
                          />
                          <button type="button" className={styles.passwordToggle} onClick={() => setShowRegPass((v) => !v)}>
                            {showRegPass ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </label>
                      <label className={styles.fieldWide}>
                        <span>Confirm password</span>
                        <div className={styles.passwordWrap}>
                          <input
                            type={showRegConfirm ? 'text' : 'password'}
                            autoComplete="new-password"
                            minLength={10}
                            required
                            {...field('confirmPassword')}
                          />
                          <button type="button" className={styles.passwordToggle} onClick={() => setShowRegConfirm((v) => !v)}>
                            {showRegConfirm ? 'Hide' : 'Show'}
                          </button>
                        </div>
                      </label>
                    </div>

                    <label className={styles.fieldWide}>
                      <span>Country</span>
                      <input type="text" autoComplete="country-name" {...field('country')} />
                    </label>

                    <div className={styles.consentCard}>
                      <label className={styles.consentItem}>
                        <input
                          type="checkbox"
                          checked={legalAccepted}
                          onChange={(e) => setLegalAccepted(e.target.checked)}
                        />
                        <span>
                          I agree to the{' '}
                          <Link href="/terms" target="_blank">Terms &amp; Conditions</Link>
                          {' and '}
                          <Link href="/privacy" target="_blank">Privacy Policy</Link>
                          {role === 'supplier' && (
                            <>{' and '}<Link href="/seller-policy" target="_blank">Seller Policy</Link></>
                          )}
                        </span>
                      </label>
                    </div>

                    <div className={styles.actions}>
                      <button type="submit" className={styles.submit} disabled={regSubmitting || !settingsLoaded}>
                        {!settingsLoaded ? 'Loading…' : regSubmitting ? 'Creating account…' : role === 'buyer' ? 'Create buyer account' : 'Create supplier account'}
                      </button>
                    </div>
                  </form>

                  <p className={styles.switchHint}>
                    Already have an account?{' '}
                    <button type="button" className={styles.switchLink} onClick={() => switchMode('signin')}>
                      Sign in
                    </button>
                  </p>
                </>
              )}
            </>
          )}
        </section>

        <aside className={styles.aside}>
          {mode === 'signin' ? (
            <>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Buyer account</div>
                <div className={styles.cardCopy}>Returns to requests, checkout, escrow orders, and payment history.</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Supplier account</div>
                <div className={styles.cardCopy}>Returns to RFQ inbox, active deals, shipments, and payout release readiness.</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Recovery</div>
                <div className={styles.cardCopy}>Use Forgot password to reset via email. If SMTP is unavailable the page says so explicitly.</div>
              </div>
            </>
          ) : role === 'buyer' ? (
            <>
              <div className={styles.card}>
                <div className={styles.cardTitle}>What opens next</div>
                <div className={styles.cardCopy}>Dashboard → requests, checkout, escrow-backed payments, and order follow-up.</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Password rule</div>
                <div className={styles.cardCopy}>Minimum 10 characters. Stored as a secure hash — never in plaintext.</div>
              </div>
            </>
          ) : role === 'supplier' ? (
            <>
              <div className={styles.card}>
                <div className={styles.cardTitle}>What opens next</div>
                <div className={styles.cardCopy}>RFQ inbox → deal execution → shipment follow-up → payout release.</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Company name</div>
                <div className={styles.cardCopy}>Required for suppliers. Used in RFQ responses, deal contracts, and payout statements.</div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Buyer</div>
                <div className={styles.cardCopy}>For companies sourcing products, creating RFQs, and tracking escrow-backed deals.</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardTitle}>Supplier</div>
                <div className={styles.cardCopy}>For manufacturers and distributors responding to inbound demand and managing payouts.</div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
