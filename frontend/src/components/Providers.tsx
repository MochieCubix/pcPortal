'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { Providers as ThemeProviders } from "@/app/providers";

export default function Providers({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthProvider>
            <ThemeProviders>
                {children}
            </ThemeProviders>
        </AuthProvider>
    );
} 