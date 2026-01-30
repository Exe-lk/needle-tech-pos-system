import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { APP_VERSION } from '@/src/utils/version';
import { useSidebar } from '@/src/contexts/SidebarContext';
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
    Clipboard,
    ChevronDown,
    ChevronUp,
    ShoppingCart,
    Wrench,
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
    // Use context instead of local state
    const { isSidebarExpanded: isExpanded, setIsSidebarExpanded } = useSidebar();
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const pathname = usePathname();

    const menuSections: MenuSection[] = [
        {
            icon: Monitor,
            label: 'Dashboard',
            href: '/dashboard',
        },
        {
            icon: ShoppingCart,
            label: 'Purchase Order',
            href: '/purchase-order',
        },
        {
            icon: Users,
            label: 'Customer Management',
            href: '/customers',
        },
        {
            icon: Wrench,
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
            label: 'Hiring Machine Agreement',
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
            label: 'Transaction Log',
            href: '/transaction-log',
        },
        {
            icon: Clipboard,
            label: 'Bincard',
            href: '/bincard',
        },
        {
            icon: BarChart3,
            label: 'Analytics',
            href: '/analytics'
        },
        {
            icon: Shield,
            label: 'User Management',
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
        setIsSidebarExpanded(newExpanded);
        
        // Still call the callback if provided (for backward compatibility)
        if (onExpandedChange) {
            onExpandedChange(newExpanded);
        }
    };

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        }
    };

    // Handle navigation without expanding sidebar
    const handleNavigation = (href: string) => {
        if (href) {
            window.location.href = href;
            if (onMobileClose) onMobileClose();
            // Explicitly prevent sidebar expansion - navigation happens without changing isExpanded state
        }
    };

    // Calculate sidebar position and height based on navbar presence
    const sidebarTop = hasNavbar ? `${navbarHeight}px` : '0';
    const sidebarHeight = hasNavbar ? `calc(100vh - ${navbarHeight}px)` : '100vh';

    // Enhanced Tooltip component with better styling
    const Tooltip = ({ label, className: tooltipClassName = '' }: { label: string; className?: string }) => (
        <div className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-slate-900 dark:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[9999] whitespace-nowrap shadow-xl ${tooltipClassName}`}>
            {label.trim()}
            {/* Enhanced tooltip arrow */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900 dark:border-r-slate-700"></div>
        </div>
    );

    return (
        <>
            <div
                className={`bg-gradient-to-b from-[#F6F9FF] to-white dark:from-slate-900 dark:to-slate-950 fixed left-0 z-50 transition-all duration-300 ease-in-out ${isExpanded ? 'w-[280px]' : 'w-[72px]'
                    } flex flex-col ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    } border-r border-gray-200/80 dark:border-slate-800/80 backdrop-blur-sm ${className}`}
                style={{
                    top: sidebarTop,
                    height: sidebarHeight,
                    overflow: 'visible',
                }}
            >
                {/* Floating Collapse/Expand Toggle Button - Positioned on Right Edge, Vertically Centered */}
                <button
                    onClick={toggleSidebar}
                    className={`
                        absolute top-1/2 -translate-y-1/2 z-[60] 
                        ${isExpanded ? 'left-full -ml-5' : 'left-full -ml-5'}
                        w-11 h-11 
                        rounded-full 
                        bg-white dark:bg-slate-800 
                        border-2 border-blue-300 dark:border-indigo-600
                        shadow-lg hover:shadow-2xl
                        flex items-center justify-center
                        transition-all duration-300 ease-in-out
                        group
                        hover:bg-blue-50 dark:hover:bg-indigo-900/40
                        hover:border-blue-500 dark:hover:border-indigo-400
                        hover:scale-110
                        active:scale-95
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-indigo-400
                        backdrop-blur-sm
                    `}
                    aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    {isExpanded ? (
                        <ChevronLeft 
                            className="w-5 h-5 text-blue-600 dark:text-indigo-400 transition-transform duration-300 group-hover:text-blue-700 dark:group-hover:text-indigo-300" 
                        />
                    ) : (
                        <>
                            <ChevronRight 
                                className="w-5 h-5 text-blue-600 dark:text-indigo-400 transition-transform duration-300 group-hover:text-blue-700 dark:group-hover:text-indigo-300" 
                            />
                            <Tooltip label="Expand Sidebar" />
                        </>
                    )}
                </button>

                

                {/* Menu Sections - Enhanced with better spacing and styling */}
                <nav className={`flex-1 ${isExpanded ? 'px-3 py-4 overflow-y-auto' : 'px-2 py-4 overflow-visible'}`} style={{ overflow: isExpanded ? 'auto' : 'visible' }}>
                    <ul className="space-y-1" style={{ overflow: 'visible' }}>
                        {menuSections.map((section, index) => {
                            const sectionActive = isSectionActive(section);
                            const hasChildren = !!section.children && section.children.length > 0;
                            const groupOpen = hasChildren
                                ? isGroupOpen(section.label, section)
                                : false;

                            return (
                                <li key={index} style={{ overflow: 'visible', position: 'relative' }}>
                                    {/* Parent item with enhanced styling */}
                                    <div
                                        className={`group relative flex items-center rounded-xl transition-all duration-200 cursor-pointer ${isExpanded ? 'px-3 py-2.5' : 'px-2 py-2.5 justify-center'} ${sectionActive
                                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-indigo-950/50 dark:to-blue-950/50 text-blue-700 dark:text-indigo-300 font-semibold shadow-sm border-l-4 border-blue-600 dark:border-indigo-400'
                                            : 'text-gray-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/50 hover:text-blue-600 dark:hover:text-indigo-400 hover:shadow-sm'
                                            }`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (hasChildren) {
                                                toggleGroup(section.label);
                                            } else if (section.href) {
                                                handleNavigation(section.href);
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
                                                    handleNavigation(section.href);
                                                }
                                            }
                                        }}
                                        style={{ overflow: 'visible' }}
                                    >
                                        {/* Active indicator bar */}
                                        {sectionActive && !isExpanded && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 dark:bg-indigo-400 rounded-r-full" />
                                        )}
                                        
                                        <section.icon
                                            className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${sectionActive 
                                                ? 'text-blue-600 dark:text-indigo-400' 
                                                : 'text-gray-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-indigo-400'
                                                }`}
                                        />
                                        
                                        {isExpanded && (
                                            <>
                                                <span className="ml-3 text-sm font-medium whitespace-nowrap flex-1 transition-colors duration-200">
                                                    {section.label}
                                                </span>
                                                
                                                {hasChildren && (
                                                    <div className="ml-2 flex-shrink-0">
                                                        {groupOpen ? (
                                                            <ChevronUp className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                                                        ) : (
                                                            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {section.adminOnly && (
                                                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 font-semibold">
                                                        Admin
                                                    </span>
                                                )}
                                            </>
                                        )}
                                        
                                        {!isExpanded && (
                                            <Tooltip label={section.label} />
                                        )}
                                    </div>

                                    {/* Children with enhanced styling */}
                                    {hasChildren && groupOpen && isExpanded && (
                                        <ul
                                            className="mt-1.5 ml-4 pl-4 border-l-2 border-gray-200 dark:border-slate-700 space-y-1"
                                            style={{ overflow: 'visible' }}
                                        >
                                            {section.children!.map((child, childIndex) => {
                                                const childActive = isActive(child.href);
                                                return (
                                                    <li key={childIndex} style={{ overflow: 'visible', position: 'relative' }}>
                                                        <a
                                                            href={child.href}
                                                            className={`group/child relative flex items-center px-3 py-2 rounded-lg text-xs transition-all duration-200 ${childActive
                                                                ? 'bg-blue-50 dark:bg-indigo-950/30 text-blue-700 dark:text-indigo-300 font-semibold shadow-sm border-l-2 border-blue-600 dark:border-indigo-400'
                                                                : 'text-gray-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-800/40 hover:text-blue-600 dark:hover:text-indigo-400'
                                                                }`}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                handleNavigation(child.href);
                                                            }}
                                                            aria-label={child.label}
                                                            style={{ overflow: 'visible' }}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full mr-2.5 transition-colors duration-200 ${childActive 
                                                                ? 'bg-blue-600 dark:bg-indigo-400' 
                                                                : 'bg-gray-400 dark:bg-slate-500 group-hover/child:bg-blue-500 dark:group-hover/child:bg-indigo-400'
                                                                }`} />
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

                {/* Bottom Section - Logout Button with enhanced styling */}
                <div className={`border-t border-gray-200/60 dark:border-slate-800/60 ${isExpanded ? 'px-3 py-4' : 'px-2 py-4'}`} style={{ overflow: 'visible' }}>
                    <button
                        onClick={handleLogout}
                        className={`group relative flex items-center rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 hover:shadow-sm transition-all duration-200 text-gray-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 w-full ${isExpanded ? 'px-3 py-2.5' : 'px-2 py-2.5 justify-center'}`}
                        aria-label="Logout"
                        style={{ overflow: 'visible' }}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:rotate-12" />
                        {isExpanded && (
                            <span className="ml-3 text-sm font-medium">Logout</span>
                        )}
                        {!isExpanded && (
                            <Tooltip label="Logout" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Overlay with enhanced backdrop */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 backdrop-blur-sm bg-black/20 dark:bg-black/50 z-40 lg:hidden transition-opacity duration-300"
                    onClick={onMobileClose}
                />
            )}
        </>
    );
};

export default Sidebar;