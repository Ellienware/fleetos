import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner';
import Script from 'next/script';

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: 'FleetOS - Taxi Association Management Platform',
    template: '%s | FleetOS',
  },
  description: 'Modern multi-tenant SaaS platform for South African taxi associations. Manage owners, vehicles, routes, membership billing, and compliance all in one place.',
  keywords: ['taxi', 'association', 'management', 'south africa', 'saas', 'fleet management', 'membership'],
  authors: [{ name: 'PW Software Solutions (Pty) Ltd' }],
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">

      <head>
      <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}&libraries=places`}
          strategy="beforeInteractive"
        />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Toaster position="top-right" richColors /> {/* ← add Toaster */}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
