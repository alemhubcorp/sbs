'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { payoutStatusLabel } from './finance-utils';
import styles from './core-flow.module.css';

type SellerProfile = {
  id: string;
  displayName: string;
  companyName?: string | null;
  payoutBeneficiaryName?: string | null;
  payoutCompanyName?: string | null;
  payoutBankName?: string | null;
  payoutAccountNumber?: string | null;
  payoutIban?: string | null;
  payoutSwiftBic?: string | null;
  payoutStatus?: string | null;
  payoutReviewNote?: string | null;
};

export function SupplierPayoutSettingsBoard() {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    payoutBeneficiaryName: '',
    payoutCompanyName: '',
    payoutBankName: '',
    payoutAccountNumber: '',
    payoutIban: '',
    payoutSwiftBic: ''
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/catalog/seller-profiles/me', { cache: 'no-store' });

        if (!response.ok) {
          if (response.status === 404) {
            if (!cancelled) {
              setProfile(null);
            }
            return;
          }

          throw new Error(`Unable to load payout profile (${response.status}).`);
        }

        const data = (await response.json()) as SellerProfile;
        if (!cancelled) {
          setProfile(data);
          setForm({
            payoutBeneficiaryName: data.payoutBeneficiaryName ?? data.companyName ?? data.displayName ?? '',
            payoutCompanyName: data.payoutCompanyName ?? data.companyName ?? data.displayName ?? '',
            payoutBankName: data.payoutBankName ?? '',
            payoutAccountNumber: data.payoutAccountNumber ?? '',
            payoutIban: data.payoutIban ?? '',
            payoutSwiftBic: data.payoutSwiftBic ?? ''
          });
        }
      } catch (failure) {
        if (!cancelled) {
          setError(failure instanceof Error ? failure.message : 'Unable to load payout profile.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/catalog/seller-profiles/me/payout-settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form)
      });

      const text = await response.text();
      let data: SellerProfile | null = null;

      try {
        data = text ? (JSON.parse(text) as SellerProfile) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(typeof data === 'object' && data && 'message' in data ? String((data as { message: string }).message) : `Save failed (${response.status}).`);
      }

      setProfile(data);
      setSuccess('Payout settings saved and sent for review.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to save payout settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.emptyState}>Loading payout settings...</div>;
  }

  if (error && !profile) {
    return (
      <div className={styles.errorBox}>
        <div>{error}</div>
        <div style={{ marginTop: 8 }}>If you do not have a supplier profile yet, complete onboarding first.</div>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>Supplier payout profile</div>
            <div className={styles.muted}>Editable payout details used in release and invoice flows.</div>
          </div>
          <div className={styles.buttonRow}>
            <Link href="/supplier/payouts" className={styles.buttonSecondary}>
              Payouts
            </Link>
            <button type="button" className={styles.button} disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>

        <div className={styles.inlineMeta}>
          <span>Profile: {profile?.displayName ?? 'n/a'}</span>
          <span>Status: {payoutStatusLabel(profile?.payoutStatus ?? 'unverified')}</span>
        </div>

        {error ? <div className={styles.errorBox} style={{ marginTop: 12 }}>{error}</div> : null}
        {success ? <div className={styles.successBox} style={{ marginTop: 12 }}>{success}</div> : null}

        <div className={styles.fieldGrid} style={{ marginTop: 16 }}>
          <label className={styles.field}>
            <span style={{ fontWeight: 700 }}>Beneficiary name</span>
            <input value={form.payoutBeneficiaryName} onChange={(event) => setForm((current) => ({ ...current, payoutBeneficiaryName: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span style={{ fontWeight: 700 }}>Company name</span>
            <input value={form.payoutCompanyName} onChange={(event) => setForm((current) => ({ ...current, payoutCompanyName: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span style={{ fontWeight: 700 }}>Bank name</span>
            <input value={form.payoutBankName} onChange={(event) => setForm((current) => ({ ...current, payoutBankName: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span style={{ fontWeight: 700 }}>Account number</span>
            <input value={form.payoutAccountNumber} onChange={(event) => setForm((current) => ({ ...current, payoutAccountNumber: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span style={{ fontWeight: 700 }}>IBAN</span>
            <input value={form.payoutIban} onChange={(event) => setForm((current) => ({ ...current, payoutIban: event.target.value }))} />
          </label>
          <label className={styles.field}>
            <span style={{ fontWeight: 700 }}>SWIFT / BIC</span>
            <input value={form.payoutSwiftBic} onChange={(event) => setForm((current) => ({ ...current, payoutSwiftBic: event.target.value }))} />
          </label>
        </div>
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.sectionTitle}>Review note</div>
        <div className={styles.subtle}>{profile?.payoutReviewNote ?? 'Saved settings move to pending review until they are approved by the platform.'}</div>
      </div>
    </div>
  );
}
