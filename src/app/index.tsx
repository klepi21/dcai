'use client';
import { type ReactNode } from 'react';

import {
  AxiosInterceptors,
  BatchTransactionsContextProvider,
  DcaBoardThemeProvider
} from '@/wrappers';

export default function App({ children }: { children: ReactNode }) {
  return (
    <AxiosInterceptors>
      <BatchTransactionsContextProvider>
        <DcaBoardThemeProvider>{children}</DcaBoardThemeProvider>
      </BatchTransactionsContextProvider>
    </AxiosInterceptors>
  );
}
