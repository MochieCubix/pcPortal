export interface User {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    company?: string;
    role: 'admin' | 'client' | 'supervisor' | 'employee';
    isEmailVerified: boolean;
    createdAt: string;
    position?: string;
    supervisor?: string;
    assignedJobsites?: string[];
    hireDate?: string;
    terminationDate?: string;
    status?: 'active' | 'inactive' | 'terminated';
    contactNumber?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        country?: string;
    };
}

export interface AuthResponse {
    user: User;
    token: string;
    message?: string;
}

export interface AuthError {
    error: string;
}

export type AuthMethod = 'magic-link' | 'otp' | 'password'; 