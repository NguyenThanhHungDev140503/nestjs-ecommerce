// Roles for PBAC (Permission-Based Access Control)
export enum Role {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
}

// Resources that can be accessed
export enum Resource {
  CUSTOMER = 'customer',
  ORDER = 'order',
  PRODUCT = 'product',
  INVENTORY = 'inventory',
}

// Actions that can be performed
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // Full access
}

// Possession types
export enum Possession {
  OWN = 'own',    // Only own resources
  ANY = 'any',    // Any resources
}

// Permission definition interface
export interface Permission {
  role: Role;
  resource: Resource;
  action: Action;
  possession: Possession;
}

// Default permissions configuration
export const DEFAULT_PERMISSIONS: Permission[] = [
  // Customer role permissions
  { role: Role.CUSTOMER, resource: Resource.CUSTOMER, action: Action.READ, possession: Possession.OWN },
  { role: Role.CUSTOMER, resource: Resource.CUSTOMER, action: Action.UPDATE, possession: Possession.OWN },
  { role: Role.CUSTOMER, resource: Resource.ORDER, action: Action.CREATE, possession: Possession.OWN },
  { role: Role.CUSTOMER, resource: Resource.ORDER, action: Action.READ, possession: Possession.OWN },
  { role: Role.CUSTOMER, resource: Resource.PRODUCT, action: Action.READ, possession: Possession.ANY },
  { role: Role.CUSTOMER, resource: Resource.INVENTORY, action: Action.READ, possession: Possession.ANY },

  // Admin role permissions - full access
  { role: Role.ADMIN, resource: Resource.CUSTOMER, action: Action.MANAGE, possession: Possession.ANY },
  { role: Role.ADMIN, resource: Resource.ORDER, action: Action.MANAGE, possession: Possession.ANY },
  { role: Role.ADMIN, resource: Resource.PRODUCT, action: Action.MANAGE, possession: Possession.ANY },
  { role: Role.ADMIN, resource: Resource.INVENTORY, action: Action.MANAGE, possession: Possession.ANY },
];

