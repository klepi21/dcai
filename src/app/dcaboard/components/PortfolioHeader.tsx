interface PortfolioHeaderProps {
  totalPortfolio: number;
}

export function PortfolioHeader({ totalPortfolio }: PortfolioHeaderProps) {
  return (
    <section className='flex flex-col gap-1 overflow-visible'>
      <div className='flex flex-col gap-0.5'>
        <h1 className='text-2xl font-semibold tracking-tight'>DCA Board</h1>
        <p className='max-w-xl text-sm text-[hsl(var(--gray-300)/0.8)]'>
          Orchestrate AI-assisted dollar cost averaging strategies on MultiversX.
          Review balances, fund your DCA vault, and fine-tune each strategy&apos;s
          risk and take-profit behaviour.
        </p>
      </div>

      <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-5 shadow-sm'>
        <h2 className='text-xs font-semibold uppercase tracking-[0.25em] text-[hsl(var(--sky-300)/0.9)]'>
          Portfolio
        </h2>
        <p className='mt-3 text-2xl font-bold'>${totalPortfolio.toFixed(2)}</p>
        <p className='mt-1 text-xs text-[hsl(var(--gray-300)/0.7)]'>
          Total value across all DCA strategies.
        </p>
      </div>
    </section>
  );
}

