const kc = process.env.KEYCLOAK_INTERNAL_URL ?? 'http://keycloak:8080/auth';
const realm = process.env.KEYCLOAK_REALM ?? 'ruflo';
const adminUser = process.env.KEYCLOAK_ADMIN_USER ?? 'admin';
const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD ?? 'admin';

const localVariants = (url) => {
  const u = new URL(url);
  const port = u.port || (u.pathname.startsWith('/admin') ? '3002' : '') || (url.includes(':3002') ? '3002' : url.includes(':3001') ? '3001' : '3001');
  if (!/^(localhost|127\.0\.0\.1)$/i.test(u.hostname) || !port) return [];
  const pathSuffix = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
  return [`http://localhost:${port}${pathSuffix}`, `http://127.0.0.1:${port}${pathSuffix}`];
};

const allowed = (url) => {
  const out = new Set([url, `${url}/auth/callback`, `${url}/*`]);
  for (const variant of localVariants(url)) {
    out.add(variant);
    out.add(`${variant}/auth/callback`);
    out.add(`${variant}/*`);
  }
  return [...out];
};

const tokenRes = await fetch(`${kc}/realms/master/protocol/openid-connect/token`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: adminUser,
    password: adminPassword
  })
});
if (!tokenRes.ok) throw new Error(`token:${tokenRes.status}`);
const { access_token } = await tokenRes.json();

async function updateClient(clientId, appUrl) {
  const headers = { authorization: `Bearer ${access_token}`, 'content-type': 'application/json' };
  const listRes = await fetch(`${kc}/admin/realms/${realm}/clients?clientId=${encodeURIComponent(clientId)}`, { headers });
  if (!listRes.ok) throw new Error(`list:${clientId}:${listRes.status}`);
  const list = await listRes.json();
  const client = list[0];
  if (!client?.id) throw new Error(`missing:${clientId}`);
  const origin = new URL(appUrl).origin;
  const payload = { ...client, redirectUris: allowed(appUrl), webOrigins: [origin, ...localVariants(appUrl).map((value) => new URL(value).origin)] };
  const putRes = await fetch(`${kc}/admin/realms/${realm}/clients/${client.id}`, { method: 'PUT', headers, body: JSON.stringify(payload) });
  if (!putRes.ok) throw new Error(`update:${clientId}:${putRes.status}`);
  return { clientId, id: client.id, redirectUris: payload.redirectUris, webOrigins: payload.webOrigins };
}

console.log(JSON.stringify({
  admin: await updateClient('ruflo-admin-ui', process.env.ADMIN_URL ?? process.env.ADMIN_APP_URL ?? 'http://localhost:3002'),
  web: await updateClient('ruflo-web-ui', process.env.WEB_URL ?? process.env.WEB_APP_URL ?? 'http://localhost:3001')
}, null, 2));
