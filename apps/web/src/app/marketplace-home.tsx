import fs from 'node:fs';
import path from 'node:path';
import type { PublicPlatformSettings } from './platform-public-settings';
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
  normalizedBody = normalizedBody.replace(
    '<div class="nav-links">',
    '<button type="button" class="mobile-menu-toggle" aria-controls="home-mobile-nav" aria-expanded="false">Menu</button><div class="nav-links" id="home-mobile-nav">'
  );
  normalizedBody = normalizedBody.replace(
    '</nav>',
    '<button type="button" class="mobile-menu-close" aria-label="Close menu">Close</button></nav>'
  );
  normalizedBody = normalizedBody
    .replace(
      '<span class="nav-pill">🌐 USD</span>',
      '<label class="nav-pill nav-select-pill" aria-label="Currency">🌐 <select data-pref-key="alemhub_currency"><option value="USD">USD</option><option value="EUR">EUR</option><option value="KZT">KZT</option></select></label>'
    )
    .replace(
      '<span class="nav-pill">EN</span>',
      '<label class="nav-pill nav-select-pill" aria-label="Language"><select data-pref-key="alemhub_language"><option value="EN">EN</option><option value="RU">RU</option><option value="KK">KK</option></select></label>'
    )
    .replace('<span class="nav-pill">🛒</span>', '<a href="/notifications" class="nav-pill" aria-label="Notifications">🔔</a>');

  const normalizedStyle = `${style.replace(/body\{/g, `.${styles.templatePage}{`)}
.${styles.templatePage}{width:100%;max-width:100vw;overflow-x:hidden}
.${styles.templatePage} img{max-width:100%;height:auto}
.${styles.templatePage} .mobile-menu-toggle,
.${styles.templatePage} .mobile-menu-close{display:none}
.${styles.templatePage} .nav-select-pill{display:inline-flex;align-items:center;gap:4px}
.${styles.templatePage} .nav-select-pill select{border:0;background:transparent;color:inherit;font:inherit;font-weight:700;outline:0}
.${styles.templatePage} .btn-dark,
.${styles.templatePage} .btn-primary,
.${styles.templatePage} .btn-teal{color:#fff !important}
.${styles.templatePage} .btn-dark:visited,
.${styles.templatePage} .btn-primary:visited,
.${styles.templatePage} .btn-teal:visited{color:#fff !important}
@media(max-width:760px){
  .${styles.templatePage} .nav{padding:0 14px;height:56px;gap:8px}
  .${styles.templatePage} .logo{font-size:.82rem}
  .${styles.templatePage} .logo-box{width:26px;height:26px}
  .${styles.templatePage} .search-box,
  .${styles.templatePage} .btn-dark{display:none}
  .${styles.templatePage} .nav-r{gap:5px;margin-left:auto}
  .${styles.templatePage} .nav-pill{padding:5px 8px;font-size:.72rem}
  .${styles.templatePage} .mobile-menu-toggle{display:inline-flex;align-items:center;justify-content:center;background:#0d1f3c;color:#fff;border-radius:7px;padding:6px 10px;font-size:.72rem;font-weight:700}
  .${styles.templatePage} .nav-links{position:absolute;top:56px;left:0;right:0;z-index:120;display:none;background:#fff;border-bottom:1px solid #e5e7eb;padding:10px 14px;box-shadow:0 18px 38px rgba(13,31,60,.12)}
  .${styles.templatePage} .nav-links a{display:block;padding:11px 8px;border-radius:8px;color:#0d1f3c;font-weight:700}
  .${styles.templatePage}.mobile-nav-open .nav-links{display:block}
  .${styles.templatePage}.mobile-nav-open .mobile-menu-close{display:inline-flex;position:absolute;top:9px;right:14px;z-index:130;background:#fff;border:1px solid #e5e7eb;border-radius:7px;padding:6px 10px;color:#0d1f3c;font-size:.72rem;font-weight:700}
  .${styles.templatePage} .hero,
  .${styles.templatePage} .section,
  .${styles.templatePage} .prod-section,
  .${styles.templatePage} .feat-section,
  .${styles.templatePage} .testi-section,
  .${styles.templatePage} .cta,
  .${styles.templatePage} footer{padding-left:18px;padding-right:18px}
  .${styles.templatePage} .hero{padding-top:40px;padding-bottom:40px}
  .${styles.templatePage} .hero h1{font-size:clamp(2.35rem,12vw,3rem);max-width:100%}
  .${styles.templatePage} .hero-sub{max-width:100%}
  .${styles.templatePage} .hero-btns,
  .${styles.templatePage} .cta-btns{display:grid;grid-template-columns:1fr;gap:10px}
  .${styles.templatePage} .btn-primary,
  .${styles.templatePage} .btn-secondary,
  .${styles.templatePage} .btn-teal,
  .${styles.templatePage} .btn-ghost{justify-content:center;width:100%;text-align:center}
  .${styles.templatePage} .trust-strip{display:grid;grid-template-columns:1fr;gap:12px}
  .${styles.templatePage} .stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .${styles.templatePage} .stat{padding:18px}
  .${styles.templatePage} .steps{display:grid;grid-template-columns:1fr}
  .${styles.templatePage} .step{border-right:none;border-bottom:1px solid #e5e7eb}
  .${styles.templatePage} .step:last-child{border-bottom:none}
  .${styles.templatePage} .prod-row-head{align-items:flex-start;gap:12px;flex-direction:column}
  .${styles.templatePage} .pgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .${styles.templatePage} .card{border-radius:9px}
  .${styles.templatePage} .card-img{height:104px}
  .${styles.templatePage} .card-body{padding:8px;gap:3px}
  .${styles.templatePage} .card-cat{font-size:.52rem}
  .${styles.templatePage} .card-name{font-size:.68rem;line-height:1.25}
  .${styles.templatePage} .card-origin,
  .${styles.templatePage} .card-moq{font-size:.56rem}
  .${styles.templatePage} .card-footer{padding-top:6px;align-items:flex-start;gap:5px;flex-direction:column}
  .${styles.templatePage} .card-price{font-size:.76rem}
  .${styles.templatePage} .card-escrow{font-size:.52rem}
  .${styles.templatePage} .feat-grid{grid-template-columns:1fr}
  .${styles.templatePage} .why-section{padding-left:18px;padding-right:18px}
  .${styles.templatePage} .footer-grid{grid-template-columns:1fr 1fr;gap:26px}
}
@media(max-width:420px){
  .${styles.templatePage} .pgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .${styles.templatePage} .prod-section{padding-left:14px;padding-right:14px}
  .${styles.templatePage} .card-img{height:88px}
  .${styles.templatePage} .card-body{padding:7px}
  .${styles.templatePage} .card-name{font-size:.64rem}
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

function applyBranding(
  body: string,
  publicSettings: PublicPlatformSettings | null
) {
  const branding = publicSettings?.branding;
  if (!branding) {
    return body;
  }

  const siteName = escapeHtml(branding.siteName.trim() || 'Alemhub');
  const logoAlt = escapeHtml(branding.logoAlt.trim() || `${siteName} logo`);
  const markText = escapeHtml(branding.markText.trim() || 'AH');
  const logoUrl = escapeHtml(branding.logoUrl.trim());
  const navLogoBox = branding.logoUrl
    ? `<div class="logo-box"><img src="${logoUrl}" alt="${logoAlt}" style="width:100%;height:100%;object-fit:contain;display:block"></div>`
    : `<div class="logo-box">${markText}</div>`;

  return body
    .replace(/<div class="logo-box">AH<\/div>\s*Alemhub/, `${navLogoBox}${siteName}`)
    .replace(/<div class="logo-box">A<\/div>Alemhub/g, `${navLogoBox}${siteName}`);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function MarketplaceHome({
  healthStatus: _healthStatus,
  products,
  publicSettings
}: {
  healthStatus: string;
  products: Array<{ slug: string; name: string }>;
  publicSettings: PublicPlatformSettings | null;
}) {
  const template = readTemplate();
  const body = applyBranding(injectProductSlugs(template.body, products), publicSettings);

  return (
    <main className={styles.page}>
      <style dangerouslySetInnerHTML={{ __html: template.style }} />
      <script
        dangerouslySetInnerHTML={{
          __html:
            "document.addEventListener('click',function(event){var target=event.target;if(!(target instanceof Element))return;var root=target.closest('[data-home-template]');if(!root)return;if(target.closest('.mobile-menu-toggle')){root.classList.add('mobile-nav-open');return;}if(target.closest('.mobile-menu-close')||target.closest('.nav-links a')){root.classList.remove('mobile-nav-open');}});document.addEventListener('change',function(event){var target=event.target;if(!(target instanceof HTMLSelectElement))return;var key=target.getAttribute('data-pref-key');if(!key)return;try{localStorage.setItem(key,target.value);document.cookie=key+'='+encodeURIComponent(target.value)+'; Path=/; Max-Age=31536000; SameSite=Lax';}catch(error){}});document.addEventListener('DOMContentLoaded',function(){document.querySelectorAll('select[data-pref-key]').forEach(function(select){if(!(select instanceof HTMLSelectElement))return;try{var value=localStorage.getItem(select.getAttribute('data-pref-key')||'');if(value){select.value=value;}}catch(error){}});});"
        }}
      />
      <div className={styles.templatePage} data-home-template dangerouslySetInnerHTML={{ __html: body }} />
    </main>
  );
}
