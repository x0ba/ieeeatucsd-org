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
    X,
    MessageSquare,
    Link as LinkIcon,
    Briefcase,
    UserPlus
} from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { auth } from '../../../firebase/client';
import { Skeleton } from '../../ui/skeleton';
import { Separator } from '../../ui/separator';
import type { NavigationCategory, SidebarProps } from './types/navigation';
import type { UserRole } from './types/firestore';
import { NAVIGATION_PATHS } from './types/navigation';

interface MobileSidebarProps extends SidebarProps {
    currentPath?: string;
    isOpen: boolean;
    onClose: () => void;
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
            { icon: UserPlus, label: 'Onboarding', href: NAVIGATION_PATHS.ONBOARDING },
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

export function MobileSidebar({ currentPath = '', isOpen, onClose }: MobileSidebarProps) {
    const [user, userLoading] = useAuthState(auth);
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
    const [isLoadingRole, setIsLoadingRole] = useState(false);
    const db = getFirestore();

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

    // Handle click on navigation item
    const handleNavClick = () => {
        onClose();
    };

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const NavigationSkeleton = () => (
        <div className="px-6 pb-6">
            {/* Member Actions skeleton */}
            <div className="mb-6">
                <Skeleton className="h-4 w-24 mb-4" />
                <ul className="space-y-2">
                    {[1, 2, 3, 4].map((itemIndex) => (
                        <li key={itemIndex}>
                            <div className="flex items-center p-4 min-h-[52px]">
                                <Skeleton className="w-6 h-6 mr-4" />
                                <Skeleton className="h-5 w-20" />
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <Separator className="my-4" />

            {/* Generic loading section */}
            <div className="mb-6">
                <Skeleton className="h-4 w-20 mb-4" />
                <ul className="space-y-2">
                    {[1, 2, 3].map((itemIndex) => (
                        <li key={itemIndex}>
                            <div className="flex items-center p-4 min-h-[52px]">
                                <Skeleton className="w-6 h-6 mr-4" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <Separator className="my-4" />

            {/* Account actions skeleton */}
            <div className="mb-6">
                <Skeleton className="h-4 w-16 mb-4" />
                <ul className="space-y-2">
                    {[1, 2].map((itemIndex) => (
                        <li key={itemIndex}>
                            <div className="flex items-center p-4 min-h-[52px]">
                                <Skeleton className="w-6 h-6 mr-4" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                onClick={handleBackdropClick}
                aria-hidden="true"
            />

            {/* Sidebar */}
            <div className={`relative flex flex-col w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                {/* Header with close button - Fixed */}
                <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-gray-200">
                    <a href="/dashboard/overview" className="flex items-center group" onClick={handleNavClick}>
                        <div className="w-8 h-8 flex items-center justify-center">
                            <img
                                src="/logos/blue_logo_only.svg"
                                alt="IEEE UCSD Logo"
                                className="w-8 h-8 transition-transform group-hover:scale-105"
                            />
                        </div>
                        <span className="ml-3 text-xl font-bold text-gray-800">IEEE UCSD</span>
                    </a>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        aria-label="Close menu"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Navigation - Scrollable Area */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <NavigationSkeleton />
                    ) : (
                        <nav className="px-5 py-4">
                            {filteredCategories.map((category, categoryIndex) => (
                                <React.Fragment key={categoryIndex}>
                                    <div className="mb-6">
                                        <h3 className="px-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                            {category.title}
                                        </h3>
                                        <ul className="space-y-1.5">
                                            {category.items.map((item, index) => {
                                                const isActive = isActiveRoute(item.href);
                                                return (
                                                    <li key={index}>
                                                        <a
                                                            href={item.href}
                                                            onClick={handleNavClick}
                                                            className={`flex w-full items-center px-4 py-3 text-base font-medium rounded-lg transition-all duration-200 min-h-[52px] ${isActive
                                                                ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
                                                                }`}
                                                            aria-current={isActive ? 'page' : undefined}
                                                        >
                                                            <item.icon className={`w-6 h-6 mr-4 flex-shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-gray-400'
                                                                }`} />
                                                            <span className="flex-1">{item.label}</span>
                                                            {isActive && (
                                                                <div className="w-1.5 h-6 bg-blue-600 rounded-full ml-2" />
                                                            )}
                                                        </a>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>

                                    {/* Add separator between categories, except after the last one */}
                                    {categoryIndex < filteredCategories.length - 1 && (
                                        <Separator className="my-4" />
                                    )}
                                </React.Fragment>
                            ))}
                        </nav>
                    )}
                </div>
            </div>
        </div>
    );
}
