import { getOptionalSession } from './auth';

const internalApiBaseUrl =
  process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export type MarketplaceRole = 'guest' | 'buyer' | 'supplier' | 'logistics' | 'customs' | 'admin';

export type MarketplaceViewer = {
  isAuthenticated: boolean;
  role: MarketplaceRole;
  roles: string[];
  email: string | null;
  username: string | null;
  displayName: string | null;
  internalUserId: string | null;
};

type IdentityContext = {
  isAuthenticated?: boolean;
  internalUserId?: string | null;
  roles?: string[];
  email?: string | null;
  username?: string | null;
};

function deriveRole(roles: string[] | undefined): MarketplaceRole {
  if (roles?.includes('platform_admin')) {
    return 'admin';
  }

  if (roles?.includes('logistics_company')) {
    return 'logistics';
  }

  if (roles?.includes('customs_broker')) {
    return 'customs';
  }

  if (roles?.includes('supplier_user')) {
    return 'supplier';
  }

  if (roles?.includes('customer_user')) {
    return 'buyer';
  }

  return 'guest';
}

export function getRoleLabel(role: MarketplaceRole) {
  if (role === 'admin') {
    return 'Admin';
  }

  if (role === 'supplier') {
    return 'Supplier';
  }

  if (role === 'logistics') {
    return 'Logistics';
  }

  if (role === 'customs') {
    return 'Customs';
  }

  if (role === 'buyer') {
    return 'Buyer';
  }

  return 'Guest';
}

export async function getMarketplaceViewer(): Promise<MarketplaceViewer> {
  const session = await getOptionalSession();

  if (!session) {
    return {
      isAuthenticated: false,
      role: 'guest',
      roles: [],
      email: null,
      username: null,
      displayName: null,
      internalUserId: null
    };
  }

  try {
    const response = await fetch(`${internalApiBaseUrl}/api/identity/context`, {
      cache: 'no-store',
      headers: {
        authorization: `Bearer ${session.accessToken}`
      }
    });

    if (!response.ok) {
      return {
        isAuthenticated: false,
        role: 'guest',
        roles: [],
        email: session.profile.email,
        username: session.profile.username,
        displayName: session.profile.username ?? session.profile.email,
        internalUserId: null
      };
    }

    const context = (await response.json()) as IdentityContext;
    const roles = context.roles ?? [];
    const role = deriveRole(roles);

    return {
      isAuthenticated: Boolean(context.isAuthenticated ?? true),
      role,
      roles,
      email: context.email ?? session.profile.email,
      username: context.username ?? session.profile.username,
      displayName: context.username ?? session.profile.username ?? session.profile.email,
      internalUserId: context.internalUserId ?? null
    };
  } catch {
    return {
      isAuthenticated: false,
      role: deriveRole([]),
      roles: [],
      email: session.profile.email,
      username: session.profile.username,
      displayName: session.profile.username ?? session.profile.email,
      internalUserId: null
    };
  }
}
