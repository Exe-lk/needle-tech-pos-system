/**
 * Feature-based permissions system
 * Maps frontend routes/features to backend permissions
 */

export interface Feature {
  id: string;
  name: string;
  description: string;
  route: string; // Frontend route path
  permission: string; // Backend permission required
  category: string; // Feature category (e.g., 'management', 'operations', 'reports')
}

/**
 * Feature definitions - maps frontend routes to required permissions
 */
export const FEATURES: Record<string, Feature> = {
  // ============ Management Pages ============
  'customers': {
    id: 'customers',
    name: 'Customers',
    description: 'View and manage customers',
    route: '/customers',
    permission: 'customers:view',
    category: 'management',
  },
  'customers.create': {
    id: 'customers.create',
    name: 'Create Customer',
    description: 'Create new customers',
    route: '/customers/create',
    permission: 'customers:create',
    category: 'management',
  },
  'customers.edit': {
    id: 'customers.edit',
    name: 'Edit Customer',
    description: 'Edit customer information',
    route: '/customers/[id]/edit',
    permission: 'customers:update',
    category: 'management',
  },
  'customers.delete': {
    id: 'customers.delete',
    name: 'Delete Customer',
    description: 'Delete customers',
    route: '/customers',
    permission: 'customers:delete',
    category: 'management',
  },

  'machines': {
    id: 'machines',
    name: 'Machines',
    description: 'View and manage machines',
    route: '/machines',
    permission: 'machines:view',
    category: 'management',
  },
  'machines.create': {
    id: 'machines.create',
    name: 'Create Machine',
    description: 'Create new machines',
    route: '/machines/create',
    permission: 'machines:create',
    category: 'management',
  },
  'machines.edit': {
    id: 'machines.edit',
    name: 'Edit Machine',
    description: 'Edit machine information',
    route: '/machines/[id]/edit',
    permission: 'machines:update',
    category: 'management',
  },
  'machines.delete': {
    id: 'machines.delete',
    name: 'Delete Machine',
    description: 'Delete machines',
    route: '/machines',
    permission: 'machines:delete',
    category: 'management',
  },

  'rental-agreements': {
    id: 'rental-agreements',
    name: 'Rental Agreements',
    description: 'View and manage rental agreements',
    route: '/rental-agreement',
    permission: 'rentals:view',
    category: 'management',
  },
  'rental-agreements.create': {
    id: 'rental-agreements.create',
    name: 'Create Rental Agreement',
    description: 'Create new rental agreements',
    route: '/rental-agreement/create',
    permission: 'rentals:create',
    category: 'management',
  },
  'rental-agreements.edit': {
    id: 'rental-agreements.edit',
    name: 'Edit Rental Agreement',
    description: 'Edit rental agreements',
    route: '/rental-agreement/[id]/edit',
    permission: 'rentals:update',
    category: 'management',
  },
  'rental-agreements.delete': {
    id: 'rental-agreements.delete',
    name: 'Delete Rental Agreement',
    description: 'Delete rental agreements',
    route: '/rental-agreement',
    permission: 'rentals:delete',
    category: 'management',
  },

  'invoices': {
    id: 'invoices',
    name: 'Invoices',
    description: 'View and manage invoices',
    route: '/invoices',
    permission: 'invoices:view',
    category: 'management',
  },
  'invoices.create': {
    id: 'invoices.create',
    name: 'Create Invoice',
    description: 'Create new invoices',
    route: '/invoices/create',
    permission: 'invoices:create',
    category: 'management',
  },
  'invoices.edit': {
    id: 'invoices.edit',
    name: 'Edit Invoice',
    description: 'Edit invoices',
    route: '/invoices/[id]/edit',
    permission: 'invoices:update',
    category: 'management',
  },

  'gate-passes': {
    id: 'gate-passes',
    name: 'Gate Passes',
    description: 'View and manage gate passes',
    route: '/gatepass',
    permission: 'gatepasses:view',
    category: 'management',
  },
  'gate-passes.create': {
    id: 'gate-passes.create',
    name: 'Create Gate Pass',
    description: 'Create new gate passes',
    route: '/gatepass/create',
    permission: 'gatepasses:create',
    category: 'management',
  },
  'gate-passes.approve': {
    id: 'gate-passes.approve',
    name: 'Approve Gate Pass',
    description: 'Security approve gate passes',
    route: '/gatepass-qr-page',
    permission: 'gatepasses:approve',
    category: 'management',
  },

  'returns': {
    id: 'returns',
    name: 'Returns',
    description: 'View and manage returns',
    route: '/returns',
    permission: 'returns:view',
    category: 'management',
  },
  'returns.create': {
    id: 'returns.create',
    name: 'Create Return',
    description: 'Create new returns',
    route: '/returns/create',
    permission: 'returns:create',
    category: 'management',
  },

  'purchase-orders': {
    id: 'purchase-orders',
    name: 'Purchase Orders',
    description: 'View and manage purchase orders',
    route: '/purchase-order',
    permission: 'purchase-orders:view',
    category: 'management',
  },
  'purchase-orders.create': {
    id: 'purchase-orders.create',
    name: 'Create Purchase Order',
    description: 'Create new purchase orders',
    route: '/purchase-order/create',
    permission: 'purchase-orders:create',
    category: 'management',
  },
  'purchase-orders.approve': {
    id: 'purchase-orders.approve',
    name: 'Approve Purchase Order',
    description: 'Approve purchase orders',
    route: '/purchase-order',
    permission: 'purchase-orders:approve',
    category: 'management',
  },

  'inventory': {
    id: 'inventory',
    name: 'Inventory',
    description: 'View inventory and stock levels',
    route: '/inventory',
    permission: 'inventory:view',
    category: 'management',
  },
  'inventory.stock-in': {
    id: 'inventory.stock-in',
    name: 'Stock In',
    description: 'Record stock-in transactions',
    route: '/inventory/stock-in',
    permission: 'inventory:stock-in',
    category: 'management',
  },

  'bincard': {
    id: 'bincard',
    name: 'Bincard',
    description: 'View bincard entries and stock movements',
    route: '/bincard',
    permission: 'bincard:view',
    category: 'management',
  },

  'tools': {
    id: 'tools',
    name: 'Tools',
    description: 'View and manage tools',
    route: '/tools',
    permission: 'tools:view',
    category: 'management',
  },
  'tools.create': {
    id: 'tools.create',
    name: 'Create Tool',
    description: 'Create new tools',
    route: '/tools/create',
    permission: 'tools:create',
    category: 'management',
  },
  'tools.edit': {
    id: 'tools.edit',
    name: 'Edit Tool',
    description: 'Edit tools',
    route: '/tools/[id]/edit',
    permission: 'tools:update',
    category: 'management',
  },
  'tools.delete': {
    id: 'tools.delete',
    name: 'Delete Tool',
    description: 'Delete tools',
    route: '/tools',
    permission: 'tools:delete',
    category: 'management',
  },

  // ============ Operations Pages ============
  'machine-assign': {
    id: 'machine-assign',
    name: 'Machine Assignment',
    description: 'Assign machines to rental agreements',
    route: '/machine-assign-page',
    permission: 'operations:machine-assign',
    category: 'operations',
  },
  'return-qr': {
    id: 'return-qr',
    name: 'Return QR Scanner',
    description: 'Process machine returns via QR scan',
    route: '/return-qr-page',
    permission: 'operations:return-process',
    category: 'operations',
  },

  // ============ Reports & Analytics ============
  'reports': {
    id: 'reports',
    name: 'Reports',
    description: 'View reports and analytics',
    route: '/reports',
    permission: 'reports:view',
    category: 'reports',
  },
  'analytics': {
    id: 'analytics',
    name: 'Analytics',
    description: 'View analytics and insights',
    route: '/analytics',
    permission: 'analytics:view',
    category: 'reports',
  },
  'transaction-log': {
    id: 'transaction-log',
    name: 'Transaction Log',
    description: 'View transaction logs',
    route: '/transaction-log',
    permission: 'transaction-log:view',
    category: 'reports',
  },
  'outstanding-alerts': {
    id: 'outstanding-alerts',
    name: 'Outstanding Alerts',
    description: 'View outstanding alerts',
    route: '/outstanding-alerts',
    permission: 'alerts:view',
    category: 'reports',
  },

  // ============ Administration ============
  'users': {
    id: 'users',
    name: 'Users',
    description: 'View and manage users',
    route: '/users',
    permission: 'users:view',
    category: 'administration',
  },
  'users.create': {
    id: 'users.create',
    name: 'Create User',
    description: 'Create new users',
    route: '/users/create',
    permission: 'users:create',
    category: 'administration',
  },
  'users.edit': {
    id: 'users.edit',
    name: 'Edit User',
    description: 'Edit user information',
    route: '/users/[id]/edit',
    permission: 'users:update',
    category: 'administration',
  },
  'users.delete': {
    id: 'users.delete',
    name: 'Delete User',
    description: 'Delete users',
    route: '/users',
    permission: 'users:delete',
    category: 'administration',
  },
  'roles': {
    id: 'roles',
    name: 'Roles & Permissions',
    description: 'View and manage roles and permissions',
    route: '/roles',
    permission: 'roles:view',
    category: 'administration',
  },
  'roles.create': {
    id: 'roles.create',
    name: 'Create Role',
    description: 'Create new roles',
    route: '/roles/create',
    permission: 'roles:create',
    category: 'administration',
  },
  'roles.edit': {
    id: 'roles.edit',
    name: 'Edit Role',
    description: 'Edit roles and permissions',
    route: '/roles/[id]/edit',
    permission: 'roles:update',
    category: 'administration',
  },
  'settings': {
    id: 'settings',
    name: 'Settings',
    description: 'View and manage system settings',
    route: '/settings',
    permission: 'settings:view',
    category: 'administration',
  },
  'settings.edit': {
    id: 'settings.edit',
    name: 'Edit Settings',
    description: 'Edit system settings',
    route: '/settings',
    permission: 'settings:update',
    category: 'administration',
  },
};

/**
 * Get all features grouped by category
 */
export function getFeaturesByCategory(): Record<string, Feature[]> {
  const grouped: Record<string, Feature[]> = {};
  
  Object.values(FEATURES).forEach(feature => {
    if (!grouped[feature.category]) {
      grouped[feature.category] = [];
    }
    grouped[feature.category].push(feature);
  });
  
  return grouped;
}

/**
 * Get features accessible by user based on permissions
 */
export function getAccessibleFeatures(userPermissions: string[]): Feature[] {
  return Object.values(FEATURES).filter(feature => {
    // Check if user has the required permission or wildcard permission
    return userPermissions.includes(feature.permission) || 
           userPermissions.includes('*') ||
           // Also check for category-level permissions (e.g., 'management:*')
           userPermissions.some(perm => perm === `${feature.category}:*`);
  });
}

/**
 * Get accessible routes for frontend
 */
export function getAccessibleRoutes(userPermissions: string[]): string[] {
  const accessibleFeatures = getAccessibleFeatures(userPermissions);
  return accessibleFeatures.map(f => f.route);
}

/**
 * Check if user has access to a specific route
 */
export function hasRouteAccess(userPermissions: string[], route: string): boolean {
  const feature = Object.values(FEATURES).find(f => f.route === route);
  if (!feature) return false;
  
  return userPermissions.includes(feature.permission) || 
         userPermissions.includes('*') ||
         userPermissions.some(perm => perm === `${feature.category}:*`);
}
