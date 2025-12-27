'use client';
import { useState } from 'react';
import Image from 'next/image';
import { AlertTriangle } from 'lucide-react';
import { DcaStrategy } from '../types';
import { formatLastDca } from '../utils/formatTime';
import { BuysModal } from './modals/BuysModal';
import { SellsModal } from './modals/SellsModal';

// Component to display token price
function TokenPriceDisplay({ tokenIdentifier, tokenPrices }: { tokenIdentifier: string; tokenPrices: Record<string, number> }) {
  const price = tokenPrices[tokenIdentifier];
  
  if (price !== undefined && price !== null && !isNaN(price)) {
    return <span className='text-xs text-[hsl(var(--gray-300)/0.7)] ml-1'>(${price.toFixed(4)})</span>;
  }
  
  return null;
}

interface ActiveStrategiesListProps {
  strategies: DcaStrategy[];
  expandedGroups: Set<string>;
  strategyIndices: Record<string, number>;
  onToggleGroup: (groupKey: string) => void;
  onSetStrategyIndex: (groupKey: string, index: number) => void;
  onModifyStrategy: (strategyId: string) => void;
  onDeleteStrategy: (strategyId: string) => void;
  onDeposit: (strategyId: string) => void;
  onWithdraw: (strategyId: string, asset: 'usdc' | 'token') => void;
  tokenPrices: Record<string, number>;
}

export function ActiveStrategiesList({
  strategies,
  expandedGroups,
  strategyIndices,
  onToggleGroup,
  onSetStrategyIndex,
  onModifyStrategy,
  onDeleteStrategy,
  onDeposit,
  onWithdraw,
  tokenPrices
}: ActiveStrategiesListProps) {
  const [showBuysModal, setShowBuysModal] = useState<{ strategyId: string; buys: typeof strategies[0]['buys'] } | null>(null);
  const [showSellsModal, setShowSellsModal] = useState<{ strategyId: string; sells: typeof strategies[0]['sells'] } | null>(null);
  if (strategies.length === 0) {
    return (
      <p className='text-sm text-[hsl(var(--gray-300)/0.7)]'>
        No strategies yet. Create your first DCA plan on the left.
      </p>
    );
  }

  // Group strategies by token
  const groupedStrategies = strategies.reduce((acc, strategy) => {
    const token = strategy.token;
    if (!acc[token]) {
      acc[token] = [];
    }
    acc[token].push(strategy);
    return acc;
  }, {} as Record<string, typeof strategies>);

  return (
    <div className='flex flex-col gap-2'>
      {Object.entries(groupedStrategies).map(([token, tokenStrategies]) => {
        const groupKey = token;
        const isExpanded = expandedGroups.has(groupKey);
        const currentIndex = strategyIndices[groupKey] || 0;
        const currentStrategy = tokenStrategies[currentIndex];
        const headerStrategy = tokenStrategies[0];

        return (
          <div
            key={groupKey}
            className='border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))]'
          >
            {/* Collapsed header */}
            <button
              type='button'
              onClick={() => onToggleGroup(groupKey)}
              className='w-full flex items-center justify-between p-4 text-left hover:bg-[hsl(var(--gray-300)/0.05)] transition-colors'
            >
              <div className='flex items-center gap-2'>
                {headerStrategy?.tokenLogo ? (
                  <Image
                    src={headerStrategy.tokenLogo}
                    alt={token}
                    width={24}
                    height={24}
                    className='rounded-full'
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : null}
                <div className='flex flex-col'>
                  <div className='flex items-center gap-2'>
                    <span className='font-medium text-sm'>
                      {token} DCA
                    </span>
                    {/* Warning icon if any strategy has insufficient balance */}
                    {tokenStrategies.some(s => s.availableUsdc === 0 || s.availableUsdc < s.amountPerDca) && (
                      <div title='One or more strategies need funding to activate DCA'>
                        <AlertTriangle className='w-4 h-4 text-yellow-500 flex-shrink-0' />
                      </div>
                    )}
                  </div>
                  <span className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                    {tokenStrategies.length} {tokenStrategies.length === 1 ? 'strategy' : 'strategies'}
                  </span>
                </div>
              </div>
              <span className='text-[hsl(var(--gray-300)/0.7)]'>
                {isExpanded ? '▼' : '▶'}
              </span>
            </button>

            {/* Expanded content with slider */}
            {isExpanded && currentStrategy && (
              <div className='border-t border-[hsl(var(--gray-300)/0.2)] p-4'>
                {/* Slider navigation */}
                {tokenStrategies.length > 1 && (
                  <div className='flex items-center justify-between mb-4'>
                    <button
                      type='button'
                      onClick={() => {
                        const newIndex = currentIndex > 0 ? currentIndex - 1 : tokenStrategies.length - 1;
                        onSetStrategyIndex(groupKey, newIndex);
                      }}
                      className='flex items-center justify-center h-8 w-8 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.8)] transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:text-[hsl(var(--sky-300))]'
                      disabled={tokenStrategies.length <= 1}
                    >
                      ←
                    </button>
                    <span className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                      {currentIndex + 1} / {tokenStrategies.length}
                    </span>
                    <button
                      type='button'
                      onClick={() => {
                        const newIndex = currentIndex < tokenStrategies.length - 1 ? currentIndex + 1 : 0;
                        onSetStrategyIndex(groupKey, newIndex);
                      }}
                      className='flex items-center justify-center h-8 w-8 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.8)] transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:text-[hsl(var(--sky-300))]'
                      disabled={tokenStrategies.length <= 1}
                    >
                      →
                    </button>
                  </div>
                )}

                {/* Strategy card */}
                <div className='flex flex-col gap-3 text-sm'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      {currentStrategy.tokenLogo && (
                        <Image
                          src={currentStrategy.tokenLogo}
                          alt={currentStrategy.token}
                          width={24}
                          height={24}
                          className='rounded-full'
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      )}
                      <div className='flex flex-col'>
                        <span className='font-medium'>
                          {currentStrategy.token} DCA
                        </span>
                        <span className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                          {currentStrategy.frequency} • $
                          {currentStrategy.amountPerDca.toFixed(2)} USDC per run
                        </span>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <button
                        type='button'
                        onClick={() => onModifyStrategy(currentStrategy.id)}
                        className='inline-flex items-center px-3 py-1 text-xs font-medium transition-colors border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-foreground hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)]'
                      >
                        Modify Strategy
                      </button>
                      <button
                        type='button'
                        onClick={() => onDeleteStrategy(currentStrategy.id)}
                        className='inline-flex items-center justify-center h-6 w-6 border border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.8)] transition-colors hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/10'
                        title='Delete strategy'
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Warning message for insufficient balance */}
                  {(currentStrategy.availableUsdc === 0 || currentStrategy.availableUsdc < currentStrategy.amountPerDca) && (
                    <div className='flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs'>
                      <AlertTriangle className='w-4 h-4 text-yellow-500 flex-shrink-0' />
                      <span className='text-yellow-600 dark:text-yellow-400'>
                        {currentStrategy.availableUsdc === 0 
                          ? 'Deposit USDC to activate DCA for this strategy'
                          : `Deposit at least $${(currentStrategy.amountPerDca - currentStrategy.availableUsdc).toFixed(2)} more USDC to activate DCA`}
                      </span>
                    </div>
                  )}
                  
                  <div className='flex flex-col gap-2 border-t border-[hsl(var(--gray-300)/0.2)] pt-3'>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-[hsl(var(--gray-300)/0.7)]'>Available USDC</span>
                      <span className='font-medium'>${currentStrategy.availableUsdc.toFixed(2)}</span>
                    </div>
                    <div className='flex items-center justify-between text-xs'>
                      <span className='text-[hsl(var(--gray-300)/0.7)]'>
                        Available {currentStrategy.token}
                      </span>
                      <span className='font-medium'>
                        {currentStrategy.tokenBalance.toFixed(2)} {currentStrategy.token}
                        {currentStrategy.dcaTokenIdentifier && tokenPrices[currentStrategy.dcaTokenIdentifier] && (
                          <span className='text-[hsl(var(--gray-300)/0.7)] ml-1'>
                            (${(currentStrategy.tokenBalance * tokenPrices[currentStrategy.dcaTokenIdentifier]).toFixed(2)})
                          </span>
                        )}
                      </span>
                    </div>
                    
                    {currentStrategy.takeProfitPct !== undefined && (
                      <div className='flex items-center justify-between text-xs'>
                        <span className='text-[hsl(var(--gray-300)/0.7)]'>Take-profit</span>
                        <span className='font-medium'>{currentStrategy.takeProfitPct.toFixed(1)}%</span>
                      </div>
                    )}
                    
                    {currentStrategy.lastExecutedTsMillis && parseFloat(currentStrategy.lastExecutedTsMillis) > 0 && (
                      <div className='flex items-center justify-between text-xs'>
                        <span className='text-[hsl(var(--gray-300)/0.7)]'>Last DCA</span>
                        <span className='font-medium'>
                          {formatLastDca(currentStrategy.lastExecutedTsMillis)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* DCA and Take Profit Buttons */}
                  <div className='flex items-center gap-2 border-t border-[hsl(var(--gray-300)/0.2)] pt-3'>
                    <button
                      type='button'
                      onClick={() => setShowBuysModal({ strategyId: currentStrategy.id, buys: currentStrategy.buys || [] })}
                      className='flex-1 text-xs px-3 py-1.5 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.8)] hover:border-[hsl(var(--sky-300)/0.5)] hover:text-[hsl(var(--sky-300))] hover:bg-[hsl(var(--gray-300)/0.05)] transition-colors rounded'
                    >
                      DCA ({currentStrategy.buys?.length || 0})
                    </button>
                    <button
                      type='button'
                      onClick={() => setShowSellsModal({ strategyId: currentStrategy.id, sells: currentStrategy.sells || [] })}
                      className='flex-1 text-xs px-3 py-1.5 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.8)] hover:border-[hsl(var(--red-300)/0.5)] hover:text-[hsl(var(--red-300))] hover:bg-[hsl(var(--gray-300)/0.05)] transition-colors rounded'
                    >
                      Take Profit ({currentStrategy.sells?.length || 0})
                    </button>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <button
                      type='button'
                      onClick={() => onDeposit(currentStrategy.id)}
                      className='flex-1 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)]'
                    >
                      Deposit
                    </button>
                    <button
                      type='button'
                      onClick={() => onWithdraw(currentStrategy.id, 'usdc')}
                      disabled={currentStrategy.availableUsdc === 0}
                      className='flex-1 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[hsl(var(--gray-300)/0.2)] disabled:hover:bg-[hsl(var(--background))]'
                    >
                      Withdraw USDC
                    </button>
                    <button
                      type='button'
                      onClick={() => onWithdraw(currentStrategy.id, 'token')}
                      disabled={currentStrategy.tokenBalance === 0}
                      className='flex-1 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[hsl(var(--gray-300)/0.2)] disabled:hover:bg-[hsl(var(--background))]'
                    >
                      Withdraw {currentStrategy.token}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Modals */}
      {showBuysModal && showBuysModal.buys && (() => {
        const strategy = strategies.find(s => s.id === showBuysModal.strategyId);
        return (
          <BuysModal
            isOpen={true}
            buys={showBuysModal.buys}
            token={strategy?.token || ''}
            dcaTokenIdentifier={strategy?.dcaTokenIdentifier}
            tokenPrices={tokenPrices}
            onClose={() => setShowBuysModal(null)}
          />
        );
      })()}
      {showSellsModal && showSellsModal.sells && (
        <SellsModal
          isOpen={true}
          sells={showSellsModal.sells}
          token={strategies.find(s => s.id === showSellsModal.strategyId)?.token || ''}
          onClose={() => setShowSellsModal(null)}
        />
      )}
    </div>
  );
}

