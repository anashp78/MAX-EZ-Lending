import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const BASE_URL = process.env.NEXTAUTH_URL || 'https://lending.maxevdigital.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'MAX EV Business Lending — AI-Powered Small Business Loans',
    template: '%s | MAX EV Business Lending',
  },
  description:
    'Get pre-qualified for a small business loan in under 5 minutes. AI-powered underwriting benchmarked against SBA data. No credit pull. Multiple lending partners.',
  keywords: [
    'small business loan',
    'business financing',
    'SBA loan',
    'AI underwriting',
    'fast business loan',
    'business line of credit',
    'small business funding',
    'no credit check business loan',
    'working capital',
    'business loan pre-qualification',
  ],
  authors: [{ name: 'MAX EV Business Lending' }],
  creator: 'MAX EV Business Lending',
  publisher: 'MAX EV Business Lending',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'MAX EV Business Lending',
    title: 'MAX EV Business Lending — AI-Powered Small Business Loans',
    description:
      'AI-powered underwriting benchmarked against SBA data. Pre-qualify in under 5 minutes. No credit pull. Multiple lending partners.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MAX EV Business Lending — AI Underwriting',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MAX EV Business Lending — AI-Powered Small Business Loans',
    description: 'Pre-qualify for a small business loan in under 5 minutes. No credit pull. AI underwriting.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: BASE_URL,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f172a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
