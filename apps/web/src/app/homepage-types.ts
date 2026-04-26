import type { ReactNode } from 'react';

export type Product = {
  id: string;
  name: string;
  slug: string;
  status: string;
  targetMarket: string;
  description?: string | null;
  prices?: Array<{ amountMinor: number; currency: string }>;
  category?: { name?: string | null };
  sellerProfile?: { displayName?: string | null };
};

export type Card = {
  id: string;
  title: string;
  category: string;
  origin: string;
  moq: string;
  price: string;
  badge: string;
  badgeTone: 'red' | 'amber' | 'blue' | 'teal';
  image: string;
  live?: boolean;
  productId?: string;
  sellerName?: string;
  description?: string;
};

export type FooterColumn = {
  title: string;
  items: Array<readonly [label: string, href: string]>;
};

export type Step = {
  num: string;
  title: string;
  body: string;
};

export type Feature = {
  icon: ReactNode;
  title: string;
  body: string;
};

export type WhyCheck = {
  title: string;
  body: string;
};

export type Testimonial = {
  initials: string;
  name: string;
  role: string;
  accent: string;
  text: string;
};
