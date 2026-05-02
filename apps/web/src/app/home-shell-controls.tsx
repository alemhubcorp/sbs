'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from './marketplace-home.module.css';

const currencyOptions = ['USD', 'EUR', 'KZT'] as const;
const languageOptions = ['EN', 'RU', 'KK'] as const;
const currencyKey = 'alemhub_currency';
const languageKey = 'alemhub_language';
const cookieMaxAge = 60 * 60 * 24 * 365;

const navLinks = [
  { label: 'Products', href: '/products' },
  { label: 'Vendors', href: '/vendors' },
  { label: 'Categories', href: '/categories' },
  { label: 'Logistics', href: '/logistics' },
  { label: 'Pricing', href: '/pricing' }
];

function persistPreference(name: string, value: string) {
  window.localStorage.setItem(name, value);
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${cookieMaxAge}; SameSite=Lax`;
}

export function HomeShellControls() {
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
    const previousOverflow = document.body.style.overflow;

    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = previousOverflow;
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
    <header className={styles.homeHeader}>
      <Link href="/" className={styles.homeLogo}>
        <span className={styles.homeLogoMark}>AH</span>
        <strong>Alemhub</strong>
      </Link>

      <nav className={styles.homeNav} aria-label="Primary navigation">
        {navLinks.map((link) => (
          <Link href={link.href} key={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className={styles.homeActions}>
        <Link href="/products" className={styles.homeIconButton} aria-label="Search products">
          Search
        </Link>
        <label className={styles.homeSelectPill}>
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
        <label className={styles.homeSelectPill}>
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
        <Link href="/cart" className={styles.homeIconButton} aria-label="Cart">
          Cart
        </Link>
        <button type="button" className={styles.homeMenuButton} aria-expanded={isMenuOpen} onClick={() => setIsMenuOpen(true)}>
          Menu
        </button>
      </div>

      <button
        type="button"
        className={`${styles.homeMenuBackdrop} ${isMenuOpen ? styles.homeMenuBackdropOpen : ''}`}
        aria-label="Close menu"
        onClick={closeMenu}
      />

      <aside className={`${styles.homeDrawer} ${isMenuOpen ? styles.homeDrawerOpen : ''}`} aria-hidden={!isMenuOpen}>
        <div className={styles.homeDrawerHeader}>
          <div>
            <span>Marketplace</span>
            <strong>Alemhub</strong>
          </div>
          <button type="button" onClick={closeMenu}>
            Close
          </button>
        </div>

        <div className={styles.homeDrawerControls}>
          <label>
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
          <label>
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

        <div className={styles.homeDrawerLinks}>
          {navLinks.map((link) => (
            <Link href={link.href} key={link.href} onClick={closeMenu}>
              {link.label}
            </Link>
          ))}
          <Link href="/signin" onClick={closeMenu}>
            Sign In
          </Link>
          <Link href="/register/supplier" onClick={closeMenu}>
            Become a Vendor
          </Link>
          <Link href="/wishlist" onClick={closeMenu}>
            Wishlist
          </Link>
        </div>
      </aside>
    </header>
  );
}
