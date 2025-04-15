import './globals.css';
import { Navigation } from './components/layout/Navigation';
import { Providers } from './providers';

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
      <body className="bg-white min-h-screen">
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
