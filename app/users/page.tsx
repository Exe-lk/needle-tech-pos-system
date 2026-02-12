'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/src/components/common/navbar';
import Sidebar from '@/src/components/common/sidebar';
import Table, { TableColumn, ActionButton } from '@/src/components/table/table';
import CreateForm, { FormField } from '@/src/components/form-popup/create';
import UpdateForm from '@/src/components/form-popup/update';
import DeleteForm from '@/src/components/form-popup/delete';
import { Eye, Pencil, Trash2, X, Shield, User } from 'lucide-react';
import Tooltip from '@/src/components/common/tooltip';
import { validateEmail, validatePhoneNumber } from '@/src/utils/validation';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const AUTH_ACCESS_TOKEN_KEY = 'needletech_access_token';

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
    'USER': 'User'
  };
  return roleMap[role] || role;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users?limit=1000`, {
      method: 'GET',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE_URL}/roles?limit=100`, {
      method: 'GET',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
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

const createRole = async (roleData: {
  name: string;
  description?: string;
  permissions: string[];
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      method: 'POST',
      headers: getAuthHeaders(),
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

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([loadUsers(), loadRoles()]);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
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
    localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
    localStorage.removeItem('needletech_refresh_token');
    localStorage.removeItem('needletech_user');
    window.location.href = '/';
  };

  // Create User / Role Handlers
  const handleCreateUser = () => {
    setIsCreateModalOpen(true);
    setActiveCreateTab('user');
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setActiveCreateTab('user');
    setError(null);
  };

  const handleRoleSubmit = async (data: Record<string, any>) => {
    const name = (data.roleName || '').trim();
    if (!name) {
      setError('Role name is required.');
      return;
    }
    const permissions = (data.permissionsText || '')
      .split('\n')
      .map((p: string) => p.trim())
      .filter(Boolean);
    if (permissions.length === 0) {
      setError('At least one permission is required (e.g. * or users:read).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createRole({
        name,
        description: (data.roleDescription || '').trim() || undefined,
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

  const roleFields: FormField[] = [
    {
      name: 'roleName',
      label: 'Role Name',
      type: 'text',
      placeholder: 'e.g. MANAGER, OPERATOR',
      required: true,
    },
    {
      name: 'roleDescription',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Enter role description (optional)',
      required: false,
      rows: 2,
    },
    {
      name: 'permissionsText',
      label: 'Permissions',
      type: 'textarea',
      placeholder: 'One permission per line (e.g. users:read, users:write, *)',
      required: true,
      rows: 5,
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

  const actions: ActionButton[] = [
    {
      label: '',
      icon: <Eye className="w-4 h-4" />,
      variant: 'secondary',
      onClick: handleViewUser,
      tooltip: 'View User',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 border border-gray-300 dark:border-slate-600',
    },
    {
      label: '',
      icon: <Pencil className="w-4 h-4" />,
      variant: 'primary',
      onClick: handleUpdateUser,
      tooltip: 'Update User',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-700 focus:ring-blue-500 dark:focus:ring-indigo-500',
    },
    {
      label: '',
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'danger',
      onClick: handleDeleteUser,
      tooltip: 'Delete User',
      className: 'w-8 h-8 p-0 flex items-center justify-center rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-slate-800 bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500 dark:focus:ring-red-500',
    },
  ];

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

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">Loading users...</div>
            </div>
          ) : (
            <Table
              data={users}
              columns={columns}
              actions={actions}
              itemsPerPage={10}
              searchable
              filterable
              onCreateClick={handleCreateUser}
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

            {/* Tabs */}
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

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              {activeCreateTab === 'user' ? (
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
              ) : (
                <CreateForm
                  title="Role Details"
                  fields={roleFields}
                  onSubmit={handleRoleSubmit}
                  onClear={handleClear}
                  submitButtonLabel="Create Role"
                  clearButtonLabel="Clear"
                  loading={isSubmitting}
                  enableDynamicSpecs={false}
                  className="shadow-none border-0 p-0"
                />
              )}
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