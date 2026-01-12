import React, { useState, useEffect } from 'react';
import { auth, signInWithPopup, GoogleAuthProvider, browserPopupRedirectResolver } from '../../../../firebase/client';
import { Skeleton } from '@heroui/react';

// Blue IEEE Logo SVG Component
const BlueIEEELogo = ({ className = "w-32 h-auto" }: { className?: string }) => (
    <img
        src="/logos/blue_logo_only.svg"
        alt="IEEE UCSD Logo"
        className={className}
        role="img"
        aria-label="IEEE UCSD Logo"
    />
);

// Loading Skeleton for Sign In Button
const SignInButtonSkeleton = () => (
    <div className="w-full">
        <Skeleton className="h-12 w-full rounded-xl" />
    </div>
);

export default function SignInContent() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [storageWarning, setStorageWarning] = useState(false);

    // Check sessionStorage accessibility on mount
    useEffect(() => {
        try {
            const testKey = '__firebase_test__';
            sessionStorage.setItem(testKey, 'test');
            sessionStorage.removeItem(testKey);
        } catch (e) {
            setStorageWarning(true);
            console.warn('SessionStorage is not accessible. This may cause authentication issues.');
        }
    }, []);

    // Extract invite ID from URL
    const getInviteId = () => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('invite');
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        setLoading(true);

        try {
            // Configure Google Auth Provider with custom parameters
            const provider = new GoogleAuthProvider();

            // Add custom parameters to improve compatibility
            provider.setCustomParameters({
                prompt: 'select_account', // Always show account selection
            });

            // Attempt sign in with popup using explicit resolver for better compatibility
            const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
            const idToken = await result.user.getIdToken();
            const inviteId = getInviteId();

            const response = await fetch('/api/set-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, inviteId, signInMethod: 'google' }),
            });

            if (!response.ok) {
                throw new Error('Failed to set session');
            }

            window.location.href = '/overview';
        } catch (err: any) {
            console.error('Sign-in error:', err);

            // Handle specific Firebase Auth errors
            let errorMessage = 'Failed to sign in with Google';

            if (err.code === 'auth/popup-blocked') {
                errorMessage = 'Popup was blocked by your browser. Please allow popups for this site and try again.';
            } else if (err.code === 'auth/popup-closed-by-user') {
                errorMessage = 'Sign-in was cancelled. Please try again.';
            } else if (err.code === 'auth/cancelled-popup-request') {
                errorMessage = 'Another sign-in popup is already open. Please complete or close it first.';
            } else if (err.code === 'auth/network-request-failed') {
                errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (err.code === 'auth/internal-error' || err.message?.includes('initial state')) {
                errorMessage = 'Authentication error. This may be caused by browser privacy settings blocking third-party cookies or storage. Try using a different browser or adjusting your privacy settings.';
                setStorageWarning(true);
            } else if (err.message) {
                errorMessage = err.message;
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                {/* Main Card */}
                <div className="bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
                    {/* Header Section */}
                    <div className="px-8 pt-10 pb-6 text-center">
                        {/* IEEE Logo */}
                        <div className="flex justify-center mb-6">
                            <BlueIEEELogo className="w-20 h-20" />
                        </div>

                        {/* Title and Subtitle */}
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            Welcome
                        </h1>
                        <p className="text-gray-600 text-sm mb-6">
                            Sign in to access your IEEE UCSD dashboard
                        </p>
                    </div>

                    {/* Sign In Section */}
                    <div className="px-8 pb-10">
                        {loading ? (
                            <SignInButtonSkeleton />
                        ) : (
                            <button
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 px-6 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
                                aria-label="Sign in with Google"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12.545,10.917v2.919h4.74c-0.195,1.248-1.458,3.656-4.74,3.656c-2.853,0-5.182-2.363-5.182-5.275c0-2.912,2.329-5.275,5.182-5.275c1.625,0,3.058,0.55,4.204,1.626l-3.04,2.919C13.862,9.292,13.254,10.917,12.545,10.917z" fill="#EB4335" />
                                    <path d="M12,20.75c4.125,0,7.583-1.366,7.583-7.583c0-0.5-0.046-0.991-0.133-1.458H12v2.919h4.74c-0.195,1.248-1.458,3.656-4.74,3.656C8.692,16.5,6.818,14.137,6.818,12c0-2.912,2.329-5.275,5.182-5.275c1.625,0,3.058,0.55,4.204,1.626l-3.04,2.919C13.862,9.292,13.254,10.917,12.545,10.917v2.919h4.74c-0.195,1.248-1.458,3.656-4.74,3.656C8.692,16.5,6.818,14.137,6.818,12z" fill="#34A853" />
                                    <path d="M12,20.75c4.125,0,7.583-1.366,7.583-7.583c0-0.5-0.046-0.991-0.133-1.458H12v2.919h4.74c-0.195,1.248-1.458,3.656-4.74,3.656C8.692,16.5,6.818,14.137,6.818,12c0-2.912,2.329-5.275,5.182-5.275c1.625,0,3.058,0.55,4.204,1.626l-3.04,2.919C13.862,9.292,13.254,10.917,12.545,10.917v2.919h4.74c-0.195,1.248-1.458,3.656-4.74,3.656C8.692,16.5,6.818,14.137,6.818,12z" fill="#4285F4" />
                                    <path d="M12,20.75c4.125,0,7.583-1.366,7.583-7.583c0-0.5-0.046-0.991-0.133-1.458H12v2.919h4.74c-0.195,1.248-1.458,3.656-4.74,3.656C8.692,16.5,6.818,14.137,6.818,12c0-2.912,2.329-5.275,5.182-5.275c1.625,0,3.058,0.55,4.204,1.626l-3.04,2.919C13.862,9.292,13.254,10.917,12.545,10.917v2.919h4.74c-0.195,1.248-1.458,3.656-4.74,3.656C8.692,16.5,6.818,14.137,6.818,12z" fill="#FBBC05" />
                                </svg>
                                <span>Continue with Google</span>
                            </button>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div
                                className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                                role="alert"
                                aria-live="polite"
                            >
                                <p className="text-sm text-red-600 text-center">{error}</p>
                            </div>
                        )}

                        {/* Storage Warning */}
                        {storageWarning && (
                            <div
                                className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                                role="alert"
                            >
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        <svg className="w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-yellow-800">
                                            Browser Compatibility Issue
                                        </h3>
                                        <p className="text-xs text-yellow-700 mt-1">
                                            Your browser's settings may be blocking authentication.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        Need access?{' '}
                        <a
                            href="mailto:ieee@ucsd.edu"
                            className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                        >
                            Contact IEEE UCSD
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}