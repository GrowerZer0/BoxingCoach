import '../components/globals.css';  
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Tactical Boxing Coach',
  description: 'AI-powered boxing training with voice guidance',
  manifest: '/manifest.json',
  themeColor: '#f0b34b',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}