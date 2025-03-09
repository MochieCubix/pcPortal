import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse, AuthMethod } from '@/types/auth';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, method: AuthMethod, password?: string) => Promise<void>;
    verifyOTP: (email: string, otp: string) => Promise<void>;
    verifyMagicLink: (token: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for stored auth token and validate it
        const token = localStorage.getItem('token');
        if (token) {
            fetchUserProfile(token);
        } else {
            setIsLoading(false);
        }
    }, []);

    const fetchUserProfile = async (token: string) => {
        try {
            const response = await fetch('http://localhost:5000/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            localStorage.removeItem('token');
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, method: AuthMethod, password?: string) => {
        if (method === 'password' && password) {
            // Password login
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            const data: AuthResponse = await response.json();
            localStorage.setItem('token', data.token);
            setUser(data.user);
            return;
        }

        // Magic link or OTP login
        const response = await fetch('http://localhost:5000/api/auth/request-access', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, method })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        return response.json();
    };

    const verifyMagicLink = async (token: string) => {
        const response = await fetch(`http://localhost:5000/api/auth/verify?token=${token}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        const data: AuthResponse = await response.json();
        localStorage.setItem('token', data.token);
        setUser(data.user);
    };

    const verifyOTP = async (email: string, otp: string) => {
        const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, otp })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error);
        }

        const data: AuthResponse = await response.json();
        localStorage.setItem('token', data.token);
        setUser(data.user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            verifyOTP,
            verifyMagicLink,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
} 