import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { APP_VERSION } from '@/src/utils/version';
import {
  Monitor,
  Users,
  CreditCard,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Truck,
  Undo,
  Shield,
  Bell,
  BarChart3,
  Boxes
} from 'lucide-react';

interface SidebarProps {
  className?: string;
  onLogout?: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  onExpandedChange?: (isExpanded: boolean) => void;
}

type MenuChild = {
  label: string;
  href: string;
};

type MenuSection = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  children?: MenuChild[];
  adminOnly?: boolean;
};

const Sidebar: React.FC<SidebarProps> = ({
  className,
  onLogout,
  isMobileOpen,
  onMobileClose,
  onExpandedChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  const menuSections: MenuSection[] = [
    {
      icon: Monitor,
      label: 'Dashboard',
      href: '/dashboard',
    },
    {
      icon: Users,
      label: 'Customer Management', href: '/customers',
    
    },
    {
      icon: Truck,
      label: 'Machine Management', href: '/machines',
   
    },
    {
        icon: Boxes,
        label: 'Inventory Management', href: '/inventory',
     
    },
    {
      icon: FileText,
      label: 'Rental Agreement', href: '/rental-agreement',
      
    },
    {
      icon: Truck,
      label: 'Gate Pass',
      href: '/gatepass',
    },
    {
      icon: Undo,
      label: 'Returns Management',
      href: '/returns',
    },
    {
      icon: CreditCard,
      label: 'Invoice & Payments',
      href: '/invoice',
    },
    {
      icon: Bell,
      label: 'Outstanding Alerts',
      href: '/outstanding-alerts',
    },
    {
      icon: BarChart3,
      label: 'Analytics ',
      href: '/analytics'
    },
    {
      icon: Shield,
      label: 'User Management ',
      href: '/users'
    },
  ];

  const isActive = (href: string): boolean => {
    if (!href) return false;
    if (pathname === href) return true;
    if (pathname.startsWith(href + '/')) return true;
    return false;
  };

  const isSectionActive = (section: MenuSection): boolean => {
    if (section.href && isActive(section.href)) return true;
    if (section.children) {
      return section.children.some((child) => isActive(child.href));
    }
    return false;
  };

  const isGroupOpen = (label: string, section: MenuSection): boolean => {
    if (openGroups[label] !== undefined) return openGroups[label];
    // default: open if this section (or one of its children) is active
    return isSectionActive(section);
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const toggleSidebar = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (onExpandedChange) {
      onExpandedChange(newExpanded);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <>
      <div
        className={`bg-[#F6F9FF] dark:bg-slate-900 fixed left-0 z-50 transition-[width,transform] duration-300 ease-in-out ${
          isExpanded ? 'w-[300px]' : 'w-16'
        } flex flex-col ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${className}`}
        style={{
          top: '70px',
          height: 'calc(100vh - 70px)',
        }}
      >
        {/* Header with toggle button */}
        <div className="p-4 flex items-center justify-end border-b border-gray-200 dark:border-slate-700">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 transition-[background-color] duration-150"
          >
            {isExpanded ? (
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>

        {/* Menu Sections */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuSections.map((section, index) => {
              const sectionActive = isSectionActive(section);
              const hasChildren = !!section.children && section.children.length > 0;
              const groupOpen = hasChildren
                ? isGroupOpen(section.label, section)
                : false;

              return (
                <li key={index}>
                  {/* Parent item */}
                  <div
                    className={`flex items-center p-3 rounded-lg transition-[background-color,box-shadow] duration-150 group relative cursor-pointer ${
                      sectionActive
                        ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-indigo-400 font-semibold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm hover:text-blue-600 dark:hover:text-indigo-400'
                    }`}
                    onClick={() => {
                      if (hasChildren) {
                        toggleGroup(section.label);
                      } else if (section.href) {
                        // Use normal navigation for now
                        window.location.href = section.href;
                        if (onMobileClose) onMobileClose();
                      }
                    }}
                  >
                    <section.icon
                      className={`w-5 h-5 flex-shrink-0 ${
                        sectionActive ? 'text-blue-600 dark:text-indigo-400' : ''
                      }`}
                    />
                    {isExpanded && (
                      <span className="ml-3 text-sm font-medium whitespace-nowrap flex-1">
                        {section.label}
                      </span>
                    )}
                    {!isExpanded && (
                      <div className="absolute left-16 bg-gray-800 dark:bg-slate-700 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                        {section.label}
                      </div>
                    )}
                    {hasChildren && isExpanded && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        {groupOpen ? '−' : '+'}
                      </span>
                    )}
                    {section.adminOnly && isExpanded && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                        Admin
                      </span>
                    )}
                  </div>

                  {/* Children */}
                  {hasChildren && groupOpen && (
                    <ul
                      className={`mt-1 ml-4 border-l border-gray-200 dark:border-slate-700 pl-3 space-y-1 ${
                        isExpanded ? '' : 'hidden'
                      }`}
                    >
                      {section.children!.map((child, childIndex) => {
                        const childActive = isActive(child.href);
                        return (
                          <li key={childIndex}>
                            <a
                              href={child.href}
                              className={`flex items-center p-2 rounded-lg text-xs transition-[background-color,color] duration-150 ${
                                childActive
                                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-indigo-400 font-semibold shadow-sm'
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-indigo-400'
                              }`}
                              onClick={onMobileClose}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mr-2" />
                              <span className="whitespace-nowrap">{child.label}</span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center p-3 w-full rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-[background-color,box-shadow,color] duration-150 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 group relative"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isExpanded && (
              <span className="ml-3 text-sm font-medium">Logout</span>
            )}
            {!isExpanded && (
              <div className="absolute left-16 bg-gray-800 dark:bg-slate-700 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                Logout
              </div>
            )}
          </button>
          
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
    </>
  );
};

export default Sidebar;