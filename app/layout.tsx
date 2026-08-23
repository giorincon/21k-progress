import type { Metadata, Viewport } from 'next';
import './globals.css';
import './mobile-premium.css';
import PWARegister from '@/components/PWARegister';

export const metadata: Metadata = {
  title: '21K Progress',
  description: 'Tu camino hacia los 21,1 km',
  applicationName: '21K Progress',
  appleWebApp: {
    capable: true,
    title: '21K Progress',
    statusBarStyle: 'black-translucent'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#050b14'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="./manifest.webmanifest" />

        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="./icons/apple-touch-icon.png"
        />

        <link
          rel="icon"
          type="image/png"
          sizes="192x192"
          href="./icons/icon-192.png"
        />

        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-title"
          content="21K Progress"
        />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="format-detection" content="telephone=no" />
      </head>

      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
