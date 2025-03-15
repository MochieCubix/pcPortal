'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { Providers as ThemeProviders } from "@/app/providers";
import { ModalProvider } from '@/contexts/ModalContext';
import { EmailProvider } from '@/contexts/EmailContext';

export default function Providers({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthProvider>
            <ThemeProviders>
                <ModalProvider>
                    <EmailProvider>
                        {children}
                    </EmailProvider>
                </ModalProvider>
            </ThemeProviders>
        </AuthProvider>
    );
} 