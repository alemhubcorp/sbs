export type UserStatus = 'invited' | 'active' | 'disabled';

export interface IdentityUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  externalSubject?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityRole {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface CreateIdentityUserInput {
  email: string;
  firstName: string;
  lastName: string;
  externalSubject?: string;
  roleIds?: string[];
}
