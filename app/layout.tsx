import './globals.css';
import { Navigation } from './components/layout/Navigation';

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
        <Navigation />
        <main className="bg-white">
          {children}
        </main>
      </body>
    </html>
  );
}
