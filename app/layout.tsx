import type { Metadata } from 'next';
import './globals.css';
import './mobile-premium.css';

export const metadata: Metadata = {
  title: '21K Progress',
  description: 'Tu camino hacia los 21,1 km'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
