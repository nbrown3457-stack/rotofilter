import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import { TeamProvider } from '../context/TeamContext';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
});

// --- THIS IS THE ONLY SECTION WE CHANGED ---
export const metadata: Metadata = {
  title: 'RotoFilter | Fantasy Baseball Intelligence',
  description: 'Filter your Yahoo Fantasy Baseball leagues with Statcast data.',
  icons: {
    icon: '/logo.svg',       // Shows in browser tabs
    shortcut: '/logo.svg',   // Chrome/Edge bookmarks
    apple: '/logo.svg',      // iPhone Home Screen
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/logo.svg',
    },
  },
  manifest: '/site.webmanifest', // Android Home Screen Support
};
// -------------------------------------------

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* 1. Removed "bg-gray-50" so it doesn't create a white background behind your grass image.
          2. Added margin: 0 to ensure full-screen width.
      */}
      <body className={`${geist.className} antialiased`} style={{ margin: 0, padding: 0, background: '#111' }}>
        
        {/* Global State Provider ensures all pages see your Yahoo Teams */}
        <TeamProvider>
          
          {/* HEADER REMOVED: 
              The White Navigation Bar is gone. 
              The Sync Button is now controlled entirely by page.tsx.
          */}

          {/* MAIN WRAPPER REMOVED: 
              We render {children} directly so page.tsx can control 
              the full width and background without extra white borders.
          */}
          {children}
          
        </TeamProvider>
      </body>
    </html>
  );
}