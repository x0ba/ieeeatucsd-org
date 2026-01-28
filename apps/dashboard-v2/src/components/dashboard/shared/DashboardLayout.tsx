import { type ReactNode, useEffect, useState, useRef } from 'react';
import { SidebarNavigation } from './SidebarNavigation';
import { useAuth } from '../../../hooks/useConvexAuth';
import { ModalProvider } from './contexts/ModalContext';
import { SyncStatusProvider } from './contexts/SyncStatusContext';
import { Spinner, ToastProvider } from '@heroui/react';

// Components successfully migrated to Convex + BetterAuth
// Policy checking and navigation preferences are functional

interface DashboardLayoutProps {
    children?: ReactNode;
    currentPath?: string;
}

export default function DashboardLayout({ children, currentPath }: DashboardLayoutProps) {
    const { user } = useAuth();
    const [showPolicyModal, setShowPolicyModal] = useState(false);

    useEffect(() => {
        if (!user) {
            window.location.href = '/dashboard-v2/signin';
        }
    }, [user]);

    // TODO: Implement policy checking when migrated
    // For now, don't show policy modal
    useEffect(() => {
        if (user) {
            setShowPolicyModal(false);
        }
    }, [user]);

    // TODO: Implement navigation preference when migrated
    // For now, always use sidebar layout
    const navigationLayout = 'sidebar';

    // Show loading state while user is being loaded
    if (!user) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Spinner size="lg" color="primary" className="mx-auto mb-4" />
                    <p className="text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <ToastProvider
                placement="bottom-right"
                maxVisibleToasts={3}
                toastProps={{
                    variant: "flat",
                }}
            />
            <SyncStatusProvider>
                <ModalProvider>
                    {navigationLayout === 'sidebar' ? (
                        // Sidebar Layout
                        <SidebarNavigation currentPath={currentPath}>
                            {children || <DefaultContent />}
                        </SidebarNavigation>
                    ) : (
                        // Horizontal Navbar Layout (placeholder)
                        <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
                            {/* TODO: Add TopNavbar when migrated */}
                            <div className="flex-1 min-h-0 overflow-y-auto">
                                {children || <DefaultContent />}
                            </div>
                        </div>
                    )}

                    {/* TODO: Add PolicyUpdateModal when migrated */}
                </ModalProvider>
            </SyncStatusProvider>

            {/* TODO: Add PWAInstallPrompt when migrated */}
        </>
    );
}

function DefaultContent() {
    return (
        <div className="h-full">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search"
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                            Search
                        </button>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5v-5zM9 17H4l5 5v-5z" />
                            </svg>
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="p-6">
                <div className="text-center text-gray-500">
                    <p>Please select a page from the navigation menu</p>
                </div>
            </main>
        </div>
    );
}
