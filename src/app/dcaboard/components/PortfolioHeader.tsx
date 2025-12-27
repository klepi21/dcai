'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { DcaStrategy } from '../types';

interface PortfolioHeaderProps {
  totalPortfolio: number;
  llmText?: string;
}

export function PortfolioHeader({ totalPortfolio, llmText }: PortfolioHeaderProps) {
  // Placeholder crypto phrase for testing
  const fullText = llmText || "Bitcoin's halving cycles create predictable supply shocks that historically precede major bull runs, making DCA strategies particularly effective during accumulation phases.";
  
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let currentIndex = 0;

    const typingInterval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsTyping(false);
        clearInterval(typingInterval);
      }
    }, 30); // Adjust speed here (lower = faster)

    return () => clearInterval(typingInterval);
  }, [fullText]);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  return (
    <section className='grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)] md:items-center overflow-visible'>
      <div className='flex flex-col gap-6 overflow-visible'>
        <div className='flex flex-col gap-2'>
          <h1 className='text-2xl font-semibold tracking-tight'>DCA Board</h1>
          <p className='max-w-xl text-sm text-[hsl(var(--gray-300)/0.8)]'>
            Orchestrate AI-assisted dollar cost averaging strategies on MultiversX.
            Review balances, fund your DCA vault, and fine-tune each strategy&apos;s
            risk and take-profit behaviour.
          </p>
        </div>

        <div className='relative grid gap-4 md:grid-cols-[1fr_2fr] overflow-visible'>
          <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-5 shadow-sm'>
            <h2 className='text-xs font-semibold uppercase tracking-[0.25em] text-[hsl(var(--sky-300)/0.9)]'>
              Portfolio
            </h2>
            <p className='mt-3 text-2xl font-bold'>${totalPortfolio.toFixed(2)}</p>
            <p className='mt-1 text-xs text-[hsl(var(--gray-300)/0.7)]'>
              Total value across all DCA strategies.
            </p>
          </div>

          <div className='relative border-2 border-[hsl(var(--gray-300)/0.3)] bg-[#0d1117] p-5 shadow-sm font-mono overflow-visible'>
            {isDesktop && (
              <div className='pointer-events-none absolute bottom-12 -pb-16 left-1/2 -translate-x-1/2 z-[100]'>
                <img
                  src='/assets/img/hodloth.png'
                  alt='DCAi hodloth mascot'
                  width={240}
                  height={240}
                  className='object-contain w-[240px] h-[240px]'
                />
              </div>
            )}
            <div className='flex items-center gap-2 mb-3'>
              <div className='flex gap-1.5'>
                <div className='w-3 h-3 rounded-full bg-[#ff5f56]'></div>
                <div className='w-3 h-3 rounded-full bg-[#ffbd2e]'></div>
                <div className='w-3 h-3 rounded-full bg-[#27c93f]'></div>
              </div>
              <span className='text-xs text-[#8b949e] ml-2'>DCAi LLM Terminal</span>
            </div>
            <div className='space-y-2'>
              <div className='flex items-start gap-2'>
                <span className='text-[#58a6ff] select-none'>$</span>
                <span className='text-[#c9d1d9] text-xs leading-relaxed whitespace-pre-wrap'>
                  {displayedText}
                  {isTyping && <span className='text-[#27c93f] animate-pulse'>▊</span>}
                </span>
              </div>
              {!isTyping && (
                <div className='flex items-center gap-2 mt-3'>
                  <span className='text-[#58a6ff]'>❯</span>
                  <span className='text-[#27c93f] animate-pulse'>▊</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}

