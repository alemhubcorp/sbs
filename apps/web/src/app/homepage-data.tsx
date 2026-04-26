import type { Card, Feature, FooterColumn, Step, Testimonial, WhyCheck } from './homepage-types';
import { IconChart, IconClock, IconCredit, IconGavel, IconShield, IconTruck } from './homepage-icons';

export const marqueeItems = [
  'Agricultural Products',
  'Precious Metals',
  'Metals & Minerals',
  'Heavy Equipment',
  'Vehicles & Auto Parts',
  'Consumer Electronics',
  'Apparel & Fashion',
  'Food & Beverages',
  'Chemicals & Plastics',
  'Petrochemicals',
  'Industrial Components',
  'Packaging Supply'
];

export const steps: Step[] = [
  { num: '01', title: 'Register & Verify', body: 'Create your account and choose your role. KYB/KYC verification builds counterparty trust.' },
  { num: '02', title: 'Place an Order', body: 'Browse listings, post a purchase request, or negotiate terms directly with the supplier.' },
  { num: '03', title: 'Escrow Payment', body: 'Buyer funds locked in escrow. Seller ships with the guarantee of payment on delivery.' },
  { num: '04', title: 'Confirm & Release', body: 'Buyer confirms receipt. Funds transferred to seller instantly. Deal closed on record.' }
];

export const features: Feature[] = [
  { icon: <IconShield />, title: 'Trade Assurance', body: 'Escrow-protected payments. Funds released only on confirmed delivery.' },
  { icon: <IconGavel />, title: 'Live Auctions', body: 'Real-time competitive bidding for bulk commodities and industrial lots.' },
  { icon: <IconClock />, title: 'Pre-orders', body: 'Commit to future deliveries with full escrow cover from day one.' },
  { icon: <IconTruck />, title: 'Logistics', body: 'Rail, sea and road. Live freight rates, booking and tracking in every deal.' },
  { icon: <IconCredit />, title: 'Installment & Credit', body: '24-month deferred payment and factoring via integrated bank partners.' },
  { icon: <IconChart />, title: 'Analytics', body: 'Seller dashboard with demand data, product metrics and promotional tools.' }
];

export const whyChecks: WhyCheck[] = [
  { title: 'No letters of credit required', body: 'Digital escrow replaces expensive bank procedures — processing in hours, not weeks.' },
  { title: 'Verified counterparties only', body: 'KYB/KYC checks on all business accounts before any money moves.' },
  { title: 'Dispute resolution in 7 days', body: '95% of disputes resolved within 7 business days by our specialists.' },
  { title: 'Registered in USA & Kazakhstan', body: 'Contracts enforceable across multiple legal systems including AIFC.' }
];

export const testimonials: Testimonial[] = [
  {
    initials: 'AK',
    name: 'Aibek Khasanov',
    role: 'Director, Agro Trade KZ',
    accent: 'linear-gradient(135deg,#0b1a33,#0d7a5f)',
    text: 'We exported 500 tons of wheat to the UAE. The escrow system gave our buyer full confidence, and payment arrived within 24 hours of delivery confirmation.'
  },
  {
    initials: 'MR',
    name: 'Mohammed Al-Rashid',
    role: 'Procurement Manager, Dubai',
    accent: 'linear-gradient(135deg,#0d7a5f,#0ea87f)',
    text: 'Importing equipment from China was always risky with wire transfers. Safe-Contract&apos;s escrow removed all the risk — I only released funds after inspecting the shipment.'
  },
  {
    initials: 'SP',
    name: 'Sergei Petrov',
    role: 'CEO, TM Power',
    accent: 'linear-gradient(135deg,#1a4fd8,#3b82f6)',
    text: 'The auction feature helped us sell steel billets at 12% above asking price. Seven bidders competed in real time — results impossible through traditional channels.'
  }
];

export const footerColumns: FooterColumn[] = [
  { title: 'Marketplace', items: [['Products', '/products'], ['Vendors', '/vendors'], ['Categories', '/categories'], ['Wholesale', '/products/wholesale']] },
  { title: 'Operations', items: [['How it works', '/how-it-works'], ['Shipping', '/shipping'], ['Returns', '/returns'], ['Contact', '/contact']] },
  { title: 'Account', items: [['Sign In', '/signin'], ['Register', '/register'], ['Orders', '/orders'], ['Wishlist', '/wishlist']] }
];

export const staticCards: Card[] = [
  {
    id: 'gold',
    title: 'Gold, 24k refined',
    category: 'Metals',
    origin: 'Azerbaijan',
    moq: 'Min: 1 kg',
    price: '$48,500 /unit',
    badge: 'Spot',
    badgeTone: 'red',
    image: 'linear-gradient(135deg,#4a2d08 0%,#b8822a 100%)'
  },
  {
    id: 'steel',
    title: 'Steel billets, export',
    category: 'Metals & Minerals',
    origin: 'Kazakhstan',
    moq: 'Min: 20 MT',
    price: '$680 /MT',
    badge: 'B2B',
    badgeTone: 'blue',
    image: 'linear-gradient(135deg,#0b1a33 0%,#1a4fd8 100%)'
  },
  {
    id: 'laptop',
    title: 'Consumer electronics, bulk',
    category: 'Electronics',
    origin: 'China',
    moq: 'Min: 50 units',
    price: '$1,040 /unit',
    badge: 'B2B',
    badgeTone: 'amber',
    image: 'linear-gradient(135deg,#0a4535 0%,#0d7a5f 100%)'
  },
  {
    id: 'sensor',
    title: 'Industrial IoT sensors',
    category: 'Electronics',
    origin: 'Kazakhstan',
    moq: 'MOQ on request',
    price: '$2,499 /unit',
    badge: 'B2B',
    badgeTone: 'blue',
    image: 'linear-gradient(135deg,#0b1a33 0%,#1a4fd8 100%)'
  },
  {
    id: 'almonds',
    title: 'Almonds, raw premium',
    category: 'Agriculture',
    origin: 'Azerbaijan',
    moq: 'Min: 100 kg',
    price: '$340 /unit',
    badge: 'Group buy',
    badgeTone: 'teal',
    image: 'linear-gradient(135deg,#5c3b10 0%,#b07830 100%)'
  },
  {
    id: 'auto',
    title: 'Vehicle parts inventory',
    category: 'Auto Parts',
    origin: 'UAE',
    moq: 'Min: 10 sets',
    price: '$89 /unit',
    badge: 'Retail',
    badgeTone: 'amber',
    image: 'linear-gradient(135deg,#3a1a48 0%,#9b3878 100%)'
  }
];
