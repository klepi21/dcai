'use client';
import { useState } from 'react';
import { MultiversXToken } from '../types';
import { DcaSetup } from '@/hooks/dca/useDcaContract';
import { useGetNetworkConfig } from '@/lib';

type NetworkConfig = ReturnType<typeof useGetNetworkConfig>['network'];
import { TokenDropdown } from './TokenDropdown';
import { FrequencyDropdown } from './FrequencyDropdown';

interface CreateStrategyFormProps {
  tokens: MultiversXToken[];
  token: string;
  onTokenChange: (token: string) => void;
  frequency: string;
  onFrequencyChange: (frequency: string) => void;
  amountPerDca: string;
  onAmountPerDcaChange: (amount: string) => void;
  showTakeProfit: boolean;
  onShowTakeProfitChange: (show: boolean) => void;
  takeProfitPct: string;
  onTakeProfitPctChange: (pct: string) => void;
  setup: DcaSetup | null;
  setups: DcaSetup[] | null;
  loadingSetup: boolean;
  loadingTokens: boolean;
  setupError: string | null;
  isCreatingStrategy: boolean;
  onSubmit: (e: React.FormEvent) => void;
  network: NetworkConfig;
}

export function CreateStrategyForm({
  tokens,
  token,
  onTokenChange,
  frequency,
  onFrequencyChange,
  amountPerDca,
  onAmountPerDcaChange,
  showTakeProfit,
  onShowTakeProfitChange,
  takeProfitPct,
  onTakeProfitPctChange,
  setup,
  setups,
  loadingSetup,
  loadingTokens,
  setupError,
  isCreatingStrategy,
  onSubmit,
  network
}: CreateStrategyFormProps) {
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);
  const [isFrequencyDropdownOpen, setIsFrequencyDropdownOpen] = useState(false);

  const selectedSetup = setups?.find(s => s.dcaToken === token) || setup;
  const frequencies = selectedSetup && selectedSetup.allowedFrequencies && selectedSetup.allowedFrequencies.length > 0
    ? selectedSetup.allowedFrequencies.map(freq => freq.frequency)
    : ['hourly', 'daily', 'weekly', 'monthly'];

  const handleTokenSelect = (newToken: string) => {
    onTokenChange(newToken);
    const selectedSetup = setups?.find(s => s.dcaToken === newToken);
    if (selectedSetup) {
      if (selectedSetup.allowedFrequencies && selectedSetup.allowedFrequencies.length > 0) {
        onFrequencyChange(selectedSetup.allowedFrequencies[0].frequency);
      }
      onAmountPerDcaChange('1.00');
    }
  };

  return (
    <form className='flex flex-col gap-4' onSubmit={onSubmit}>
      <div className='flex items-center justify-between'>
        <h2 className='text-sm font-semibold tracking-tight'>
          Create a DCA strategy
        </h2>
        {setupError && (
          <span className='text-xs text-red-500'>{setupError}</span>
        )}
      </div>

      <div className='flex flex-col gap-1'>
        <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
          Token to DCA into
        </label>
        <TokenDropdown
          tokens={tokens}
          selectedToken={token}
          onSelectToken={handleTokenSelect}
          isOpen={isTokenDropdownOpen}
          onToggle={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
          loading={loadingTokens}
          network={network}
        />
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='flex flex-col gap-1'>
          <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
            Frequency
          </label>
          <FrequencyDropdown
            frequencies={frequencies}
            selectedFrequency={frequency}
            onSelectFrequency={onFrequencyChange}
            isOpen={isFrequencyDropdownOpen}
            onToggle={() => setIsFrequencyDropdownOpen(!isFrequencyDropdownOpen)}
            loading={loadingSetup}
          />
        </div>

        <div className='flex flex-col gap-1'>
          <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
            USDC per DCA
            {selectedSetup && (
              <span className='text-[hsl(var(--gray-300)/0.6)] ml-1'>
                (Min: {parseFloat(selectedSetup.minAmountPerSwap).toFixed(2)} USDC)
              </span>
            )}
          </label>
          <input
            type='number'
            min={selectedSetup ? parseFloat(selectedSetup.minAmountPerSwap).toFixed(2) : '0'}
            step='0.01'
            value={amountPerDca}
            onChange={(e) => onAmountPerDcaChange(e.target.value)}
            className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
            placeholder={selectedSetup ? parseFloat(selectedSetup.minAmountPerSwap).toFixed(2) : '50'}
          />
        </div>
      </div>

      <div className='flex flex-col gap-2'>
        <button
          type='button'
          onClick={() => onShowTakeProfitChange(!showTakeProfit)}
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
              onChange={(e) => onTakeProfitPctChange(e.target.value)}
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
          disabled={isCreatingStrategy}
          className='inline-flex items-center justify-center bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isCreatingStrategy ? 'Creating...' : 'Create Strategy'}
        </button>
      </div>
    </form>
  );
}

