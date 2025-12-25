export enum CustomerRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

export enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export interface CustomerDetails {
  id: string;
  name: string;
  email: string;
  phone?: string;
  shipping_address?: string;
  role: CustomerRole;
  status: CustomerStatus;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerCreatePayload {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  shipping_address?: string;
}

export interface CustomerUpdatePayload {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  shipping_address?: string;
  role?: CustomerRole;
  status?: CustomerStatus;
}

export interface CustomerQueryPayload {
  email?: string;
  name?: string;
  status?: CustomerStatus;
  page?: number;
  limit?: number;
}

export interface CustomerValidationResult {
  is_valid: boolean;
  customer?: CustomerDetails;
  error?: string;
}
