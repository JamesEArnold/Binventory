'use client';

import { SessionProvider } from 'next-auth/react';
import { PropsWithChildren } from 'react';
import { Toaster } from 'react-hot-toast';
import { OrganizationProvider } from './contexts/OrganizationContext';

export function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <OrganizationProvider>
        {children}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </OrganizationProvider>
    </SessionProvider>
  );
} 