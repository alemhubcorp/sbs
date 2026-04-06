export type TenantStatus = 'active' | 'suspended';
export type MembershipStatus = 'active' | 'invited' | 'suspended';
export type MembershipType = 'owner' | 'admin' | 'member' | 'viewer';

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSummary {
  id: string;
  tenantId: string;
  name: string;
  legalName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipSummary {
  id: string;
  tenantId: string;
  userId: string;
  organizationId?: string;
  membershipType: MembershipType;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  organizationName: string;
  legalName?: string;
  ownerUserId?: string;
}
