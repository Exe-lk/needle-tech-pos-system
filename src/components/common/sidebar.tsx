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
    Boxes,
    History,
    Clipboard
} from 'lucide-react';

interface SidebarProps {
    className?: string;
    onLogout?: () => void;
    isMobileOpen?: boolean;
    onMobileClose?: () => void;
    onExpandedChange?: (isExpanded: boolean) => void;
    hasNavbar?: boolean;
    navbarHeight?: number;
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
    hasNavbar = true,
    navbarHeight = 70,
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
            label: 'Customer Management',
            href: '/customers',
        },
        {
            icon: Truck,
            label: 'Machine Management',
            href: '/machines',
        },
        {
            icon: Boxes,
            label: 'Inventory Management',
            href: '/inventory',
        },
        {
            icon: FileText,
            label: 'Rental Agreement',
            href: '/rental-agreement',
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
            icon: History,
            label: 'Transaction Log ',
            href: '/transaction-log',
        },
        {
            icon: Clipboard,
            label: ' Bincard',
            href: '/bincard',
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

    // Calculate sidebar position and height based on navbar presence
    const sidebarTop = hasNavbar ? `${navbarHeight}px` : '0';
    const sidebarHeight = hasNavbar ? `calc(100vh - ${navbarHeight}px)` : '100vh';

    // Tooltip component for consistent styling
    const Tooltip = ({ label, className: tooltipClassName = '' }: { label: string; className?: string }) => (
        <div className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-slate-800 dark:bg-slate-700 text-white px-2 py-1.5 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999] whitespace-nowrap shadow-lg ${tooltipClassName}`}>
            {label.trim()}
            {/* Tooltip arrow */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800 dark:border-r-slate-700"></div>
        </div>
    );

    return (
        <>
            <div
                className={`bg-[#F6F9FF] dark:bg-slate-900 fixed left-0 z-50 transition-[width,transform] duration-300 ease-in-out ${isExpanded ? 'w-[300px]' : 'w-16'
                    } flex flex-col ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } border-r border-gray-200 dark:border-slate-800 ${className}`}
                style={{
                    top: sidebarTop,
                    height: sidebarHeight,
                    overflow: 'visible', // Allow tooltips to escape
                }}
            >
                {/* Top Section - Collapse/Expand Toggle Button */}
                <div className={`border-b border-gray-200 dark:border-slate-800 ${isExpanded ? 'p-4' : 'p-2'}`} style={{ overflow: 'visible' }}>
                    <button
                        onClick={toggleSidebar}
                        className={`flex items-center rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-[background-color,box-shadow,color] duration-150 text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-indigo-400 group relative w-full ${isExpanded ? 'p-3' : 'p-2 justify-center'}`}
                        aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                        style={{ overflow: 'visible' }}
                    >
                        {isExpanded ? (
                            <>
                                <ChevronLeft className="w-5 h-5 flex-shrink-0" />
                                
                            </>
                        ) : (
                            <>
                                <ChevronRight className="w-5 h-5 flex-shrink-0" />
                                <Tooltip label="Expand" />
                            </>
                        )}
                    </button>
                </div>

                {/* Menu Sections - Start from top with padding */}
                <nav className={`flex-1 ${isExpanded ? 'p-4 overflow-y-auto' : 'p-2 overflow-visible'}`} style={{ overflow: isExpanded ? 'auto' : 'visible' }}>
                    <ul className="space-y-2" style={{ overflow: 'visible' }}>
                        {menuSections.map((section, index) => {
                            const sectionActive = isSectionActive(section);
                            const hasChildren = !!section.children && section.children.length > 0;
                            const groupOpen = hasChildren
                                ? isGroupOpen(section.label, section)
                                : false;

                            return (
                                <li key={index} style={{ overflow: 'visible', position: 'relative' }}>
                                    {/* Parent item */}
                                    <div
                                        className={`flex items-center rounded-lg transition-[background-color,box-shadow] duration-150 group relative cursor-pointer ${isExpanded ? 'p-3' : 'p-2 justify-center'} ${sectionActive
                                            ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-indigo-400 font-semibold border border-blue-100 dark:border-indigo-500/30'
                                            : 'text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm hover:text-blue-600 dark:hover:text-indigo-400'
                                            }`}
                                        onClick={() => {
                                            if (hasChildren) {
                                                toggleGroup(section.label);
                                            } else if (section.href) {
                                                window.location.href = section.href;
                                                if (onMobileClose) onMobileClose();
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={section.label}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                if (hasChildren) {
                                                    toggleGroup(section.label);
                                                } else if (section.href) {
                                                    window.location.href = section.href;
                                                    if (onMobileClose) onMobileClose();
                                                }
                                            }
                                        }}
                                        style={{ overflow: 'visible' }}
                                    >
                                        <section.icon
                                            className={`w-5 h-5 flex-shrink-0 ${sectionActive ? 'text-blue-600 dark:text-indigo-400' : ''
                                                }`}
                                        />
                                        {isExpanded && (
                                            <span className="ml-3 text-sm font-medium whitespace-nowrap flex-1">
                                                {section.label}
                                            </span>
                                        )}
                                        {!isExpanded && (
                                            <Tooltip label={section.label} />
                                        )}
                                        {hasChildren && isExpanded && (
                                            <span className="ml-2 text-xs text-gray-500 dark:text-slate-400">
                                                {groupOpen ? '−' : '+'}
                                            </span>
                                        )}
                                        {section.adminOnly && isExpanded && (
                                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800">
                                                Admin
                                            </span>
                                        )}
                                    </div>

                                    {/* Children */}
                                    {hasChildren && groupOpen && (
                                        <ul
                                            className={`mt-1 ml-4 border-l border-gray-200 dark:border-slate-700 pl-3 space-y-1 ${isExpanded ? '' : 'hidden'
                                                }`}
                                            style={{ overflow: 'visible' }}
                                        >
                                            {section.children!.map((child, childIndex) => {
                                                const childActive = isActive(child.href);
                                                return (
                                                    <li key={childIndex} style={{ overflow: 'visible', position: 'relative' }}>
                                                        <a
                                                            href={child.href}
                                                            className={`flex items-center p-2 rounded-lg text-xs transition-[background-color,color] duration-150 group relative ${childActive
                                                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-indigo-400 font-semibold shadow-sm border border-blue-100 dark:border-indigo-500/30'
                                                                : 'text-gray-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-indigo-400'
                                                                }`}
                                                            onClick={onMobileClose}
                                                            aria-label={child.label}
                                                            style={{ overflow: 'visible' }}
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-slate-500 mr-2" />
                                                            <span className="whitespace-nowrap">{child.label}</span>
                                                            {!isExpanded && (
                                                                <Tooltip label={child.label} />
                                                            )}
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

                {/* Bottom Section - Logout Button */}
                <div className={`border-t border-gray-200 dark:border-slate-800 ${isExpanded ? 'p-4' : 'p-2'}`} style={{ overflow: 'visible' }}>
                    <button
                        onClick={handleLogout}
                        className={`flex items-center rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm transition-[background-color,box-shadow,color] duration-150 text-gray-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 group relative w-full ${isExpanded ? 'p-3' : 'p-2 justify-center'}`}
                        aria-label="Logout"
                        style={{ overflow: 'visible' }}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {isExpanded && (
                            <span className="ml-3 text-sm font-medium">Logout</span>
                        )}
                        {!isExpanded && (
                            <Tooltip label="Logout" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 backdrop-blur-md bg-black/10 dark:bg-black/40 z-40 lg:hidden"
                    onClick={onMobileClose}
                />
            )}
        </>
    );
};

export default Sidebar;