# API Permissions Mapping

This document maps all API endpoints to their required permissions. Use this to configure user roles with appropriate permissions.

## Permission Format

Permissions follow the pattern: `resource:action` or `category:*` for category-wide access.

- `*` - Full access to everything
- `resource:*` - Full access to a resource (e.g., `customers:*`)
- `category:*` - Full access to a category (e.g., `management:*`)
- `resource:action` - Specific action (e.g., `customers:view`, `customers:create`)

## API Endpoints and Required Permissions

### Customers
- `GET /api/v1/customers` - `customers:view` or `management:*` or `*`
- `POST /api/v1/customers` - `customers:create` or `management:*` or `*`
- `GET /api/v1/customers/:id` - `customers:view` or `management:*` or `*`
- `PUT /api/v1/customers/:id` - `customers:update` or `management:*` or `*`
- `DELETE /api/v1/customers/:id` - `customers:delete` or `management:*` or `*`

### Machines
- `GET /api/v1/machines` - `machines:view` or `management:*` or `*`
- `POST /api/v1/machines` - `machines:create` or `management:*` or `*`
- `GET /api/v1/machines/:id` - `machines:view` or `management:*` or `*`
- `PUT /api/v1/machines/:id` - `machines:update` or `management:*` or `*`
- `DELETE /api/v1/machines/:id` - `machines:delete` or `management:*` or `*`

### Rental Agreements
- `GET /api/v1/rentals` - `rentals:view` or `management:*` or `*`
- `POST /api/v1/rentals` - `rentals:create` or `management:*` or `*`
- `GET /api/v1/rentals/:id` - `rentals:view` or `management:*` or `*`
- `PUT /api/v1/rentals/:id` - `rentals:update` or `management:*` or `*`
- `DELETE /api/v1/rentals/:id` - `rentals:delete` or `management:*` or `*`
- `GET /api/v1/rentals/by-number` - `rentals:view` or `operations:*` or `*`
- `POST /api/v1/rentals/from-purchase-request` - `rentals:create` or `management:*` or `*`

### Invoices
- `GET /api/v1/invoices` - `invoices:view` or `management:*` or `*`
- `POST /api/v1/invoices` - `invoices:create` or `management:*` or `*`
- `GET /api/v1/invoices/:id` - `invoices:view` or `management:*` or `*`
- `PUT /api/v1/invoices/:id` - `invoices:update` or `management:*` or `*`

### Gate Passes
- `GET /api/v1/gate-passes` - `gatepasses:view` or `management:*` or `*`
- `POST /api/v1/gate-passes` - `gatepasses:create` or `management:*` or `*`
- `GET /api/v1/gate-passes/:id` - `gatepasses:view` or `management:*` or `*`
- `PUT /api/v1/gate-passes/:id` - `gatepasses:update` or `management:*` or `*`
- `DELETE /api/v1/gate-passes/:id` - `gatepasses:delete` or `management:*` or `*`
- `GET /api/v1/gate-passes/by-number` - `gatepasses:view` or `operations:*` or `*`
- `POST /api/v1/gate-passes/:id/security-approve` - `gatepasses:approve` or `operations:*` or `*`

### Returns
- `GET /api/v1/returns` - `returns:view` or `management:*` or `*`
- `POST /api/v1/returns` - `returns:create` or `management:*` or `*`
- `GET /api/v1/returns/:id` - `returns:view` or `management:*` or `*`
- `PUT /api/v1/returns/:id` - `returns:update` or `management:*` or `*`

### Purchase Orders
- `GET /api/v1/purchase-orders` - `purchase-orders:view` or `management:*` or `*`
- `POST /api/v1/purchase-orders` - `purchase-orders:create` or `management:*` or `*`
- `GET /api/v1/purchase-orders/:id` - `purchase-orders:view` or `management:*` or `*`
- `PUT /api/v1/purchase-orders/:id` - `purchase-orders:update` or `management:*` or `*`
- `DELETE /api/v1/purchase-orders/:id` - `purchase-orders:delete` or `management:*` or `*`

### Inventory
- `GET /api/v1/inventory` - `inventory:view` or `management:*` or `*`
- `POST /api/v1/inventory/stock-in` - `inventory:stock-in` or `management:*` or `*`
- `GET /api/v1/inventory/transactions` - `inventory:view` or `management:*` or `*`

### Bincard
- `GET /api/v1/bincard/entries` - `bincard:view` or `management:*` or `*`
- `GET /api/v1/bincard/summary` - `bincard:view` or `management:*` or `*`

### Tools
- `GET /api/v1/tools` - `tools:view` or `management:*` or `*`
- `POST /api/v1/tools` - `tools:create` or `management:*` or `*`
- `GET /api/v1/tools/:id` - `tools:view` or `management:*` or `*`
- `PUT /api/v1/tools/:id` - `tools:update` or `management:*` or `*`
- `DELETE /api/v1/tools/:id` - `tools:delete` or `management:*` or `*`

### Reports & Analytics
- `GET /api/v1/transaction-log` - `transaction-log:view` or `reports:*` or `*`
- `GET /api/v1/transaction-log/export` - `transaction-log:view` or `reports:*` or `*`
- `GET /api/v1/outstanding-alerts` - `alerts:view` or `reports:*` or `*`
- `GET /api/v1/analytics/*` - `analytics:view` or `reports:*` or `*`

### Administration
- `GET /api/v1/users` - `users:view` or `administration:*` or `*`
- `POST /api/v1/users` - `users:create` or `administration:*` or `*`
- `GET /api/v1/users/:id` - `users:view` or `administration:*` or `*`
- `PUT /api/v1/users/:id` - `users:update` or `administration:*` or `*`
- `DELETE /api/v1/users/:id` - `users:delete` or `administration:*` or `*`
- `GET /api/v1/roles` - `roles:view` or `administration:*` or `*`
- `POST /api/v1/roles` - `roles:create` or `administration:*` or `*`
- `PUT /api/v1/roles/:id` - `roles:update` or `administration:*` or `*`
- `GET /api/v1/settings` - `settings:view` or `administration:*` or `*`
- `PUT /api/v1/settings` - `settings:update` or `administration:*` or `*`

### Auth
- `GET /api/v1/auth/me` - No permission required (authenticated users only)
- `GET /api/v1/auth/permissions` - No permission required (authenticated users only)

## Default Role Permissions

### SUPER_ADMIN
- `*` (full access)

### ADMIN
- `management:*`
- `operations:*`
- `reports:*`
- `administration:*`

### MANAGER
- `management:*`
- `operations:*`
- `reports:view`

### OPERATOR
- `management:view`
- `operations:*`
- `reports:view`

### USER
- `management:view`
- `operations:return-process`

## Frontend Integration

Use the `/api/v1/auth/permissions` endpoint to get user's accessible routes:

```typescript
const response = await fetch('/api/v1/auth/permissions', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();

// Check if user can access a route
const canAccess = data.accessibleRoutes.includes('/customers');

// Get features by category
const managementFeatures = data.features.management.filter(f => f.accessible);
```

## Updating APIs

To update an API to use permissions:

1. Replace `withAuthAndRole` with `withAuthAndPermission`
2. Use the permission pattern: `resource:action`
3. Include fallback permissions: `['resource:action', 'category:*', '*']`

Example:
```typescript
// Before
export const GET = withAuthAndRole(['ADMIN', 'MANAGER'], async (request) => {
  // ...
});

// After
export const GET = withAuthAndPermission(['customers:view', 'management:*', '*'], async (request) => {
  // ...
});
```
