import type { Metadata } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'RideShare — Smart Mobility Network',
  description: 'Real-time peer-to-peer ride sharing with route-based matching',
  themeColor: '#0F0B1F',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="bg-mist-50 text-ink-900 antialiased min-h-screen">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#0F0B1F',
              color: '#FDFCFF',
              borderRadius: '14px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: 500,
              border: '1px solid rgba(124,92,255,0.2)',
              boxShadow: '0 16px 40px rgba(15,11,31,0.3)',
            },
            success: { iconTheme: { primary: '#2DD4A0', secondary: '#0F0B1F' } },
            error:   { iconTheme: { primary: '#EF5D78', secondary: '#0F0B1F' } },
          }}
        />
      </body>
    </html>
  );
}