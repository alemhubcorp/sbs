import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const cookieNames = {
  accessToken: 'ruflo_web_access_token',
  refreshToken: 'ruflo_web_refresh_token',
  idToken: 'ruflo_web_id_token',
  expiresAt: 'ruflo_web_expires_at',
  state: 'ruflo_web_oauth_state',
  returnTo: 'ruflo_web_return_to'
} as const;

const refreshThresholdMs = 30_000;
const localHostPattern = /^(localhost|127\.0\.0\.1|::1)(:\d+)?$/i;

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  idToken: string | null;
  expiresAt: number;
  profile: {
    sub: string | null;
    email: string | null;
    username: string | null;
    emailVerified: boolean;
  };
}

function normalizeHost(host: string | null | undefined) {
  if (!host) {
    return null;
  }

  return host.split(',')[0]?.trim() || null;
}

function isLocalHost(host: string | null | undefined) {
  const normalized = normalizeHost(host);
  return Boolean(normalized && localHostPattern.test(normalized));
}

function resolveAppUrl(defaultAppUrl: string, requestHost?: string | null) {
  const normalizedHost = normalizeHost(requestHost);

  if (!normalizedHost || !isLocalHost(normalizedHost)) {
    return defaultAppUrl;
  }

  return `http://${normalizedHost}`;
}

function getConfig(requestHost?: string | null) {
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? 'ruflo';
  const clientId = process.env.KEYCLOAK_WEB_CLIENT_ID ?? 'ruflo-web-ui';
  const clientSecret = process.env.KEYCLOAK_WEB_CLIENT_SECRET ?? 'change-me-web-client';
  const defaultAppUrl = process.env.WEB_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? process.env.APP_URL ?? 'http://localhost:3001';
  const appUrl = resolveAppUrl(defaultAppUrl, requestHost);
  const keycloakPublicUrl = isLocalHost(requestHost)
    ? 'http://localhost:8080/auth'
    : process.env.NEXT_PUBLIC_KEYCLOAK_PUBLIC_URL ?? process.env.KEYCLOAK_PUBLIC_URL ?? 'http://localhost:8080/auth';
  const keycloakInternalUrl =
    process.env.KEYCLOAK_INTERNAL_URL ??
    process.env.KEYCLOAK_PUBLIC_URL ??
    keycloakPublicUrl;
  const secureCookies = appUrl.startsWith('https://');

  return {
    keycloakPublicUrl,
    keycloakInternalUrl,
    realm,
    clientId,
    clientSecret,
    appUrl,
    secureCookies,
    redirectUri: `${appUrl}/auth/callback`
  };
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split('.');

  if (!payload) {
    return {};
  }

  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
}

function mapTokens(tokenResponse: {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  expires_in: number;
}): AuthSession {
  const payload = decodeJwtPayload(tokenResponse.access_token);

  return {
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token,
    idToken: tokenResponse.id_token ?? null,
    expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    profile: {
      sub: typeof payload.sub === 'string' ? payload.sub : null,
      email: typeof payload.email === 'string' ? payload.email : null,
      username: typeof payload.preferred_username === 'string' ? payload.preferred_username : null,
      emailVerified: payload.email_verified === true
    }
  };
}

export async function createLoginRedirect(returnTo = '/', requestHost?: string | null) {
  const { keycloakPublicUrl, realm, clientId, redirectUri, secureCookies } = getConfig(requestHost);
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(cookieNames.state, state, { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' });
  cookieStore.set(cookieNames.returnTo, returnTo, { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state
  });

  redirect(`${keycloakPublicUrl}/realms/${realm}/protocol/openid-connect/auth?${params.toString()}`);
}

export async function createRegisterRedirect(returnTo = '/', requestHost?: string | null) {
  const cookieStore = await cookies();
  const { secureCookies } = getConfig(requestHost);
  const safeReturnTo =
    returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.startsWith('/auth') && !returnTo.startsWith('/become-')
      ? returnTo
      : '/dashboard';
  cookieStore.set(cookieNames.returnTo, safeReturnTo, { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' });
  redirect(`/register${safeReturnTo !== '/dashboard' ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : ''}`);
}

export async function exchangeAuthorizationCode(code: string, requestHost?: string | null) {
  const { keycloakInternalUrl, realm, clientId, clientSecret, redirectUri } = getConfig(requestHost);
  const response = await fetch(`${keycloakInternalUrl}/realms/${realm}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    throw new Error(`Authorization code exchange failed with status ${response.status}`);
  }

  return mapTokens(
    (await response.json()) as {
      access_token: string;
      refresh_token: string;
      id_token?: string;
      expires_in: number;
    }
  );
}

export async function exchangePasswordCredentials(email: string, password: string, requestHost?: string | null) {
  const { keycloakInternalUrl, realm, clientId, clientSecret } = getConfig(requestHost);
  const response = await fetch(`${keycloakInternalUrl}/realms/${realm}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: email,
      password,
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!response.ok) {
    if (response.status === 400 || response.status === 401) {
      throw new Error('Invalid email or password.');
    }

    throw new Error(`Password sign-in failed with status ${response.status}`);
  }

  return mapTokens(
    (await response.json()) as {
      access_token: string;
      refresh_token: string;
      id_token?: string;
      expires_in: number;
    }
  );
}

export async function refreshSessionTokens(refreshToken: string, requestHost?: string | null) {
  const { keycloakInternalUrl, realm, clientId, clientSecret } = getConfig(requestHost);
  const response = await fetch(`${keycloakInternalUrl}/realms/${realm}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret
    })
  });

  if (!response.ok) {
    throw new Error(`Refresh token exchange failed with status ${response.status}`);
  }

  return mapTokens(
    (await response.json()) as {
      access_token: string;
      refresh_token: string;
      id_token?: string;
      expires_in: number;
    }
  );
}

export async function persistSession(session: AuthSession) {
  const cookieStore = await cookies();
  const { secureCookies } = getConfig();
  const baseOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: secureCookies,
    path: '/'
  };

  cookieStore.set(cookieNames.accessToken, session.accessToken, baseOptions);
  cookieStore.set(cookieNames.refreshToken, session.refreshToken, baseOptions);
  cookieStore.set(cookieNames.expiresAt, String(session.expiresAt), baseOptions);

  if (session.idToken) {
    cookieStore.set(cookieNames.idToken, session.idToken, baseOptions);
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  for (const name of Object.values(cookieNames)) {
    cookieStore.delete(name);
  }
}

export async function consumeLoginState() {
  const cookieStore = await cookies();
  const state = cookieStore.get(cookieNames.state)?.value ?? null;
  const returnTo = cookieStore.get(cookieNames.returnTo)?.value ?? '/';
  cookieStore.delete(cookieNames.state);
  cookieStore.delete(cookieNames.returnTo);

  return { state, returnTo };
}

export async function getOptionalSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(cookieNames.accessToken)?.value;
  const refreshToken = cookieStore.get(cookieNames.refreshToken)?.value;
  const expiresAt = Number(cookieStore.get(cookieNames.expiresAt)?.value ?? '0');
  const idToken = cookieStore.get(cookieNames.idToken)?.value ?? null;

  if (!accessToken || !refreshToken || !expiresAt) {
    return null;
  }

  const payload = decodeJwtPayload(accessToken);

  return {
    accessToken,
    refreshToken,
    idToken,
    expiresAt,
    profile: {
      sub: typeof payload.sub === 'string' ? payload.sub : null,
      email: typeof payload.email === 'string' ? payload.email : null,
      username: typeof payload.preferred_username === 'string' ? payload.preferred_username : null,
      emailVerified: payload.email_verified === true
    }
  };
}

export async function requireAccessToken(returnTo = '/') {
  const session = await getOptionalSession();

  if (!session) {
    redirect(`/signin?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const activeSession = session;

  if (activeSession.expiresAt <= Date.now() + refreshThresholdMs) {
    redirect(`/session/refresh?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return activeSession.accessToken;
}

export async function getOptionalAccessToken() {
  const session = await getOptionalSession();

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now() + refreshThresholdMs) {
    return null;
  }

  return session.accessToken;
}

export function buildLogoutUrl(idTokenHint?: string | null, requestHost?: string | null) {
  const { keycloakPublicUrl, realm, clientId, appUrl } = getConfig(requestHost);
  const params = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: appUrl
  });

  if (idTokenHint) {
    params.set('id_token_hint', idTokenHint);
  }

  return `${keycloakPublicUrl}/realms/${realm}/protocol/openid-connect/logout?${params.toString()}`;
}
