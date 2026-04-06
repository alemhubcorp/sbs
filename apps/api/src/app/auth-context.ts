export interface AuthContext {
  isAuthenticated: boolean;
  subject: string | null;
  email: string | null;
  username: string | null;
  internalUserId: string | null;
  tenantId: string | null;
  tenantIds: string[];
  roles: string[];
  permissions: string[];
  tokenIssuer: string | null;
}

export interface RequestAuditContext {
  actorId: string | null;
  tenantId: string | null;
  correlationId: string | null;
  roles: string[];
}

export interface ApiRequestLike {
  headers?: Record<string, string | string[] | undefined>;
  authContext?: AuthContext;
  id?: string;
}

export function createAnonymousAuthContext(): AuthContext {
  return {
    isAuthenticated: false,
    subject: null,
    email: null,
    username: null,
    internalUserId: null,
    tenantId: null,
    tenantIds: [],
    roles: [],
    permissions: [],
    tokenIssuer: null
  };
}

export function extractRequestAuditContext(request: ApiRequestLike): RequestAuditContext {
  const correlationHeader = request.headers?.['x-correlation-id'];
  const correlationId = Array.isArray(correlationHeader) ? correlationHeader[0] : correlationHeader;

  return {
    actorId: request.authContext?.internalUserId ?? request.authContext?.subject ?? null,
    tenantId: request.authContext?.tenantId ?? null,
    correlationId: correlationId ?? request.id ?? null,
    roles: request.authContext?.roles ?? []
  };
}
