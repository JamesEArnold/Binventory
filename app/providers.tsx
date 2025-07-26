'use client';

import { SessionProvider } from 'next-auth/react';
import { PropsWithChildren } from 'react';
import { OrganizationProvider } from './contexts/OrganizationContext';

export function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <OrganizationProvider>
        {children}
      </OrganizationProvider>
    </SessionProvider>
  );
} 