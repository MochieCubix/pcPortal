'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedLayout from '@/components/ProtectedLayout';
import ClientLayout from '@/components/Layouts/ClientLayout';

interface Setting {
    _id: string;
    key: string;
    value: any;
    description?: string;
    category: string;
}

export default function SettingsPage() {
    const { user } = useAuth();
    const [settings, setSettings] = useState<Setting[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [profileData, setProfileData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        contactNumber: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                
                // Fetch public settings for all users, or all settings for admin
                const endpoint = user?.role === 'admin' ? '/api/settings' : '/api/settings/public';
                const response = await fetch(`http://localhost:5000${endpoint}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch settings');
                }

                const data = await response.json();
                setSettings(data);
                
                // Set profile data from user
                if (user) {
                    setProfileData({
                        ...profileData,
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        email: user.email || '',
                        contactNumber: user.contactNumber || ''
                    });
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchSettings();
        }
    }, [user]);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/auth/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    firstName: profileData.firstName,
                    lastName: profileData.lastName,
                    contactNumber: profileData.contactNumber
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update profile');
            }

            setSuccess('Profile updated successfully');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (profileData.newPassword !== profileData.confirmPassword) {
            setError('New passwords do not match');
            return;
        }
        
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/auth/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: profileData.currentPassword,
                    newPassword: profileData.newPassword
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to change password');
            }

            setSuccess('Password changed successfully');
            setProfileData({
                ...profileData,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Group settings by category
    const groupedSettings = settings.reduce((acc, setting) => {
        if (!acc[setting.category]) {
            acc[setting.category] = [];
        }
        acc[setting.category].push(setting);
        return acc;
    }, {} as Record<string, Setting[]>);

    return (
        <ProtectedLayout>
            <ClientLayout>
                <div className="min-h-screen bg-gray-100">
                    <div className="py-10">
                        <header>
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <h1 className="text-3xl font-bold leading-tight text-gray-900">
                                    Settings
                                </h1>
                            </div>
                        </header>
                        <main>
                            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                                <div className="px-4 py-8 sm:px-0">
                                    {error && (
                                        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                                            {error}
                                        </div>
                                    )}
                                    {success && (
                                        <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                                            {success}
                                        </div>
                                    )}
                                    
                                    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                                        <div className="px-4 py-5 sm:px-6">
                                            <h2 className="text-lg leading-6 font-medium text-gray-900">
                                                Profile Settings
                                            </h2>
                                            <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                                Update your personal information
                                            </p>
                                        </div>
                                        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                                            <form onSubmit={handleProfileUpdate} className="space-y-6">
                                                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                                            First name
                                                        </label>
                                                        <div className="mt-1">
                                                            <input
                                                                type="text"
                                                                name="firstName"
                                                                id="firstName"
                                                                value={profileData.firstName}
                                                                onChange={handleInputChange}
                                                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                                                            Last name
                                                        </label>
                                                        <div className="mt-1">
                                                            <input
                                                                type="text"
                                                                name="lastName"
                                                                id="lastName"
                                                                value={profileData.lastName}
                                                                onChange={handleInputChange}
                                                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                                            Email address
                                                        </label>
                                                        <div className="mt-1">
                                                            <input
                                                                type="email"
                                                                name="email"
                                                                id="email"
                                                                value={profileData.email}
                                                                disabled
                                                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md bg-gray-100"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">
                                                            Contact number
                                                        </label>
                                                        <div className="mt-1">
                                                            <input
                                                                type="text"
                                                                name="contactNumber"
                                                                id="contactNumber"
                                                                value={profileData.contactNumber}
                                                                onChange={handleInputChange}
                                                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end">
                                                    <button
                                                        type="submit"
                                                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        Save
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>

                                    <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                                        <div className="px-4 py-5 sm:px-6">
                                            <h2 className="text-lg leading-6 font-medium text-gray-900">
                                                Change Password
                                            </h2>
                                            <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                                Update your password
                                            </p>
                                        </div>
                                        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                                            <form onSubmit={handlePasswordChange} className="space-y-6">
                                                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                                    <div className="sm:col-span-6">
                                                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                                                            Current password
                                                        </label>
                                                        <div className="mt-1">
                                                            <input
                                                                type="password"
                                                                name="currentPassword"
                                                                id="currentPassword"
                                                                value={profileData.currentPassword}
                                                                onChange={handleInputChange}
                                                                required
                                                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                                                            New password
                                                        </label>
                                                        <div className="mt-1">
                                                            <input
                                                                type="password"
                                                                name="newPassword"
                                                                id="newPassword"
                                                                value={profileData.newPassword}
                                                                onChange={handleInputChange}
                                                                required
                                                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="sm:col-span-3">
                                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                                                            Confirm new password
                                                        </label>
                                                        <div className="mt-1">
                                                            <input
                                                                type="password"
                                                                name="confirmPassword"
                                                                id="confirmPassword"
                                                                value={profileData.confirmPassword}
                                                                onChange={handleInputChange}
                                                                required
                                                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end">
                                                    <button
                                                        type="submit"
                                                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                                    >
                                                        Change Password
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>

                                    {user?.role === 'admin' && Object.keys(groupedSettings).length > 0 && (
                                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                                            <div className="px-4 py-5 sm:px-6">
                                                <h2 className="text-lg leading-6 font-medium text-gray-900">
                                                    System Settings
                                                </h2>
                                                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                                    Configure application settings
                                                </p>
                                            </div>
                                            <div className="border-t border-gray-200">
                                                {Object.entries(groupedSettings).map(([category, categorySettings]) => (
                                                    <div key={category} className="px-4 py-5 sm:p-6 border-b border-gray-200">
                                                        <h3 className="text-lg font-medium text-gray-900 capitalize mb-4">
                                                            {category}
                                                        </h3>
                                                        <div className="space-y-4">
                                                            {categorySettings.map(setting => (
                                                                <div key={setting._id} className="flex flex-col">
                                                                    <label htmlFor={setting.key} className="block text-sm font-medium text-gray-700 mb-1">
                                                                        {setting.key}
                                                                    </label>
                                                                    {setting.description && (
                                                                        <p className="text-xs text-gray-500 mb-1">{setting.description}</p>
                                                                    )}
                                                                    <input
                                                                        type="text"
                                                                        id={setting.key}
                                                                        name={setting.key}
                                                                        value={setting.value}
                                                                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                                                                        readOnly={user?.role !== 'admin'}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </ClientLayout>
        </ProtectedLayout>
    );
} 