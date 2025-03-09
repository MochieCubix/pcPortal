'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function VerifyPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { verifyMagicLink } = useAuth();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const verifyToken = async () => {
            try {
                const token = searchParams.get('token');
                if (!token) {
                    setError('No verification token found');
                    setIsLoading(false);
                    return;
                }

                await verifyMagicLink(token);
                
                // Redirect to dashboard
                router.push('/dashboard');
            } catch (err) {
                const error = err as Error;
                setError(error.message || 'Verification failed');
                setIsLoading(false);
            }
        };

        verifyToken();
    }, [searchParams, router, verifyMagicLink]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="p-8 bg-white rounded-lg shadow-md">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        <p className="mt-4 text-gray-600">Verifying your access...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="p-8 bg-white rounded-lg shadow-md">
                    <div className="flex flex-col items-center">
                        <div className="text-red-500 text-xl mb-4">⚠️</div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Verification Failed</h2>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <button
                            onClick={() => router.push('/login')}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                            Return to Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
} 