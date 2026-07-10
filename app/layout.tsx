import '@/styles/globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'AI Tactical Boxing Coach',
  description: 'AI-powered boxing training with voice guidance',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#f0b34b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white min-h-screen">{children}</body>
    </html>
  );
}