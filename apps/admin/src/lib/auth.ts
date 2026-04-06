import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const cookieNames = {
  accessToken: 'ruflo_admin_access_token',
  refreshToken: 'ruflo_admin_refresh_token',
  idToken: 'ruflo_admin_id_token',
  expiresAt: 'ruflo_admin_expires_at',
  state: 'ruflo_admin_oauth_state',
  returnTo: 'ruflo_admin_return_to'
} as const;

const refreshThresholdMs = 30_000;

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  idToken: string | null;
  expiresAt: number;
  profile: {
    sub: string | null;
    email: string | null;
    username: string | null;
  };
}

function getConfig() {
  const keycloakBaseUrl = process.env.NEXT_PUBLIC_KEYCLOAK_PUBLIC_URL ?? 'http://localhost:8080';
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? 'ruflo';
  const clientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID ?? 'ruflo-admin-ui';
  const clientSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET ?? 'change-me-admin-client';
  const appUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3002';

  return {
    keycloakBaseUrl,
    realm,
    clientId,
    clientSecret,
    appUrl,
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
      username: typeof payload.preferred_username === 'string' ? payload.preferred_username : null
    }
  };
}

export async function createLoginRedirect(returnTo = '/') {
  const { keycloakBaseUrl, realm, clientId, redirectUri } = getConfig();
  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(cookieNames.state, state, { httpOnly: true, sameSite: 'lax', path: '/' });
  cookieStore.set(cookieNames.returnTo, returnTo, { httpOnly: true, sameSite: 'lax', path: '/' });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    state
  });

  redirect(`${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/auth?${params.toString()}`);
}

export async function exchangeAuthorizationCode(code: string) {
  const { keycloakBaseUrl, realm, clientId, clientSecret, redirectUri } = getConfig();
  const response = await fetch(`${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/token`, {
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

export async function refreshSessionTokens(refreshToken: string) {
  const { keycloakBaseUrl, realm, clientId, clientSecret } = getConfig();
  const response = await fetch(`${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/token`, {
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
  const baseOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
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
      username: typeof payload.preferred_username === 'string' ? payload.preferred_username : null
    }
  };
}

export async function requireAccessToken(returnTo = '/') {
  const session = await getOptionalSession();

  if (!session) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const activeSession = session;

  if (activeSession.expiresAt <= Date.now() + refreshThresholdMs) {
    redirect(`/auth/refresh?returnTo=${encodeURIComponent(returnTo)}`);
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

export function buildLogoutUrl(idTokenHint?: string | null) {
  const { keycloakBaseUrl, realm, clientId, appUrl } = getConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    post_logout_redirect_uri: appUrl
  });

  if (idTokenHint) {
    params.set('id_token_hint', idTokenHint);
  }

  return `${keycloakBaseUrl}/realms/${realm}/protocol/openid-connect/logout?${params.toString()}`;
}
