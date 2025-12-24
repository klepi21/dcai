'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface MultiversXToken {
  identifier: string;
  name: string;
  ticker: string;
  decimals: number;
  assets?: {
    pngUrl?: string;
    svgUrl?: string;
  };
}

interface DcaStrategy {
  id: string;
  token: string;
  tokenIdentifier: string;
  tokenLogo?: string;
  frequency: string;
  amountPerDca: number;
  takeProfitPct?: number;
  isActive: boolean;
  availableUsdc: number;
  tokenBalance: number;
}

export default function DCABoard() {
  const [strategies, setStrategies] = useState<DcaStrategy[]>([]);
  const [tokens, setTokens] = useState<MultiversXToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [token, setToken] = useState<string>('');
  const [frequency, setFrequency] = useState<string>('daily');
  const [amountPerDca, setAmountPerDca] = useState<string>('50');
  const [showTakeProfit, setShowTakeProfit] = useState<boolean>(false);
  const [takeProfitPct, setTakeProfitPct] = useState<string>('15');
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState<boolean>(false);

  // Fetch MultiversX tokens
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoadingTokens(true);
        // Fetch tokens from MultiversX API
        const response = await fetch(
          'https://api.multiversx.com/tokens?size=200&type=FungibleESDT&sort=transactions',
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const tokenList: MultiversXToken[] = data || [];
          
          // Add EGLD as native token at the beginning
          const allTokens: MultiversXToken[] = [
            { 
              identifier: 'EGLD', 
              name: 'MultiversX', 
              ticker: 'EGLD', 
              decimals: 18, 
              assets: { 
                svgUrl: 'https://tools.multiversx.com/assets-cdn/tokens/EGLD/icon.svg',
                pngUrl: 'https://tools.multiversx.com/assets-cdn/tokens/EGLD/icon.png'
              } 
            },
            ...tokenList.map((t: MultiversXToken) => ({
              ...t,
              assets: {
                ...t.assets,
                svgUrl: t.identifier ? `https://tools.multiversx.com/assets-cdn/tokens/${t.identifier}/icon.svg` : undefined,
                pngUrl: t.identifier ? `https://tools.multiversx.com/assets-cdn/tokens/${t.identifier}/icon.png` : undefined,
              }
            }))
          ];
          
          setTokens(allTokens);
          if (allTokens.length > 0) {
            setToken(allTokens[0].identifier || allTokens[0].ticker);
          }
        }
      } catch (error) {
        console.error('Error fetching tokens:', error);
        // Fallback to common tokens
        const fallbackTokens: MultiversXToken[] = [
          { 
            identifier: 'EGLD', 
            name: 'MultiversX', 
            ticker: 'EGLD', 
            decimals: 18, 
            assets: { 
              svgUrl: 'https://tools.multiversx.com/assets-cdn/tokens/EGLD/icon.svg',
              pngUrl: 'https://tools.multiversx.com/assets-cdn/tokens/EGLD/icon.png'
            } 
          },
          { 
            identifier: 'WEGLD-bd4d79', 
            name: 'WrappedEGLD', 
            ticker: 'WEGLD', 
            decimals: 18,
            assets: {
              svgUrl: 'https://tools.multiversx.com/assets-cdn/tokens/WEGLD-bd4d79/icon.svg',
              pngUrl: 'https://tools.multiversx.com/assets-cdn/tokens/WEGLD-bd4d79/icon.png'
            }
          },
        ];
        setTokens(fallbackTokens);
        setToken('EGLD');
      } finally {
        setLoadingTokens(false);
      }
    };

    fetchTokens();
  }, []);

  const handleAddStrategy = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = Number(amountPerDca);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    const selectedToken = tokens.find(t => (t.identifier || t.ticker) === token);
    const parsedTakeProfit = showTakeProfit ? Number(takeProfitPct) : undefined;

    // Get token logo - prefer SVG, fallback to PNG
    const tokenLogo = selectedToken?.identifier 
      ? `https://tools.multiversx.com/assets-cdn/tokens/${selectedToken.identifier}/icon.svg`
      : (selectedToken?.assets?.svgUrl || selectedToken?.assets?.pngUrl);

    const newStrategy: DcaStrategy = {
      id: `${Date.now()}`,
      token: selectedToken?.ticker || token,
      tokenIdentifier: selectedToken?.identifier || token,
      tokenLogo,
      frequency,
      amountPerDca: parsedAmount,
      takeProfitPct: parsedTakeProfit,
      isActive: true,
      availableUsdc: 0,
      tokenBalance: 0
    };

    setStrategies((prev) => [newStrategy, ...prev]);
    
    // Reset form
    setAmountPerDca('50');
    setShowTakeProfit(false);
    setTakeProfitPct('15');
  };

  const toggleStrategy = (id: string) => {
    setStrategies((prev) =>
      prev.map((strategy) =>
        strategy.id === id
          ? { ...strategy, isActive: !strategy.isActive }
          : strategy
      )
    );
  };

  const deleteStrategy = (id: string) => {
    if (confirm('Are you sure you want to delete this strategy?')) {
      setStrategies((prev) => prev.filter((strategy) => strategy.id !== id));
    }
  };

  const handleDeposit = (strategyId: string) => {
    // TODO: Implement deposit logic
    console.log('Deposit for strategy:', strategyId);
  };

  const handleWithdraw = (strategyId: string, asset: 'usdc' | 'token') => {
    // TODO: Implement withdraw logic
    console.log(`Withdraw ${asset.toUpperCase()} for strategy:`, strategyId);
  };


  const totalPortfolio = strategies.reduce((sum, s) => sum + s.availableUsdc, 0);

  return (
    <div className='flex w-full justify-center'>
      <div className='flex w-full max-w-6xl flex-col gap-10 bg-background text-foreground'>
        <section className='grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center'>
          <div className='flex flex-col gap-6'>
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl font-semibold tracking-tight'>DCA Board</h1>
              <p className='max-w-xl text-sm text-[hsl(var(--gray-300)/0.8)]'>
                Orchestrate AI-assisted dollar cost averaging strategies on MultiversX.
                Review balances, fund your DCA vault, and fine-tune each strategy&apos;s
                risk and take-profit behaviour.
              </p>
            </div>

            <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-5 shadow-sm max-w-md'>
              <h2 className='text-xs font-semibold uppercase tracking-[0.25em] text-[hsl(var(--sky-300)/0.9)]'>
                Portfolio
              </h2>
              <p className='mt-3 text-2xl font-bold'>${totalPortfolio.toFixed(2)}</p>
              <p className='mt-1 text-xs text-[hsl(var(--gray-300)/0.7)]'>
                Total value across all DCA strategies.
              </p>
            </div>
          </div>
          <div className='flex justify-center md:justify-end'>
            <Image
              src='/assets/img/stacking.png'
              alt='DCAi staking illustration'
              width={360}
              height={360}
              className='object-contain w-[180px] h-[180px] md:w-[360px] md:h-[360px]'
            />
          </div>
        </section>

        <section className='relative grid gap-8 border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)]'>
          <div className='pointer-events-none absolute -top-20 pt-2 left-2 z-10'>
            <Image
              src='/assets/img/sloth.png'
              alt='DCAi sloth mascot'
              width={260}
              height={120}
              className='object-contain'
            />
          </div>

          <form className='flex flex-col gap-4' onSubmit={handleAddStrategy}>
            <h2 className='text-sm font-semibold tracking-tight'>
              Create a DCA strategy
            </h2>

            <div className='flex flex-col gap-1'>
              <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
                Token to DCA into
              </label>
              {loadingTokens ? (
                <div className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm flex items-center text-[hsl(var(--gray-300)/0.6)]'>
                  Loading tokens...
                </div>
              ) : (
                <div className='relative'>
                  <button
                    type='button'
                    onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                    className='flex h-9 w-full items-center gap-2 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-left text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                  >
                    {(() => {
                      const selectedToken = tokens.find(t => (t.identifier || t.ticker) === token);
                      const tokenIcon = selectedToken?.identifier 
                        ? `https://tools.multiversx.com/assets-cdn/tokens/${selectedToken.identifier}/icon.svg`
                        : (selectedToken?.assets?.svgUrl || selectedToken?.assets?.pngUrl);
                      return (
                        <>
                          {tokenIcon && (
                            <Image
                              src={tokenIcon}
                              alt={selectedToken?.ticker || ''}
                              width={20}
                              height={20}
                              className='flex-shrink-0'
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (target.src.endsWith('.svg')) {
                                  target.src = target.src.replace('.svg', '.png');
                                }
                              }}
                            />
                          )}
                          <span className='flex-1'>
                            {selectedToken?.ticker} - {selectedToken?.name}
                          </span>
                          <span className='text-[hsl(var(--gray-300)/0.6)]'>▼</span>
                        </>
                      );
                    })()}
                  </button>
                  
                  {isTokenDropdownOpen && (
                    <>
                      <div
                        className='fixed inset-0 z-10'
                        onClick={() => setIsTokenDropdownOpen(false)}
                      />
                      <div className='absolute z-20 mt-1 max-h-60 w-full overflow-auto border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] shadow-lg'>
                        {tokens.map((t) => {
                          const tokenIcon = t.identifier 
                            ? `https://tools.multiversx.com/assets-cdn/tokens/${t.identifier}/icon.svg`
                            : (t.assets?.svgUrl || t.assets?.pngUrl);
                          const isSelected = (t.identifier || t.ticker) === token;
                          return (
                            <button
                              key={t.identifier || t.ticker}
                              type='button'
                              onClick={() => {
                                setToken(t.identifier || t.ticker);
                                setIsTokenDropdownOpen(false);
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[hsl(var(--gray-300)/0.1)] ${
                                isSelected ? 'bg-[hsl(var(--sky-300)/0.2)]' : ''
                              }`}
                            >
                              {tokenIcon && (
                                <Image
                                  src={tokenIcon}
                                  alt={t.ticker}
                                  width={20}
                                  height={20}
                                  className='flex-shrink-0'
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (target.src.endsWith('.svg')) {
                                      target.src = target.src.replace('.svg', '.png');
                                    }
                                  }}
                                />
                              )}
                              <span className='flex-1'>
                                {isSelected && <span className='text-[hsl(var(--sky-300))]'>✓ </span>}
                                {t.ticker} - {t.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                >
                  <option value='hourly'>Every hour</option>
                  <option value='daily'>Daily</option>
                  <option value='weekly'>Weekly</option>
                  <option value='monthly'>Monthly</option>
                </select>
              </div>

              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
                  USDC per DCA
                </label>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={amountPerDca}
                  onChange={(e) => setAmountPerDca(e.target.value)}
                  className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                />
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <button
                type='button'
                onClick={() => setShowTakeProfit(!showTakeProfit)}
                className='flex items-center justify-between border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] p-3 text-left text-sm transition-colors hover:border-[hsl(var(--sky-300)/0.3)]'
              >
                <span className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
                  Take-profit % (Optional)
                </span>
                <span className='text-[hsl(var(--sky-300))]'>
                  {showTakeProfit ? '−' : '+'}
                </span>
              </button>
              
              {showTakeProfit && (
                <div className='flex flex-col gap-1 border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-3'>
                  <input
                    type='number'
                    min='0'
                    step='0.1'
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(e.target.value)}
                    className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                    placeholder='15'
                  />
                  <p className='text-[11px] text-[hsl(var(--gray-300)/0.7)]'>
                    For every DCA leg, DCAi will try to lock profit once price
                    moves up by this percentage.
                  </p>
                </div>
              )}
            </div>

            <div className='mt-2 flex justify-end'>
              <button
                type='submit'
                className='inline-flex items-center justify-center bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700'
              >
                Create Strategy
              </button>
            </div>
          </form>

          <div className='flex flex-col gap-3'>
            <h2 className='text-sm font-semibold tracking-tight'>
              Active strategies
            </h2>
            {strategies.length === 0 ? (
              <p className='text-sm text-[hsl(var(--gray-300)/0.7)]'>
                No strategies yet. Create your first DCA plan on the left.
              </p>
            ) : (
              <div className='flex flex-col gap-3'>
                {strategies.map((strategy) => (
                  <div
                    key={strategy.id}
                    className='flex flex-col gap-3 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] p-4 text-sm'
                  >
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        {strategy.tokenLogo && (
                          <Image
                            src={strategy.tokenLogo}
                            alt={strategy.token}
                            width={24}
                            height={24}
                            className='rounded-full'
                            onError={(e) => {
                              // Fallback to PNG if SVG fails
                              const target = e.target as HTMLImageElement;
                              if (target.src.endsWith('.svg')) {
                                target.src = target.src.replace('.svg', '.png');
                              }
                            }}
                          />
                        )}
                        <div className='flex flex-col'>
                          <span className='font-medium'>
                            {strategy.token} DCA
                          </span>
                          <span className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                            {strategy.frequency} • $
                            {strategy.amountPerDca.toFixed(2)} USDC per run
                          </span>
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <button
                          type='button'
                          onClick={() => toggleStrategy(strategy.id)}
                          className={`inline-flex items-center px-3 py-1 text-xs font-medium transition-colors ${
                            strategy.isActive
                              ? 'bg-[hsl(var(--sky-300))] text-black'
                              : 'bg-[hsl(var(--gray-300)/0.2)] text-[hsl(var(--gray-300)/0.8)]'
                          }`}
                        >
                          {strategy.isActive ? 'Enabled' : 'Disabled'}
                        </button>
                        <button
                          type='button'
                          onClick={() => deleteStrategy(strategy.id)}
                          className='inline-flex items-center justify-center h-6 w-6 border border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.8)] transition-colors hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/10'
                          title='Delete strategy'
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    
                    <div className='flex flex-col gap-2 border-t border-[hsl(var(--gray-300)/0.2)] pt-3'>
                      <div className='flex items-center justify-between text-xs'>
                        <span className='text-[hsl(var(--gray-300)/0.7)]'>Available USDC</span>
                        <span className='font-medium'>${strategy.availableUsdc.toFixed(2)}</span>
                      </div>
                      <div className='flex items-center justify-between text-xs'>
                        <span className='text-[hsl(var(--gray-300)/0.7)]'>
                          Available {strategy.token}
                        </span>
                        <span className='font-medium'>
                          {strategy.tokenBalance.toFixed(4)} {strategy.token}
                        </span>
                      </div>
                      
                      {strategy.takeProfitPct !== undefined && (
                        <div className='flex items-center justify-between text-xs'>
                          <span className='text-[hsl(var(--gray-300)/0.7)]'>Take-profit</span>
                          <span className='font-medium'>{strategy.takeProfitPct}%</span>
                        </div>
                      )}
                    </div>

                    <div className='flex flex-wrap gap-2'>
                      <button
                        type='button'
                        onClick={() => handleDeposit(strategy.id)}
                        className='flex-1 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)]'
                      >
                        Deposit
                      </button>
                      <button
                        type='button'
                        onClick={() => handleWithdraw(strategy.id, 'usdc')}
                        className='flex-1 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)]'
                      >
                        Withdraw USDC
                      </button>
                      <button
                        type='button'
                        onClick={() => handleWithdraw(strategy.id, 'token')}
                        className='flex-1 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)]'
                      >
                        Withdraw {strategy.token}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className='relative mt-8 border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm'>
          <div className='pointer-events-none absolute top-0 right-8 z-10 -translate-y-full'>
            <Image
              src='/assets/img/slothyoga.png'
              alt='DCAi sloth yoga'
              width={180}
              height={180}
              className='object-contain w-[90px] h-[90px] md:w-[180px] md:h-[180px]'
            />
          </div>

          <h2 className='mb-4 text-sm font-semibold tracking-tight'>
            Latest DCAi Activity
          </h2>
          <div className='flex flex-col gap-3'>
            <div className='flex items-center gap-3 border-b border-[hsl(var(--gray-300)/0.1)] pb-3 text-sm'>
              <div className='flex h-8 w-8 items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.9)]'>
                <span className='text-xs'>DCA</span>
              </div>
              <div className='flex-1'>
                <p className='font-medium'>DCA executed for EGLD</p>
                <p className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                  Bought 0.25 EGLD for $50.00 USDC • 2 hours ago
                </p>
              </div>
            </div>
            
            <div className='flex items-center gap-3 border-b border-[hsl(var(--gray-300)/0.1)] pb-3 text-sm'>
              <div className='flex h-8 w-8 items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.9)]'>
                <span className='text-xs'>+</span>
              </div>
              <div className='flex-1'>
                <p className='font-medium'>Deposit received</p>
                <p className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                  $200.00 USDC deposited to EGLD strategy • 5 hours ago
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3 border-b border-[hsl(var(--gray-300)/0.1)] pb-3 text-sm'>
              <div className='flex h-8 w-8 items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.9)]'>
                <span className='text-xs'>✓</span>
              </div>
              <div className='flex-1'>
                <p className='font-medium'>Take-profit executed</p>
                <p className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                  Sold 0.15 EGLD at +18.5% profit • 1 day ago
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3 border-b border-[hsl(var(--gray-300)/0.1)] pb-3 text-sm'>
              <div className='flex h-8 w-8 items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.9)]'>
                <span className='text-xs'>DCA</span>
              </div>
              <div className='flex-1'>
                <p className='font-medium'>DCA executed for WEGLD</p>
                <p className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                  Bought 12.5 WEGLD for $50.00 USDC • 1 day ago
                </p>
              </div>
            </div>

            <div className='flex items-center gap-3 text-sm'>
              <div className='flex h-8 w-8 items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.9)]'>
                <span className='text-xs'>⚙</span>
              </div>
              <div className='flex-1'>
                <p className='font-medium'>Strategy created</p>
                <p className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                  EGLD DCA strategy activated • 2 days ago
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
