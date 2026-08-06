// app/layout.tsx
import '../styles/globals.css';
import type { Metadata, Viewport } from 'next';
import { SettingsProvider } from '@/contexts/SettingsContext';

export const metadata: Metadata = {
  title: 'Boxing Timer',
  description: 'Boxing workout timer with round-specific settings',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
};

// Move viewport to a separate export
export const viewport: Viewport = {
  themeColor: '#1a1a1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-gray-900 text-white min-h-screen overflow-x-hidden">
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}