'use client';
import Image from 'next/image';
import { HelpCircle, ExternalLink } from 'lucide-react';
import { useGetAccount, useGetNetworkConfig } from '@/lib';

interface PortfolioHeaderProps {
  totalPortfolio: number;
  onOpenOnboarding: () => void;
}

export function PortfolioHeader({ totalPortfolio, onOpenOnboarding }: PortfolioHeaderProps) {
  const { address } = useGetAccount();
  const { network } = useGetNetworkConfig();

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <>
      <style jsx>{`
        .stacking-image {
          display: none;
        }
        @media (min-width: 728px) {
          .stacking-image {
            display: block;
            position: absolute;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 50;
            width: 200px;
            height: 200px;
            object-fit: contain;
          }
        }
      `}</style>
      <section className='relative flex flex-col gap-1 overflow-visible w-full min-h-[200px]'>
        <div className='flex items-start justify-between'>
          <div className='flex flex-col gap-0.5'>
            <h1 className='text-2xl font-semibold tracking-tight'>DCA Board - AI-Powered Crypto Strategy Manager</h1>
            <p className='max-w-xl text-sm text-[hsl(var(--gray-300)/0.8)]'>
              Orchestrate AI-assisted dollar cost averaging strategies on MultiversX.
              Review balances, fund your DCA vault, and fine-tune each strategy&apos;s
              risk and take-profit behaviour.
            </p>
          </div>

          <button
            onClick={onOpenOnboarding}
            className='flex items-center gap-2 rounded-none border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--gray-300)/0.8)] transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:text-[hsl(var(--sky-300))]'
          >
            <HelpCircle size={14} />
            How it works
          </button>
        </div>

        <div className='flex flex-col md:flex-row gap-4 items-end relative w-full overflow-visible'>
          <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-5 shadow-sm md:w-1/2'>
            <div className='flex items-start justify-between'>
              <div>
                <h2 className='text-xs font-semibold uppercase tracking-[0.25em] text-[hsl(var(--sky-300)/0.9)]'>
                  Portfolio
                </h2>
                <p className='mt-3 text-2xl font-bold'>${totalPortfolio.toFixed(2)}</p>
                <p className='mt-1 text-xs text-[hsl(var(--gray-300)/0.7)]'>
                  Total value across all DCA strategies.
                </p>
              </div>

              {address && (
                <div className='flex flex-col items-end gap-1.5 pt-1'>
                  <span className='text-[10px] uppercase tracking-wider text-[hsl(var(--gray-300)/0.5)] font-semibold'>Wallet</span>
                  <div className='flex items-center gap-2 px-2 py-1 bg-[hsl(var(--gray-300)/0.05)] border border-[hsl(var(--gray-300)/0.1)] rounded-sm'>
                    <span className='text-[10px] font-mono text-[hsl(var(--gray-300)/0.9)]'>{truncateAddress(address)}</span>
                    <a
                      href={`${network.explorerAddress}/accounts/${address}`}
                      target='_blank'
                      rel='noreferrer'
                      className='text-[hsl(var(--sky-300)/0.7)] hover:text-[hsl(var(--sky-300))] transition-colors'
                      title='View in Explorer'
                    >
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <img
          src='/assets/img/stacking.png'
          alt='Stacking'
          className='stacking-image'
        />
      </section>
    </>
  );
}

