import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'RideShare — Smart Mobility Network',
  description: 'Real-time peer-to-peer ride sharing with route-based matching',
  keywords: 'rideshare, carpooling, ride sharing, India, college commute',
  authors: [{ name: 'RideShare' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#6366f1',
  manifest: '/manifest.json',
  openGraph: {
    title: 'RideShare',
    description: 'Smart Mobility Network',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e1b4b',
              color: '#fff',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  );
}