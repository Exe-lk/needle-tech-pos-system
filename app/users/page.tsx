'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import CreateForm, { FormField } from '@/src/components/form-popup/create';
import UpdateForm from '@/src/components/form-popup/update';
import DeleteForm from '@/src/components/form-popup/delete';
import { Eye, Pencil, Trash2, X, Shield, User, Search, Lock } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import { validateEmail, validatePhoneNumber } from '@/src/utils/validation';
import { authFetch, clearAuth, redirectToLogin } from '@/lib/auth-client';
import { FEATURES } from '@/lib/permissions';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

/**
 * Permission matrix: one row per form/module with View, Add (create), Edit (update), Delete.
 * Maps to permission strings in lib/permissions.ts. Used for role creation UI.
 */
const PERMISSION_ACTIONS = ['view', 'create', 'update', 'delete'] as const;
type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

interface FormPermissionRow {
  key: string;
  label: string;
  permissions: Partial<Record<PermissionAction, string | string[]>>;
}

const PERMISSION_MATRIX_ROWS: FormPermissionRow[] = [
  { key: 'dashboard', label: 'Dashboard', permissions: { view: 'reports:view' } },
  { key: 'purchase-order', label: 'Purchase Order', permissions: { view: 'purchase-orders:view', create: 'purchase-orders:create', update: 'purchase-orders:approve' } },
  { key: 'rental', label: 'Hiring Machine Agreement', permissions: { view: 'rentals:view', create: 'rentals:create', update: 'rentals:update', delete: 'rentals:delete' } },
  { key: 'gatepass', label: 'Gate Pass', permissions: { view: 'gatepasses:view', create: 'gatepasses:create', update: 'gatepasses:approve', delete: 'gatepasses:delete' } },
  { key: 'returns', label: 'Returns Management', permissions: { view: 'returns:view', create: 'returns:create' } },
  { key: 'invoice', label: 'Invoice & Payments', permissions: { view: 'invoices:view', create: 'invoices:create', update: 'invoices:update' } },
  { key: 'inventory', label: 'Inventory Management', permissions: { view: 'inventory:view', create: 'inventory:stock-in' } },
  { key: 'machines', label: 'Machine & Tools Management', permissions: { view: ['machines:view', 'tools:view'], create: ['machines:create', 'tools:create'], update: ['machines:update', 'tools:update'], delete: ['machines:delete', 'tools:delete'] } },
  { key: 'customers', label: 'Customer Management', permissions: { view: 'customers:view', create: 'customers:create', update: 'customers:update', delete: 'customers:delete' } },
  { key: 'outstanding-alerts', label: 'Outstanding Alerts', permissions: { view: 'alerts:view' } },
  { key: 'transaction-log', label: 'Transaction Log', permissions: { view: 'transaction-log:view' } },
  { key: 'bincard', label: 'Bincard', permissions: { view: 'bincard:view' } },
  { key: 'users', label: 'User Management', permissions: { view: 'users:view', create: 'users:create', update: 'users:update', delete: 'users:delete' } },
  { key: 'settings', label: 'Settings', permissions: { view: 'settings:view', update: 'settings:update' } },
];

/** Permission strings used for users page (see lib/permissions.ts & docs/API_PERMISSIONS.md) */
const USERS_VIEW = 'users:view';
const USERS_CREATE = 'users:create';
const USERS_UPDATE = 'users:update';
const USERS_DELETE = 'users:delete';
const ROLES_VIEW = 'roles:view';
const ROLES_CREATE = 'roles:create';
const ROLES_UPDATE = 'roles:update';
const ADMINISTRATION_WILDCARD = 'administration:*';
const GLOBAL_WILDCARD = '*';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'MANAGER' | 'OPERATOR' | 'USER';
type UserStatus = 'Active' | 'Inactive' | 'Suspended';
type ApiUserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  lastLogin?: string;
  createdAt: string;
}

interface ApiUserListItem {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  role: string;
  isActive: boolean;
  createdDate: string;
}

interface ApiUserDetails {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  role: string;
  isActive: boolean;
  createdDate: string;
  lastLoginAt?: string;
}

interface RoleOption {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
}

/** Response shape from GET /api/v1/auth/permissions (see app/api/v1/auth/permissions/route.ts) */
interface PermissionsResponse {
  user?: { id: string; username: string; fullName: string; email: string; role: { id: string; name: string } };
  permissions: string[];
  accessibleRoutes: string[];
  features?: Record<string, { id: string; name: string; description: string; route: string; permission: string; accessible: boolean }[]>;
  allFeatures?: { id: string; name: string; description: string; route: string; permission: string; category: string; accessible: boolean }[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const mapApiStatusToFrontend = (isActive: boolean): UserStatus => {
  return isActive ? 'Active' : 'Inactive';
};

const mapFrontendStatusToApi = (status: UserStatus): boolean => {
  return status === 'Active';
};

const formatRoleName = (role: string): string => {
  const roleMap: Record<string, string> = {
    'ADMIN': 'Admin',
    'SUPER_ADMIN': 'Super Admin',
    'MANAGER': 'Manager',
    'OPERATOR': 'Operator',
    'USER': 'User',
    'SECURITY_OFFICER': 'Security Officer',
    'STOCKKEEPER': 'Stockkeeper',
    'OPERATIONAL_OFFICER': 'Operational Officer',
  };
  return roleMap[role] || role;
};

/**
 * Check if user has a permission (aligns with lib/permissions.ts and docs/API_PERMISSIONS.md).
 * Supports exact permission, global wildcard (*), and category wildcard (e.g. administration:*).
 */
function hasPermission(userPermissions: string[], permission: string): boolean {
  if (!userPermissions?.length) return false;
  if (userPermissions.includes(GLOBAL_WILDCARD)) return true;
  if (userPermissions.includes(permission)) return true;
  const feature = Object.values(FEATURES).find((f) => f.permission === permission);
  const category = feature?.category;
  if (category && userPermissions.includes(`${category}:*`)) return true;
  return false;
}

// ============================================================================
// API FUNCTIONS (authFetch adds token and handles 401 → refresh → retry)
// ============================================================================

const fetchUsers = async (): Promise<User[]> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/users?limit=1000`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const result = await response.json();
    
    // API returns paginated response with structure: { status, code, message, timestamp, data: { items: [...], pagination: {...} } }
    const apiUsers: ApiUserListItem[] = result.data?.items || [];

    return apiUsers.map(apiUser => ({
      id: apiUser.userId,
      username: apiUser.username,
      email: apiUser.email,
      fullName: `${apiUser.firstName} ${apiUser.lastName}`.trim(),
      role: apiUser.role as UserRole,
      status: mapApiStatusToFrontend(apiUser.isActive),
      phone: apiUser.phone || undefined,
      createdAt: apiUser.createdDate,
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

const fetchUserById = async (userId: string): Promise<ApiUserDetails> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    const result = await response.json();
    return result.data as ApiUserDetails;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

const fetchRoles = async (): Promise<RoleOption[]> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/roles?limit=100`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }

    const result = await response.json();
    return result.data?.items || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    throw error;
  }
};

const createUser = async (userData: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  username: string;
  password: string;
  role: string;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to create user',
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

const updateUser = async (
  userId: string,
  userData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    role?: string;
    isActive?: boolean;
  }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to update user',
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating user:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to delete user',
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

/** Fetch current user permissions and accessible features (GET /api/v1/auth/permissions) */
const fetchPermissions = async (): Promise<PermissionsResponse> => {
  const response = await authFetch(`${API_BASE_URL}/auth/permissions`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch permissions');
  const result = await response.json();
  return result.data as PermissionsResponse;
};

const createRole = async (roleData: {
  name: string;
  description?: string;
  permissions: string[];
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/roles`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(roleData),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to create role',
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error creating role:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

// ============================================================================
// TABLE CONFIGURATION
// ============================================================================

const columns: TableColumn[] = [
  {
    key: 'username',
    label: 'Username',
    sortable: true,
    filterable: false,
  },
  {
    key: 'fullName',
    label: 'Full Name',
    sortable: true,
    filterable: false,
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
    filterable: false,
  },
  {
    key: 'role',
    label: 'Role',
    sortable: true,
    filterable: true,
    render: (value: UserRole) => (
      <div className="flex items-center space-x-2">
        {value === 'SUPER_ADMIN' || value === 'ADMIN' ? (
          <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        ) : (
          <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        )}
        <span className="font-medium text-gray-900 dark:text-white">
          {formatRoleName(value)}
        </span>
      </div>
    ),
  },
  {
    key: 'phone',
    label: 'Phone',
    sortable: true,
    filterable: false,
    render: (value: string | undefined) => (
      <span className="text-gray-900 dark:text-white">
        {value || 'N/A'}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    filterable: true,
    render: (value: UserStatus) => {
      const base = 'px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center justify-center';
      if (value === 'Active') {
        return (
          <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}>
            Active
          </span>
        );
      }
      if (value === 'Inactive') {
        return (
          <span className={`${base} bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200`}>
            Inactive
          </span>
        );
      }
      return (
        <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>
          Suspended
        </span>
      );
    },
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UserManagementPage: React.FC = () => {
  // UI State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  
  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeCreateTab, setActiveCreateTab] = useState<'user' | 'roles'>('user');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Data State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<ApiUserDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ label: string; value: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Permissions from GET /api/v1/auth/permissions (lib/permissions.ts, docs/API_PERMISSIONS.md)
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);

  // Role creation form: matrix of form rows × View/Add/Edit/Delete (stored as permission strings → boolean)
  const [roleFormName, setRoleFormName] = useState('');
  const [roleFormDescription, setRoleFormDescription] = useState('');
  const [permissionMatrix, setPermissionMatrix] = useState<Record<string, boolean>>({});
  const [formSearchQuery, setFormSearchQuery] = useState('');

  // Derived capability flags (gate UI by permission)
  const canViewUsers = hasPermission(userPermissions, USERS_VIEW);
  const canCreateUser = hasPermission(userPermissions, USERS_CREATE);
  const canUpdateUser = hasPermission(userPermissions, USERS_UPDATE);
  const canDeleteUser = hasPermission(userPermissions, USERS_DELETE);
  const canCreateRole = hasPermission(userPermissions, ROLES_CREATE);
  const canShowCreateButton = canCreateUser || canCreateRole;

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setError(null);
    setIsLoading(true);
    setPermissionsLoading(true);
    try {
      const perms = await fetchPermissions();
      const permissions = perms.permissions || [];
      setUserPermissions(permissions);

      await loadRoles();
      if (hasPermission(permissions, USERS_VIEW)) await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      setUserPermissions([]);
    } finally {
      setPermissionsLoading(false);
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error: any) {
      console.error('Error loading users:', error);
      throw error;
    }
  };

  const loadRoles = async () => {
    try {
      const data = await fetchRoles();
      const roleOptions = data.map(role => ({
        label: formatRoleName(role.name),
        value: role.name, // Use role name instead of ID
      }));
      setRoles(roleOptions);
    } catch (error: any) {
      console.error('Error loading roles:', error);
      throw error;
    }
  };

  const loadUserDetails = async (userId: string) => {
    try {
      const details = await fetchUserById(userId);
      setSelectedUserDetails(details);
    } catch (error: any) {
      console.error('Error loading user details:', error);
      setError('Failed to load user details');
    }
  };

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    clearAuth();
    redirectToLogin();
  };

  // Create User / Role Handlers
  const handleCreateUser = () => {
    setIsCreateModalOpen(true);
    setActiveCreateTab(canCreateUser ? 'user' : 'roles');
  };

  const resetRoleForm = () => {
    setRoleFormName('');
    setRoleFormDescription('');
    setPermissionMatrix({});
    setFormSearchQuery('');
    setError(null);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setActiveCreateTab('user');
    setError(null);
    resetRoleForm();
  };

  /** Get permission strings for a row + action (e.g. row "customers" + "view" → ["customers:view"]) */
  const getPermsForAction = (row: FormPermissionRow, action: PermissionAction): string[] => {
    const p = row.permissions[action];
    if (!p) return [];
    return Array.isArray(p) ? p : [p];
  };

  const getFormPermission = (row: FormPermissionRow, action: PermissionAction): boolean => {
    const perms = getPermsForAction(row, action);
    if (perms.length === 0) return false;
    return perms.every((perm) => Boolean(permissionMatrix[perm]));
  };

  const setFormPermission = (row: FormPermissionRow, action: PermissionAction, value: boolean) => {
    const perms = getPermsForAction(row, action);
    setPermissionMatrix((prev) => {
      const next = { ...prev };
      perms.forEach((perm) => { next[perm] = value; });
      return next;
    });
  };

  const isFormFullySelected = (row: FormPermissionRow): boolean =>
    PERMISSION_ACTIONS.every((action) => {
      const perms = getPermsForAction(row, action);
      if (perms.length === 0) return true;
      return perms.every((perm) => Boolean(permissionMatrix[perm]));
    });

  const setFormAllPermissions = (row: FormPermissionRow, value: boolean) => {
    setPermissionMatrix((prev) => {
      const next = { ...prev };
      PERMISSION_ACTIONS.forEach((action) => {
        getPermsForAction(row, action).forEach((perm) => { next[perm] = value; });
      });
      return next;
    });
  };

  const buildPermissionsFromMatrix = (): string[] =>
    Object.entries(permissionMatrix)
      .filter(([, selected]) => selected)
      .map(([perm]) => perm);

  const handleRoleMatrixSubmit = async () => {
    const name = roleFormName.trim();
    if (!name) {
      setError('Role name is required.');
      return;
    }
    const permissions = buildPermissionsFromMatrix();
    if (permissions.length === 0) {
      setError('At least one permission is required. Select View, Add, Edit, or Delete for one or more forms.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createRole({
        name,
        description: roleFormDescription.trim() || undefined,
        permissions,
      });

      if (result.success) {
        alert(`Role "${name}" created successfully.`);
        handleCloseCreateModal();
        await loadRoles();
      } else {
        setError(result.error || 'Failed to create role');
      }
    } catch (err: any) {
      console.error('Error creating role:', err);
      setError('Failed to create role. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserSubmit = async (data: Record<string, any>) => {
    // Validate password match
    if (data.password !== data.confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Split fullName into firstName and lastName
      const nameParts = (data.fullName || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const payload = {
        firstName,
        lastName,
        email: data.email,
        phone: data.phone || undefined,
        username: data.username,
        password: data.password,
        role: data.role, // Send role name, not roleId
      };

      const result = await createUser(payload);
      
      if (result.success) {
        alert(`User "${data.username}" created successfully.`);
        handleCloseCreateModal();
        await loadUsers();
      } else {
        setError(result.error || 'Failed to create user');
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      setError('Failed to create user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // View User Handlers
  const handleViewUser = async (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
    setError(null);
    await loadUserDetails(user.id);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedUser(null);
    setSelectedUserDetails(null);
    setError(null);
  };

  // Update User Handlers
  const handleUpdateUser = async (user: User) => {
    setSelectedUser(user);
    setError(null);
    await loadUserDetails(user.id);
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedUser(null);
    setSelectedUserDetails(null);
    setError(null);
  };

  const handleUserUpdate = async (data: Record<string, any>) => {
    if (!selectedUser || !selectedUserDetails) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Split fullName into firstName and lastName
      const nameParts = (data.fullName || '').trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const payload: any = {};
      
      // Only include changed fields
      if (firstName !== selectedUserDetails.firstName) {
        payload.firstName = firstName;
      }
      if (lastName !== selectedUserDetails.lastName) {
        payload.lastName = lastName;
      }
      if (data.email !== selectedUserDetails.email) {
        payload.email = data.email;
      }
      if (data.phone !== selectedUserDetails.phone) {
        payload.phone = data.phone || undefined;
      }
      if (data.role !== selectedUserDetails.role) {
        payload.role = data.role;
      }
      
      const isActive = data.status === 'Active';
      if (isActive !== selectedUserDetails.isActive) {
        payload.isActive = isActive;
      }

      // Only send request if there are changes
      if (Object.keys(payload).length === 0) {
        setError('No changes detected');
        return;
      }

      const result = await updateUser(selectedUser.id, payload);
      
      if (result.success) {
        alert(`User "${selectedUser.username}" updated successfully.`);
        handleCloseUpdateModal();
        await loadUsers();
      } else {
        setError(result.error || 'Failed to update user');
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      setError('Failed to update user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete User Handlers
  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
    setError(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
    setError(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await deleteUser(selectedUser.id);
      
      if (result.success) {
        alert(`User "${selectedUser.username}" deleted successfully.`);
        handleCloseDeleteModal();
        await loadUsers();
      } else {
        setError(result.error || 'Failed to delete user');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    console.log('Form cleared');
  };

  // ============================================================================
  // FORM CONFIGURATIONS
  // ============================================================================

  const userFields: FormField[] = [
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      placeholder: 'Enter username',
      required: true,
    },
    {
      name: 'fullName',
      label: 'Full Name',
      type: 'text',
      placeholder: 'Enter full name',
      required: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'Enter email address',
      required: true,
      validation: validateEmail,
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'phone',
      placeholder: 'Enter contact number',
      required: false,
      validation: validatePhoneNumber,
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
      placeholder: 'Enter password',
      required: true,
    },
    {
      name: 'confirmPassword',
      label: 'Confirm Password',
      type: 'password',
      placeholder: 'Re-enter password',
      required: true,
    },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      placeholder: 'Select role',
      required: true,
      options: roles,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'Select status',
      required: true,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
    },
  ];

  const updateUserFields: FormField[] = [
    {
      name: 'username',
      label: 'Username',
      type: 'text',
      placeholder: 'Enter username',
      required: true,
      disabled: true,
    },
    {
      name: 'fullName',
      label: 'Full Name',
      type: 'text',
      placeholder: 'Enter full name',
      required: true,
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      placeholder: 'Enter email address',
      required: true,
      validation: validateEmail,
    },
    {
      name: 'phone',
      label: 'Phone Number',
      type: 'phone',
      placeholder: 'Enter contact number',
      required: false,
      validation: validatePhoneNumber,
    },
    {
      name: 'role',
      label: 'Role',
      type: 'select',
      placeholder: 'Select role',
      required: true,
      options: roles,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      placeholder: 'Select status',
      required: true,
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
    },
  ];

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  const getUpdateInitialData = (user: User | null) => {
    if (!user || !selectedUserDetails) return {};

    return {
      username: selectedUserDetails.username,
      fullName: `${selectedUserDetails.firstName} ${selectedUserDetails.lastName}`.trim(),
      email: selectedUserDetails.email,
      phone: selectedUserDetails.phone || '',
      role: selectedUserDetails.role,
      status: mapApiStatusToFrontend(selectedUserDetails.isActive),
    };
  };

  const getDeleteDetails = (user: User | null) => {
    if (!user) return [];

    return [
      { label: 'Username', value: user.username },
      { label: 'Full Name', value: user.fullName },
      { label: 'Email', value: user.email },
      { label: 'Role', value: formatRoleName(user.role) },
      { label: 'Status', value: user.status },
    ];
  };

  const getRowClassName = (user: User) => {
    if (user.status === 'Suspended') return 'bg-red-50/60 dark:bg-red-950/40';
    if (user.status === 'Inactive') return 'bg-gray-50 dark:bg-slate-900/40';
    return '';
  };

  const actions: ActionButton[] = useMemo(
    () => [
      {
        label: '',
        icon: <Eye className="w-4 h-4" />,
        variant: 'secondary',
        onClick: handleViewUser,
        tooltip: 'View User',
        shouldShow: () => canViewUsers,
        className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
      },
      {
        label: '',
        icon: <Pencil className="w-4 h-4" />,
        variant: 'primary',
        onClick: handleUpdateUser,
        tooltip: 'Update User',
        shouldShow: () => canUpdateUser,
        className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500',
      },
      {
        label: '',
        icon: <Trash2 className="w-4 h-4" />,
        variant: 'danger',
        onClick: handleDeleteUser,
        tooltip: 'Delete User',
        shouldShow: () => canDeleteUser,
        className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500 dark:focus:ring-red-500',
      },
    ],
    [canViewUsers, canUpdateUser, canDeleteUser]
  );

  const renderProfileContent = () => {
    if (!selectedUser || !selectedUserDetails) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading user details...</div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              User Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Username:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {selectedUserDetails.username}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Full Name:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {`${selectedUserDetails.firstName} ${selectedUserDetails.lastName}`.trim()}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Email:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {selectedUserDetails.email}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {selectedUserDetails.phone || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Role:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium flex items-center">
                  {selectedUserDetails.role === 'SUPER_ADMIN' || selectedUserDetails.role === 'ADMIN' ? (
                    <Shield className="w-4 h-4 mr-1 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <User className="w-4 h-4 mr-1 text-gray-600 dark:text-gray-400" />
                  )}
                  {formatRoleName(selectedUserDetails.role)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                <span className="ml-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ${
                      selectedUserDetails.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200'
                    }`}
                  >
                    {selectedUserDetails.isActive ? 'Active' : 'Inactive'}
                  </span>
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Last Login:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {selectedUserDetails.lastLoginAt
                    ? new Date(selectedUserDetails.lastLoginAt).toLocaleString('en-LK')
                    : 'Never'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Created At:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {new Date(selectedUserDetails.createdDate).toLocaleString('en-LK')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
      <Navbar onMenuClick={handleMenuClick} />

      <Sidebar
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={handleMobileSidebarClose}
        onExpandedChange={setIsSidebarExpanded}
      />

      <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${
        isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
      }`}>
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                User Management
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage system users, roles, and permissions. Only Admin and Super Admin can create user accounts.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {permissionsLoading || isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">
                {permissionsLoading ? 'Checking permissions...' : 'Loading users...'}
              </div>
            </div>
          ) : !canViewUsers ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
              <Lock className="w-12 h-12 text-gray-400 dark:text-slate-500 mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">Access denied</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                You need <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700">users:view</code> (or administration access) to view users.
              </p>
            </div>
          ) : (
            <Table
              data={users}
              columns={columns}
              actions={actions}
              itemsPerPage={10}
              searchable
              filterable
              onCreateClick={canShowCreateButton ? handleCreateUser : undefined}
              createButtonLabel="Create"
              getRowClassName={getRowClassName}
              emptyMessage="No users found."
            />
          )}
        </div>
      </main>

      {/* Create Modal (User + Roles tabs) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Create
              </h2>
              <Tooltip content="Close">
                <button
                  onClick={handleCloseCreateModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            {/* Tabs: only when user can create both users and roles */}
            {canCreateUser && canCreateRole && (
              <div className="border-b border-gray-200 dark:border-slate-700 px-6">
                <div className="flex space-x-4">
                  <Tooltip content="Create a new user account">
                    <button
                      onClick={() => setActiveCreateTab('user')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeCreateTab === 'user'
                          ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      User
                    </button>
                  </Tooltip>
                  <Tooltip content="Create a new role with permissions">
                    <button
                      onClick={() => setActiveCreateTab('roles')}
                      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeCreateTab === 'roles'
                          ? 'border-blue-600 dark:border-indigo-600 text-blue-600 dark:text-indigo-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Roles
                    </button>
                  </Tooltip>
                </div>
              </div>
            )}

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              {(activeCreateTab === 'user' && canCreateUser) ? (
                <CreateForm
                  title="User Details"
                  fields={userFields}
                  onSubmit={handleUserSubmit}
                  onClear={handleClear}
                  submitButtonLabel="Create User"
                  clearButtonLabel="Clear"
                  loading={isSubmitting}
                  enableDynamicSpecs={false}
                  className="shadow-none border-0 p-0"
                />
              ) : (activeCreateTab === 'roles' && canCreateRole) ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Role Details
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Role Name
                      </label>
                      <input
                        type="text"
                        value={roleFormName}
                        onChange={(e) => setRoleFormName(e.target.value)}
                        placeholder="e.g. ADMIN, SECURITY_OFFICER, STOCKKEEPER"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Description (optional)
                      </label>
                      <textarea
                        value={roleFormDescription}
                        onChange={(e) => setRoleFormDescription(e.target.value)}
                        placeholder="Enter role description"
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400"
                      />
                    </div>
                  </div>

                  <div className="border border-gray-200 dark:border-slate-600 rounded-lg overflow-hidden">
                    <div className="flex flex-col gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 sm:flex-row sm:items-center sm:justify-between">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={formSearchQuery}
                          onChange={(e) => setFormSearchQuery(e.target.value)}
                          placeholder="Search by Form"
                          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400"
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Count: {PERMISSION_MATRIX_ROWS.filter((r) => !formSearchQuery.trim() || r.label.toLowerCase().includes(formSearchQuery.trim().toLowerCase()) || r.key.toLowerCase().includes(formSearchQuery.trim().toLowerCase())).length}
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-[min(50vh,400px)] overflow-y-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                        <thead className="bg-gray-100 dark:bg-slate-700 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                              #
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                              Form Name
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300" title="Select/deselect View, Add, Edit, Delete for this row">
                              All
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                              View
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                              Add
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                              Edit
                            </th>
                            <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                              Delete
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white dark:divide-slate-600 dark:bg-slate-800">
                          {PERMISSION_MATRIX_ROWS.filter(
                            (r) =>
                              !formSearchQuery.trim() ||
                              r.label.toLowerCase().includes(formSearchQuery.trim().toLowerCase()) ||
                              r.key.toLowerCase().includes(formSearchQuery.trim().toLowerCase())
                          ).map((row, idx) => (
                            <tr key={row.key} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                              <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                {row.label}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={isFormFullySelected(row)}
                                  onChange={() => setFormAllPermissions(row, !isFormFullySelected(row))}
                                  title={isFormFullySelected(row) ? 'Deselect all' : 'Select all (View, Add, Edit, Delete)'}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-slate-500 dark:bg-slate-700 dark:checked:bg-blue-600"
                                />
                              </td>
                              {PERMISSION_ACTIONS.map((action) => {
                                const perms = getPermsForAction(row, action);
                                const hasAction = perms.length > 0;
                                return (
                                  <td key={action} className="px-4 py-2 text-center">
                                    {hasAction ? (
                                      <input
                                        type="checkbox"
                                        checked={getFormPermission(row, action)}
                                        onChange={() => setFormPermission(row, action, !getFormPermission(row, action))}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-slate-500 dark:bg-slate-700 dark:checked:bg-blue-600"
                                      />
                                    ) : (
                                      <span className="text-gray-300 dark:text-slate-600">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleRoleMatrixSubmit}
                      disabled={isSubmitting}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={resetRoleForm}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-300 dark:hover:bg-slate-600"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Update User Modal */}
      {isUpdateModalOpen && selectedUser && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Update User
              </h2>
              <Tooltip content="Close">
                <button
                  onClick={handleCloseUpdateModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              {!selectedUserDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500 dark:text-gray-400">Loading user details...</div>
                </div>
              ) : (
                <UpdateForm
                  title="Update User Details"
                  fields={updateUserFields}
                  onSubmit={handleUserUpdate}
                  onClear={handleClear}
                  submitButtonLabel="Update User"
                  clearButtonLabel="Reset"
                  loading={isSubmitting}
                  initialData={getUpdateInitialData(selectedUser)}
                  className="shadow-none border-0 p-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Delete User
              </h2>
              <Tooltip content="Close">
                <button
                  onClick={handleCloseDeleteModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  disabled={isSubmitting}
                >
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              <DeleteForm
                title="Delete User"
                message="This will permanently delete the user and revoke their access to the system. This action cannot be undone."
                itemName={selectedUser.username}
                itemDetails={getDeleteDetails(selectedUser)}
                onConfirm={handleConfirmDelete}
                onCancel={handleCloseDeleteModal}
                confirmButtonLabel="Delete User"
                cancelButtonLabel="Cancel"
                loading={isSubmitting}
                className="shadow-none border-0 p-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* View User Profile Modal */}
      {isViewModalOpen && selectedUser && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  User Profile
                </h2>
              </div>
              <Tooltip content="Close">
                <button
                  onClick={handleCloseViewModal}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {renderProfileContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;