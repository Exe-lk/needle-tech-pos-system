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

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const AUTH_ACCESS_TOKEN_KEY = 'needletech_access_token';

// Type Definitions
type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'OPERATIONAL_OFFICER' | 'STOCK_KEEPER' | 'SECURITY_OFFICER';
type UserStatus = 'Active' | 'Inactive' | 'Suspended';

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

interface ApiUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roleId: string;
  roleName: UserRole;
  phone?: string;
  status: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserInfo {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  status: UserStatus;
  lastLogin?: string;
  createdAt: string;
}

// Helper Functions
const mapApiStatusToFrontend = (apiStatus: string): UserStatus => {
  switch (apiStatus.toUpperCase()) {
    case 'ACTIVE':
      return 'Active';
    case 'INACTIVE':
      return 'Inactive';
    case 'SUSPENDED':
      return 'Suspended';
    default:
      return 'Inactive';
  }
};

const mapFrontendStatusToApi = (frontendStatus: UserStatus): string => {
  return frontendStatus.toUpperCase();
};

const formatRoleName = (role: UserRole): string => {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'OPERATIONAL_OFFICER':
      return 'Operational Officer';
    case 'STOCK_KEEPER':
      return 'Stock Keeper';
    case 'SECURITY_OFFICER':
      return 'Security Officer';
    default:
      return role;
  }
};

// API Functions
const getAuthHeaders = () => {
  const token = localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

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

    const data = await response.json();
    const apiUsers: ApiUser[] = data.data?.items || [];

    return apiUsers.map(apiUser => ({
      id: apiUser.id,
      username: apiUser.username,
      email: apiUser.email,
      fullName: apiUser.fullName,
      role: apiUser.roleName,
      status: mapApiStatusToFrontend(apiUser.status),
      phone: apiUser.phone,
      lastLogin: apiUser.lastLogin,
      createdAt: apiUser.createdAt,
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

const fetchUserById = async (userId: string): Promise<ApiUser | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    const data = await response.json();
    return data.data as ApiUser;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
};

const fetchRoles = async (): Promise<{ id: string; name: string }[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      method: 'GET',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    return [];
  }
};

const createUser = async (userData: any): Promise<{ success: boolean; error?: string; data?: ApiUser }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to create user',
      };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

const updateUser = async (userId: string, userData: any): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to update user',
      };
    }

    return {
      success: true,
    };
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

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to delete user',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      error: error.message || 'Network error',
    };
  }
};

// Table column configuration
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

const UserManagementPage: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<ApiUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ label: string; value: string }[]>([]);

  // Fetch users and roles on component mount
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await fetchRoles();
      const roleOptions = data.map(role => ({
        label: formatRoleName(role.name as UserRole),
        value: role.id,
      }));
      setRoles(roleOptions);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadUserDetails = async (userId: string) => {
    try {
      const details = await fetchUserById(userId);
      setSelectedUserDetails(details);
    } catch (error) {
      console.error('Error loading user details:', error);
    }
  };

  const handleMenuClick = () => {
    setIsMobileSidebarOpen((prev) => !prev);
  };

  const handleMobileSidebarClose = () => {
    setIsMobileSidebarOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
    window.location.href = '/';
  };

  const handleCreateUser = () => {
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleViewUser = async (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
    await loadUserDetails(user.id);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedUser(null);
    setSelectedUserDetails(null);
  };

  const handleUpdateUser = async (user: User) => {
    setSelectedUser(user);
    await loadUserDetails(user.id);
    setIsUpdateModalOpen(true);
  };

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setSelectedUser(null);
    setSelectedUserDetails(null);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const result = await deleteUser(selectedUser.id);
      
      if (result.success) {
        alert(`User "${selectedUser.username}" deleted successfully.`);
        handleCloseDeleteModal();
        await loadUsers();
      } else {
        alert(`Failed to delete user: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form fields for User Creation
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
      name: 'roleId',
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
        { label: 'Suspended', value: 'Suspended' },
      ],
    },
  ];

  // Form fields for User Update (without password)
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
      name: 'roleId',
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
        { label: 'Suspended', value: 'Suspended' },
      ],
    },
  ];

  // Get initial data for update form
  const getUpdateInitialData = (user: User | null) => {
    if (!user || !selectedUserDetails) return {};

    return {
      username: selectedUserDetails.username,
      fullName: selectedUserDetails.fullName,
      email: selectedUserDetails.email,
      phone: selectedUserDetails.phone || '',
      roleId: selectedUserDetails.roleId,
      status: user.status,
    };
  };

  // Get delete confirmation details
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

  const handleUserSubmit = async (data: Record<string, any>) => {
    // Validate password match
    if (data.password !== data.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        username: data.username,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        password: data.password,
        roleId: data.roleId,
        status: mapFrontendStatusToApi(data.status),
      };

      const result = await createUser(payload);
      
      if (result.success) {
        alert(`User "${data.username}" created successfully.`);
        handleCloseCreateModal();
        await loadUsers();
      } else {
        alert(`Failed to create user: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Failed to create user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserUpdate = async (data: Record<string, any>) => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const payload = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        roleId: data.roleId,
        status: mapFrontendStatusToApi(data.status),
      };

      const result = await updateUser(selectedUser.id, payload);
      
      if (result.success) {
        alert(`User "${data.username}" updated successfully.`);
        handleCloseUpdateModal();
        await loadUsers();
      } else {
        alert(`Failed to update user: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    console.log('Form cleared');
  };

  const getRowClassName = (user: User) => {
    if (user.status === 'Suspended') return 'bg-red-50/60 dark:bg-red-950/40';
    if (user.status === 'Inactive') return 'bg-gray-50 dark:bg-slate-900/40';
    return '';
  };

  // Action buttons
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

  // View User Profile Content
  const renderProfileContent = () => {
    if (!selectedUser || !selectedUserDetails) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 dark:text-gray-400">Loading user details...</div>
        </div>
      );
    }

    const userInfo: UserInfo = {
      id: selectedUserDetails.id,
      username: selectedUserDetails.username,
      email: selectedUserDetails.email,
      fullName: selectedUserDetails.fullName,
      role: selectedUserDetails.roleName,
      phone: selectedUserDetails.phone,
      status: mapApiStatusToFrontend(selectedUserDetails.status),
      lastLogin: selectedUserDetails.lastLogin,
      createdAt: selectedUserDetails.createdAt,
    };

    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {/* User Info */}
          <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
              User Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Username:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {userInfo.username}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Full Name:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {userInfo.fullName}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Email:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {userInfo.email}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {userInfo.phone || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Role:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium flex items-center">
                  {userInfo.role === 'SUPER_ADMIN' || userInfo.role === 'ADMIN' ? (
                    <Shield className="w-4 h-4 mr-1 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <User className="w-4 h-4 mr-1 text-gray-600 dark:text-gray-400" />
                  )}
                  {formatRoleName(userInfo.role)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Status:</span>
                <span className="ml-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ${
                      userInfo.status === 'Active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : userInfo.status === 'Inactive'
                        ? 'bg-gray-100 text-gray-700 dark:bg-slate-700/60 dark:text-gray-200'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    }`}
                  >
                    {userInfo.status}
                  </span>
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Last Login:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {userInfo.lastLogin
                    ? new Date(userInfo.lastLogin).toLocaleString('en-LK')
                    : 'Never'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Created At:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">
                  {new Date(userInfo.createdAt).toLocaleString('en-LK')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950">
      {/* Top navbar */}
      <Navbar onMenuClick={handleMenuClick} />

      {/* Left sidebar */}
      <Sidebar
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={handleMobileSidebarClose}
        onExpandedChange={setIsSidebarExpanded}
      />

      {/* Main content area */}
      <main className={`pt-28 lg:pt-32 p-6 transition-all duration-300 ${
        isSidebarExpanded ? 'lg:ml-[300px]' : 'lg:ml-16'
      }`}>
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Page header */}
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

          {/* User table card */}
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
              createButtonLabel="Create User"
              getRowClassName={getRowClassName}
              emptyMessage="No users found."
            />
          )}
        </div>
      </main>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Create User
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

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
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
            </div>
          </div>
        </div>
      )}

      {/* Update User Modal */}
      {isUpdateModalOpen && selectedUser && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/20 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
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

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
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
            {/* Modal Header */}
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

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
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
            {/* Modal Header */}
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

            {/* Modal Content - Scrollable */}
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