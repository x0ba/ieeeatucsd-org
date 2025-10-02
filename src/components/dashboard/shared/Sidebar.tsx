import React, { useState, useEffect } from 'react';
import {
    Home,
    Calendar,
    CreditCard,
    Settings,
    LogOut,
    Users,
    DollarSign,
    Trophy,
    Banknote,
    FileText,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Link as LinkIcon,
    Briefcase
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../../../firebase/client';
import { Skeleton } from '../../ui/skeleton';
import { Separator } from '../../ui/separator';
import type { NavigationCategory, SidebarProps } from './types/navigation';
import type { UserRole } from './types/firestore';
import { NAVIGATION_PATHS } from './types/navigation';

interface SidebarComponentProps extends SidebarProps {
    currentPath?: string;
}

const navigationCategories: NavigationCategory[] = [
    {
        title: "Member Actions",
        items: [
            { icon: Home, label: 'Overview', href: NAVIGATION_PATHS.OVERVIEW },
            { icon: LinkIcon, label: 'Links', href: NAVIGATION_PATHS.LINKS },
            { icon: Calendar, label: 'Events', href: NAVIGATION_PATHS.EVENTS },
            { icon: CreditCard, label: 'Reimbursement', href: NAVIGATION_PATHS.REIMBURSEMENT },
            { icon: Trophy, label: 'Leaderboard', href: NAVIGATION_PATHS.LEADERBOARD },
        ]
    },
    {
        title: "General Officers",
        requiresRole: ['General Officer', 'Executive Officer', 'Administrator'],
        items: [
            { icon: Calendar, label: 'Manage Events', href: NAVIGATION_PATHS.MANAGE_EVENTS },
            { icon: Banknote, label: 'Fund Deposits', href: NAVIGATION_PATHS.FUND_DEPOSITS },
            { icon: MessageSquare, label: 'Slack Access', href: NAVIGATION_PATHS.SLACK_ACCESS },
        ]
    },
    {
        title: "Executive Officers",
        requiresRole: ['Executive Officer', 'Administrator'],
        items: [
            { icon: DollarSign, label: 'Manage Reimbursements', href: NAVIGATION_PATHS.MANAGE_REIMBURSEMENTS },
            { icon: Users, label: 'Manage Users', href: NAVIGATION_PATHS.MANAGE_USERS },
            { icon: FileText, label: 'Constitution Builder', href: NAVIGATION_PATHS.CONSTITUTION_BUILDER },
        ]
    },
    {
        title: "Sponsors",
        requiresRole: ['Sponsor', 'Administrator'],
        items: [
            { icon: Briefcase, label: 'Resume Database', href: NAVIGATION_PATHS.RESUME_DATABASE },
        ]
    },
    {
        title: "Account",
        items: [
            { icon: Settings, label: 'Settings', href: NAVIGATION_PATHS.SETTINGS },
            { icon: LogOut, label: 'Sign Out', href: NAVIGATION_PATHS.SIGNOUT },
        ]
    }
];

export function Sidebar({ currentPath = '' }: SidebarComponentProps) {
    const [user, userLoading] = useAuthState(auth);
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
    const [isLoadingRole, setIsLoadingRole] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        // Load collapsed state from localStorage
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebar-collapsed');
            return saved === 'true';
        }
        return false;
    });
    const db = getFirestore();

    // Persist collapsed state to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar-collapsed', String(isCollapsed));
        }
    }, [isCollapsed]);

    useEffect(() => {
        // Don't start role fetching until user auth is resolved
        if (userLoading) return;

        if (!user) {
            setCurrentUserRole('Member'); // Default for non-logged in users
            setIsLoadingRole(false);
            return;
        }

        // Only start loading role if we have a user and haven't loaded role yet
        if (user && currentUserRole === null) {
            const fetchUserRole = async () => {
                try {
                    setIsLoadingRole(true);
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setCurrentUserRole(userData.role || 'Member');
                    } else {
                        setCurrentUserRole('Member');
                    }
                } catch (error) {
                    console.error('Error fetching user role:', error);
                    setCurrentUserRole('Member'); // Default to Member if error
                } finally {
                    setIsLoadingRole(false);
                }
            };

            fetchUserRole();
        }
    }, [user, userLoading, currentUserRole, db]);

    const isActiveRoute = (href: string): boolean => {
        if (currentPath === '/dashboard' || currentPath === '/dashboard/') {
            return href === NAVIGATION_PATHS.OVERVIEW;
        }
        return currentPath === href;
    };

    const canAccessCategory = (category: NavigationCategory): boolean => {
        if (!category.requiresRole || !currentUserRole) return true;
        return category.requiresRole.includes(currentUserRole);
    };

    // Show skeleton if user auth is loading OR role is loading OR role hasn't been determined yet
    const isLoading = userLoading || isLoadingRole || currentUserRole === null;

    // Only filter categories when we have a confirmed role
    const filteredCategories = currentUserRole ? navigationCategories.filter(canAccessCategory) : [];

    const NavigationSkeleton = () => (
        <nav className={`mt-4 pb-6 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            {/* Member Actions skeleton */}
            <div className="mb-6">
                {!isCollapsed && <Skeleton className="h-3 w-24 mb-3 ml-3" />}
                <ul className="space-y-1">
                    {[1, 2, 3, 4].map((itemIndex) => (
                        <li key={itemIndex}>
                            <div className={`flex items-center ${isCollapsed ? 'justify-center px-3 py-3' : 'px-3 py-2.5'}`}>
                                <Skeleton className="w-5 h-5" />
                                {!isCollapsed && <Skeleton className="h-4 w-20 ml-3" />}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {!isCollapsed && <Separator className="my-4" />}

            {/* Generic loading section */}
            <div className="mb-6">
                {!isCollapsed && <Skeleton className="h-3 w-20 mb-3 ml-3" />}
                <ul className="space-y-1">
                    {[1, 2, 3].map((itemIndex) => (
                        <li key={itemIndex}>
                            <div className={`flex items-center ${isCollapsed ? 'justify-center px-3 py-3' : 'px-3 py-2.5'}`}>
                                <Skeleton className="w-5 h-5" />
                                {!isCollapsed && <Skeleton className="h-4 w-16 ml-3" />}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {!isCollapsed && <Separator className="my-4" />}

            {/* Account actions skeleton */}
            <div className="mb-6">
                {!isCollapsed && <Skeleton className="h-3 w-16 mb-3 ml-3" />}
                <ul className="space-y-1">
                    {[1, 2].map((itemIndex) => (
                        <li key={itemIndex}>
                            <div className={`flex items-center ${isCollapsed ? 'justify-center px-3 py-3' : 'px-3 py-2.5'}`}>
                                <Skeleton className="w-5 h-5" />
                                {!isCollapsed && <Skeleton className="h-4 w-16 ml-3" />}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );

    return (
        <div className={`hidden lg:flex flex-col bg-white shadow-lg h-screen transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
            {/* Logo and Collapse Button - Fixed Header */}
            <div className={`flex-shrink-0 border-b border-gray-200 ${isCollapsed ? 'p-4' : 'p-5'}`}>
                {isCollapsed ? (
                    /* Collapsed state - stacked layout for better spacing */
                    <div className="flex flex-col items-center space-y-3">
                        <a href="/dashboard/overview" className="w-8 h-8 flex items-center justify-center">
                            <img
                                src="/logos/blue_logo_only.svg"
                                alt="IEEE UCSD Logo"
                                className="w-8 h-8 transition-transform hover:scale-105"
                            />
                        </a>
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                            title="Expand sidebar"
                            aria-label="Expand sidebar"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    /* Expanded state - horizontal layout */
                    <div className="flex items-center justify-between">
                        <a href="/dashboard/overview" className="flex items-center min-w-0 group">
                            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                                <img
                                    src="/logos/blue_logo_only.svg"
                                    alt="IEEE UCSD Logo"
                                    className="w-8 h-8 transition-transform group-hover:scale-105"
                                />
                            </div>
                            <span className="ml-3 text-xl font-bold text-gray-800 truncate">IEEE UCSD</span>
                        </a>

                        {/* Collapse Button */}
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                            title="Collapse sidebar"
                            aria-label="Collapse sidebar"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Navigation - Scrollable Area */}
            {isLoading ? (
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <NavigationSkeleton />
                </div>
            ) : (
                <nav className={`flex-1 min-h-0 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-3'} py-4`}>
                    {filteredCategories.map((category, categoryIndex) => (
                        <React.Fragment key={categoryIndex}>
                            <div className="mb-6">
                                {!isCollapsed && (
                                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                        {category.title}
                                    </h3>
                                )}
                                <ul className="space-y-1">
                                    {category.items.map((item, index) => {
                                        const isActive = isActiveRoute(item.href);
                                        return (
                                            <li key={index}>
                                                <div className="relative group">
                                                    <a
                                                        href={item.href}
                                                        className={`flex w-full items-center text-sm font-medium rounded-lg transition-all duration-200 ${isCollapsed
                                                            ? 'justify-center px-3 py-3 min-h-[44px]'
                                                            : 'px-3 py-2.5 min-h-[40px]'
                                                            } ${isActive
                                                                ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
                                                            }`}
                                                        title={isCollapsed ? item.label : undefined}
                                                        aria-label={item.label}
                                                        aria-current={isActive ? 'page' : undefined}
                                                    >
                                                        <item.icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isCollapsed ? '' : 'mr-3'
                                                            } ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                                                        {!isCollapsed && (
                                                            <span className="truncate">{item.label}</span>
                                                        )}
                                                        {isActive && !isCollapsed && (
                                                            <div className="ml-auto w-1 h-6 bg-blue-600 rounded-full" />
                                                        )}
                                                    </a>

                                                    {/* Tooltip for collapsed state */}
                                                    {isCollapsed && (
                                                        <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg">
                                                            {item.label}
                                                            <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-[6px] border-transparent border-r-gray-900"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            {/* Add separator between categories, except after the last one */}
                            {categoryIndex < filteredCategories.length - 1 && (
                                !isCollapsed ? (
                                    <Separator className="my-4" />
                                ) : (
                                    <div className="my-3 mx-auto w-8 h-px bg-gray-200" />
                                )
                            )}
                        </React.Fragment>
                    ))}
                </nav>
            )}
        </div>
    );
}
