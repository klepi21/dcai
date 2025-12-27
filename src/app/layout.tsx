import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Layout } from '@/components/Layout';
import App from './index';
import { InitAppWrapper } from '@/wrappers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DCAi - AI-Powered Dollar Cost Averaging on MultiversX',
  description:
    'DCAi is a sophisticated dApp for dollar cost averaging in the MultiversX ecosystem, using advanced AI LLM systems to determine optimal buy and take-profit times.',
  viewport: {
    width: 'device-width',
    initialScale: 1
  },
  icons: {
    icon: '/favicon.ico'
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
          </App>
        </InitAppWrapper>
      </body>
    </html>
  );
}
