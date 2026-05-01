'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './route-shell.module.css';

export type ShellNavLink = {
  label: string;
  href: string;
};

type RouteShellControlsProps = {
  navLinks: ShellNavLink[];
  accountItems: ShellNavLink[];
  isAuthenticated: boolean;
  roleLabel: string | null;
};

const currencyOptions = ['USD', 'EUR', 'KZT'] as const;
const languageOptions = ['EN', 'RU', 'KK'] as const;
const currencyKey = 'alemhub_currency';
const languageKey = 'alemhub_language';
const cookieMaxAge = 60 * 60 * 24 * 365;

function persistPreference(name: string, value: string) {
  window.localStorage.setItem(name, value);
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${cookieMaxAge}; SameSite=Lax`;
}

export function RouteShellControls({ navLinks, accountItems, isAuthenticated, roleLabel }: RouteShellControlsProps) {
  const [currency, setCurrency] = useState<(typeof currencyOptions)[number]>('USD');
  const [language, setLanguage] = useState<(typeof languageOptions)[number]>('EN');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const savedCurrency = window.localStorage.getItem(currencyKey);
    const savedLanguage = window.localStorage.getItem(languageKey);

    if (currencyOptions.includes(savedCurrency as (typeof currencyOptions)[number])) {
      setCurrency(savedCurrency as (typeof currencyOptions)[number]);
    }

    if (languageOptions.includes(savedLanguage as (typeof languageOptions)[number])) {
      setLanguage(savedLanguage as (typeof languageOptions)[number]);
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle(styles.menuLocked, isMenuOpen);

    return () => {
      document.body.classList.remove(styles.menuLocked);
    };
  }, [isMenuOpen]);

  const handleCurrencyChange = (value: (typeof currencyOptions)[number]) => {
    setCurrency(value);
    persistPreference(currencyKey, value);
    window.dispatchEvent(new CustomEvent('alemhub:preferences', { detail: { currency: value, language } }));
  };

  const handleLanguageChange = (value: (typeof languageOptions)[number]) => {
    setLanguage(value);
    persistPreference(languageKey, value);
    window.dispatchEvent(new CustomEvent('alemhub:preferences', { detail: { currency, language: value } }));
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <div className={styles.desktopActions}>
        <Link href="/notifications" className={styles.navPill} aria-label="Notifications">
          Alerts
        </Link>
        <label className={styles.controlPill}>
          <span>Currency</span>
          <select
            aria-label="Currency"
            value={currency}
            onChange={(event) => handleCurrencyChange(event.target.value as (typeof currencyOptions)[number])}
          >
            {currencyOptions.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.controlPill}>
          <span>Language</span>
          <select
            aria-label="Language"
            value={language}
            onChange={(event) => handleLanguageChange(event.target.value as (typeof languageOptions)[number])}
          >
            {languageOptions.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        {roleLabel ? <span className={styles.navPill}>{roleLabel}</span> : null}
        {isAuthenticated ? (
          <>
            <Link href="/dashboard" className={styles.btnLight}>
              Dashboard
            </Link>
            <form action="/logout" method="post">
              <button type="submit" className={styles.btnDark}>
                Logout
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/signin" className={styles.btnDark}>
              Sign In
            </Link>
            <Link href="/register" className={styles.btnLight}>
              Register
            </Link>
          </>
        )}
      </div>

      <button
        type="button"
        className={styles.mobileMenuButton}
        aria-expanded={isMenuOpen}
        aria-controls="marketplace-mobile-menu"
        onClick={() => setIsMenuOpen(true)}
      >
        Menu
      </button>

      <button
        type="button"
        className={`${styles.mobileBackdrop} ${isMenuOpen ? styles.mobileBackdropOpen : ''}`}
        aria-label="Close menu"
        onClick={closeMenu}
      />

      <aside
        id="marketplace-mobile-menu"
        className={`${styles.mobileDrawer} ${isMenuOpen ? styles.mobileDrawerOpen : ''}`}
        aria-hidden={!isMenuOpen}
      >
        <div className={styles.mobileDrawerHeader}>
          <div>
            <p className={styles.mobileDrawerEyebrow}>{roleLabel ?? 'Marketplace'}</p>
            <strong>Alemhub</strong>
          </div>
          <button type="button" className={styles.mobileCloseButton} onClick={closeMenu}>
            Close
          </button>
        </div>

        <div className={styles.mobileUtilityGrid}>
          <label className={styles.mobileSelect}>
            Currency
            <select
              value={currency}
              onChange={(event) => handleCurrencyChange(event.target.value as (typeof currencyOptions)[number])}
            >
              {currencyOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.mobileSelect}>
            Language
            <select
              value={language}
              onChange={(event) => handleLanguageChange(event.target.value as (typeof languageOptions)[number])}
            >
              {languageOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.mobileNavGroup}>
          <p>Main navigation</p>
          <div className={styles.mobileNavList}>
            {navLinks.map((link) => (
              <Link href={link.href} key={link.href} onClick={closeMenu}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.mobileNavGroup}>
          <p>Account</p>
          <div className={styles.mobileNavList}>
            {accountItems.map((link) => (
              <Link href={link.href} key={link.href} onClick={closeMenu}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.mobileAuthActions}>
          {isAuthenticated ? (
            <form action="/logout" method="post">
              <button type="submit" className={styles.btnDark}>
                Logout
              </button>
            </form>
          ) : (
            <>
              <Link href="/signin" className={styles.btnDark} onClick={closeMenu}>
                Sign In
              </Link>
              <Link href="/register" className={styles.btnLight} onClick={closeMenu}>
                Register
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
