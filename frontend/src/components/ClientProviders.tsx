'use client';

import { AuthProvider } from "@/contexts/AuthContext";
import { Providers } from "@/app/providers";
import NextTopLoader from "nextjs-toploader";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <Providers>
        <NextTopLoader />
        {children}
      </Providers>
    </AuthProvider>
  );
} 