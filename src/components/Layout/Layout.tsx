import { PropsWithChildren } from 'react';
import { Footer } from './Footer';
import { Header } from './Header';

export const Layout = ({ children }: PropsWithChildren) => {
  return (
    <div className='relative flex min-h-screen flex-col'>
      <Header />
      <main className='flex flex-grow items-stretch justify-center pt-24 px-6 mb-16'>
        {children}
      </main>
      <Footer />
    </div>
  );
};
