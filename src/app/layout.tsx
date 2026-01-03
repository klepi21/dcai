import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Layout } from '@/components/Layout';
import App from './index';
import { InitAppWrapper } from '@/wrappers';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://dcai-virid.vercel.app/');

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'DCAi: AI-Powered Dollar Cost Averaging on MultiversX',
  description:
    'Automate your crypto strategy with DCAi. Sophisticated AI-driven Dollar Cost Averaging and Take-Profit protocols built for the MultiversX ecosystem.',
  keywords: [
    'DCA',
    'AI',
    'MultiversX',
    'Dollar Cost Averaging',
    'Crypto',
    'DeFi',
    'Automation',
    'Web3',
    'Take Profit',
    'Smart Contracts'
  ],
  authors: [{ name: 'DCAi Team' }],
  viewport: {
    width: 'device-width',
    initialScale: 1
  },
  icons: {
    icon: '/favicon.ico'
  },
  openGraph: {
    type: 'website',
    url: baseUrl,
    title: 'DCAi: AI-Powered Dollar Cost Averaging on MultiversX',
    description: 'Automate your crypto strategy with DCAi. Sophisticated AI-driven Dollar Cost Averaging and Take-Profit protocols built for the MultiversX ecosystem.',
    siteName: 'DCAi',
    images: [
      {
        url: `${baseUrl}/assets/img/seoimg.png`,
        width: 1200,
        height: 630,
        alt: 'DCAi: AI-Powered Dollar Cost Averaging on MultiversX'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DCAi: AI-Powered Dollar Cost Averaging on MultiversX',
    description: 'Automate your crypto strategy with DCAi. Sophisticated AI-driven Dollar Cost Averaging and Take-Profit protocols built for the MultiversX ecosystem.',
    images: [`${baseUrl}/assets/img/seoimg.png`]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' className={inter.className} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <InitAppWrapper>
          <App>
            <Suspense>
              <Layout>{children}</Layout>
            </Suspense>
            <Toaster position="bottom-right" toastOptions={{
              style: {
                background: '#1f2937',
                color: '#fff',
                border: '1px solid rgba(75, 85, 99, 0.4)',
              },
            }} />
          </App>
        </InitAppWrapper>
      </body>
    </html>
  );
}
