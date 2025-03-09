'use client';

import dynamic from 'next/dynamic';

const ClientProviders = dynamic(
  () => import('@/components/ClientProviders'),
  { ssr: false }
);

export default function RootClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientProviders>{children}</ClientProviders>;
} 