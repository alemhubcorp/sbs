import fs from 'node:fs';
import path from 'node:path';
import type { PublicPlatformSettings } from './platform-public-settings';
import { HomeShellControls } from './home-shell-controls';
import styles from './marketplace-home.module.css';

function readTemplate() {
  const templatePaths = [
    path.join(process.cwd(), 'public/safe-contract-template.html'),
    path.join(process.cwd(), 'safe-contract-template.html'),
    path.join(process.cwd(), '../../safe-contract-template.html'),
    path.join(process.cwd(), '../../apps/web/public/safe-contract-template.html')
  ];
  const templatePath = templatePaths.find((candidate) => fs.existsSync(candidate));
  if (!templatePath) {
    throw new Error('safe-contract-template.html not found');
  }

  const html = fs.readFileSync(templatePath, 'utf8');
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
  const bodyStart = html.toLowerCase().indexOf('<body>');
  const htmlEnd = html.toLowerCase().lastIndexOf('</html>');

  const style = styleMatch?.[1] ?? '';
  const body =
    bodyStart === -1
      ? ''
      : html.slice(bodyStart + '<body>'.length, htmlEnd === -1 ? undefined : htmlEnd);

  const hrefReplacements: Array<[RegExp, string]> = [
    // Nav logo and links
    [/<a href="#" class="logo">/g, '<a href="/" class="logo">'],
    [/<a href="#">Products<\/a>/g, '<a href="/products">Products</a>'],
    [/<a href="#">Vendors<\/a>/g, '<a href="/vendors">Vendors</a>'],
    [/<a href="#">Categories<\/a>/g, '<a href="/categories">Categories</a>'],
    [/<a href="#">Logistics<\/a>/g, '<a href="/logistics">Logistics</a>'],
    [/<a href="#">Pricing<\/a>/g, '<a href="/pricing">Pricing</a>'],
    // Hero CTA buttons
    [/<a href="#" class="btn-primary">Explore Products →<\/a>/g, '<a href="/products" class="btn-primary">Explore Products →</a>'],
    [/<a href="#" class="btn-secondary">Become a Vendor<\/a>/g, '<a href="/register/supplier" class="btn-secondary">Become a Vendor</a>'],
    // Section view-all links
    [/<a href="#" class="view-all">All B2B listings →<\/a>/g, '<a href="/products?market=wholesale" class="view-all">All B2B listings →</a>'],
    [/<a href="#">All B2B listings →<\/a>/g, '<a href="/products?market=wholesale" class="view-all">All B2B listings →</a>'],
    [/<a href="#" class="view-all">All B2C listings →<\/a>/g, '<a href="/products?market=retail" class="view-all">All B2C listings →</a>'],
    [/<a href="#">All B2C listings →<\/a>/g, '<a href="/products?market=retail" class="view-all">All B2C listings →</a>'],
    // Product cards - all point to catalog
    [/<a href="#" class="card" style="position:relative">/g, '<a href="/products" class="card" style="position:relative">'],
    [/<a href="#" class="card">/g, '<a href="/products" class="card">'],
    // CTA section buttons
    [/<a href="#" class="btn-teal">Become a Vendor →<\/a>/g, '<a href="/register/supplier" class="btn-teal">Become a Vendor →</a>'],
    [/<a href="#" class="btn-ghost">Book a Demo<\/a>/g, '<a href="/contact" class="btn-ghost">Contact Us</a>'],
    // Footer logo branding fix
    [/<a href="#" class="logo"><div class="logo-box">SC<\/div>Safe-Contract<\/a>/g, '<a href="/" class="logo"><div class="logo-box">A</div>Alemhub</a>'],
    // Footer contact links
    [/<a href="#">✉ <span class="__cf_email__"[^<]*<\/span><\/a>/g, '<a href="mailto:support@alemhub.sbs">✉ <span>support@alemhub.sbs</span></a>'],
    [/<a href="#">📞[^<]*<\/a>/g, '<a href="tel:+17372370456">📞 +1 737 237 0456</a>'],
    [/<a href="#">📍[^<]*<\/a>/g, '<span>📍 USA · Kazakhstan · AIFC</span>'],
    // Footer marketplace links
    [/<a href="#">All Products<\/a>/g, '<a href="/products">All Products</a>'],
    [/<a href="#">Auctions<\/a>/g, '<a href="/auctions">Auctions</a>'],
    [/<a href="#">Pre-orders<\/a>/g, '<a href="/preorders">Pre-orders</a>'],
    // Footer support links
    [/<a href="#">Help Center<\/a>/g, '<a href="/help-center">Help Center</a>'],
    [/<a href="#">Shipping Info<\/a>/g, '<a href="/shipping">Shipping Info</a>'],
    [/<a href="#">Returns<\/a>/g, '<a href="/returns">Returns</a>'],
    [/<a href="#">Contact Us<\/a>/g, '<a href="/contact">Contact Us</a>'],
    [/<a href="#">About Us<\/a>/g, '<a href="/about">About Us</a>'],
    // Footer account links
    [/<a href="#">Sign In<\/a>/g, '<a href="/signin">Sign In</a>'],
    [/<a href="#">Register<\/a>/g, '<a href="/register">Register</a>'],
    [/<a href="#">Order History<\/a>/g, '<a href="/orders">Order History</a>'],
    [/<a href="#">Track Order<\/a>/g, '<a href="/track-order">Track Order</a>'],
    [/<a href="#">Wishlist<\/a>/g, '<a href="/wishlist">Wishlist</a>'],
    // Footer legal links
    [/<a href="#">Privacy Policy<\/a>/g, '<a href="/privacy">Privacy Policy</a>'],
    [/<a href="#">T(?=erms)/g, '<a href="/terms">T']
  ];

  let normalizedBody = body;
  for (const [pattern, replacement] of hrefReplacements) {
    normalizedBody = normalizedBody.replace(pattern, replacement);
  }
  normalizedBody = normalizedBody.replace(/<!-- NAV -->\s*<nav class="nav">[\s\S]*?<\/nav>/, '');

  const normalizedStyle = `${style.replace(/body\{/g, `.${styles.templatePage}{`)}
.${styles.templatePage}{width:100%;max-width:100vw;overflow-x:hidden}
.${styles.templatePage} img{max-width:100%;height:auto}
@media(max-width:760px){
  .${styles.templatePage}{font-size:16px}
  .${styles.templatePage} .hero,
  .${styles.templatePage} .section,
  .${styles.templatePage} .prod-section,
  .${styles.templatePage} .feat-section,
  .${styles.templatePage} .testi-section,
  .${styles.templatePage} .cta,
  .${styles.templatePage} footer{padding-left:20px;padding-right:20px}
  .${styles.templatePage} .hero{padding-top:42px;padding-bottom:38px}
  .${styles.templatePage} .hero h1{font-size:clamp(2.35rem,13vw,3.1rem);max-width:100%}
  .${styles.templatePage} .hero-sub{max-width:100%}
  .${styles.templatePage} .hero-btns,
  .${styles.templatePage} .cta-btns{display:grid;grid-template-columns:1fr;gap:10px}
  .${styles.templatePage} .btn-primary,
  .${styles.templatePage} .btn-secondary,
  .${styles.templatePage} .btn-teal,
  .${styles.templatePage} .btn-ghost{justify-content:center;width:100%;text-align:center}
  .${styles.templatePage} .trust-strip{display:grid;grid-template-columns:1fr;gap:12px}
  .${styles.templatePage} .stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .${styles.templatePage} .stat{padding:18px 20px}
  .${styles.templatePage} .steps{display:grid;grid-template-columns:1fr}
  .${styles.templatePage} .step{border-right:none;border-bottom:1px solid #e5e7eb}
  .${styles.templatePage} .step:last-child{border-bottom:none}
  .${styles.templatePage} .prod-row-head{align-items:flex-start;gap:12px;flex-direction:column}
  .${styles.templatePage} .pgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
  .${styles.templatePage} .card-img{height:122px}
  .${styles.templatePage} .feat-grid{grid-template-columns:1fr}
  .${styles.templatePage} .why-section{padding-left:20px;padding-right:20px}
  .${styles.templatePage} .footer-grid{grid-template-columns:1fr 1fr;gap:26px}
}
@media(max-width:420px){
  .${styles.templatePage} .pgrid{grid-template-columns:1fr}
  .${styles.templatePage} .stats{grid-template-columns:1fr}
  .${styles.templatePage} .footer-grid{grid-template-columns:1fr}
}`;

  return { style: normalizedStyle, body: normalizedBody };
}

function injectProductSlugs(body: string, products: Array<{ slug: string }>) {
  let idx = 0;
  return body.replace(/<a href="\/products" class="card"([^>]*)>/g, (_match, rest: string) => {
    const product = products[idx++];
    const href = product ? `/products/${product.slug}` : '/products';
    return `<a href="${href}" class="card"${rest}>`;
  });
}

export function MarketplaceHome({
  healthStatus: _healthStatus,
  products,
  publicSettings: _publicSettings
}: {
  healthStatus: string;
  products: Array<{ slug: string; name: string }>;
  publicSettings: PublicPlatformSettings | null;
}) {
  const template = readTemplate();
  const body = injectProductSlugs(template.body, products);

  return (
    <main className={styles.page}>
      <HomeShellControls />
      <style dangerouslySetInnerHTML={{ __html: template.style }} />
      <div className={styles.templatePage} dangerouslySetInnerHTML={{ __html: body }} />
    </main>
  );
}
