'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Logo from '@/components/logo';
import { AuthMethod } from '@/types/auth';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [method, setMethod] = useState<AuthMethod>('magic-link');
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const { login, verifyOTP } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        try {
            if (step === 'email') {
                if (method === 'password') {
                    await login(email, method, password);
                    router.push('/dashboard');
                    return;
                }
                
                await login(email, method);
                setMessage(`${method === 'magic-link' ? 'Magic link' : 'Access code'} sent to your email`);
                if (method === 'otp') {
                    setStep('otp');
                }
            } else if (step === 'otp') {
                await verifyOTP(email, otp);
                router.push('/dashboard');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Logo />
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {step === 'email' && (
                            <>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                        Email address
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {method === 'password' && (
                                    <div className="mt-4">
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                            Password
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                id="password"
                                                name="password"
                                                type="password"
                                                autoComplete="current-password"
                                                required={method === 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Authentication Method
                                    </label>
                                    <div className="mt-2 space-y-4">
                                        <div className="flex items-center">
                                            <input
                                                id="password"
                                                name="auth-method"
                                                type="radio"
                                                checked={method === 'password'}
                                                onChange={() => setMethod('password')}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                            />
                                            <label htmlFor="password" className="ml-3 block text-sm font-medium text-gray-700">
                                                Password
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                id="magic-link"
                                                name="auth-method"
                                                type="radio"
                                                checked={method === 'magic-link'}
                                                onChange={() => setMethod('magic-link')}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                            />
                                            <label htmlFor="magic-link" className="ml-3 block text-sm font-medium text-gray-700">
                                                Email Magic Link
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                id="otp"
                                                name="auth-method"
                                                type="radio"
                                                checked={method === 'otp'}
                                                onChange={() => setMethod('otp')}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                            />
                                            <label htmlFor="otp" className="ml-3 block text-sm font-medium text-gray-700">
                                                Email Access Code
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 'otp' && (
                            <div>
                                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                                    Enter Access Code
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="otp"
                                        name="otp"
                                        type="text"
                                        required
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter 6-digit code"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mt-6">
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                {step === 'email' ? 'Continue' : 'Verify Access Code'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
} 