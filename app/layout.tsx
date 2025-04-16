import './globals.css';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Navigation } from './components/layout/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Binventory',
  description: 'Modern inventory management for bins using QR codes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`bg-white min-h-screen ${inter.className}`}>
        <Providers>
          <Navigation />
          <main className="bg-white">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
