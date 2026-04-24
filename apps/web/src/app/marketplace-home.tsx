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
    [/<a href="#" class="logo">/g, '<a href="/" class="logo">'],
    [/<a href="#">Products<\/a>/g, '<a href="/products">Products</a>'],
    [/<a href="#">Vendors<\/a>/g, '<a href="/vendors">Vendors</a>'],
    [/<a href="#">Categories<\/a>/g, '<a href="/categories">Categories</a>'],
    [/<a href="#">Logistics<\/a>/g, '<a href="/logistics">Logistics</a>'],
    [/<a href="#">Pricing<\/a>/g, '<a href="/pricing">Pricing</a>'],
    [/<a href="#" class="btn-primary">Explore Products →<\/a>/g, '<a href="/products" class="btn-primary">Explore Products →</a>'],
    [
      /<a href="#" class="btn-secondary">Become a Vendor<\/a>/g,
      '<a href="/register?role=supplier" class="btn-secondary">Become a Vendor</a>'
    ],
    [/<a href="#">All B2B listings →<\/a>/g, '<a href="/products" class="view-all">All B2B listings →</a>'],
    [/<a href="#">All Products<\/a>/g, '<a href="/products">All Products</a>'],
    [/<a href="#">Vendors<\/a>/g, '<a href="/vendors">Vendors</a>'],
    [/<a href="#">Categories<\/a>/g, '<a href="/categories">Categories</a>'],
    [/<a href="#">Sign In<\/a>/g, '<a href="/signin">Sign In</a>'],
    [/<a href="#">Register<\/a>/g, '<a href="/register">Register</a>']
  ];

  let normalizedBody = body;
  for (const [pattern, replacement] of hrefReplacements) {
    normalizedBody = normalizedBody.replace(pattern, replacement);
  }

  const normalizedStyle = style.replace(/body\{/g, `.${styles.templatePage}{`);

  return { style: normalizedStyle, body: normalizedBody };
}

export function MarketplaceHome({
  healthStatus: _healthStatus,
  products: _products,
  publicSettings: _publicSettings
}: {
  healthStatus: string;
  products: unknown[];
  publicSettings: PublicPlatformSettings | null;
}) {
  const template = readTemplate();

  return (
    <main className={styles.page}>
      <div className={styles.templateMarker}>FINAL DESIGN APPLIED</div>
      <style dangerouslySetInnerHTML={{ __html: template.style }} />
      <div className={styles.templatePage} dangerouslySetInnerHTML={{ __html: template.body }} />
    </main>
  );
}
