'use client';
import { useState } from 'react';
import { DcaStrategy } from '../../types';
import { DcaSetup } from '@/hooks/dca/useDcaContract';
import { FrequencyDropdown } from '../FrequencyDropdown';

interface ModifyStrategyModalProps {
  isOpen: boolean;
  strategy: DcaStrategy | null;
  setups: DcaSetup[] | null;
  amountPerDca: string;
  frequency: string;
  takeProfitPct: string;
  showTakeProfit: boolean;
  onAmountPerDcaChange: (amount: string) => void;
  onFrequencyChange: (frequency: string) => void;
  onTakeProfitPctChange: (pct: string) => void;
  onShowTakeProfitChange: (show: boolean) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ModifyStrategyModal({
  isOpen,
  strategy,
  setups,
  amountPerDca,
  frequency,
  takeProfitPct,
  showTakeProfit,
  onAmountPerDcaChange,
  onFrequencyChange,
  onTakeProfitPctChange,
  onShowTakeProfitChange,
  onSubmit,
  onCancel
}: ModifyStrategyModalProps) {
  const [isModifyFrequencyDropdownOpen, setIsModifyFrequencyDropdownOpen] = useState(false);

  if (!isOpen || !strategy) return null;

  // Find the setup for this strategy's token to get allowed frequencies
  const strategySetup = setups?.find(s => {
    const setupTicker = s.dcaToken.split('-')[0];
    return setupTicker === strategy.token;
  });

  const parsedAmountPerDca = parseFloat(amountPerDca);
  const isValidAmount = !isNaN(parsedAmountPerDca) && parsedAmountPerDca > 0;
  
  const minAmount = strategySetup ? parseFloat(strategySetup.minAmountPerSwap) : 0;
  const isValidAmountWithMin = isValidAmount && parsedAmountPerDca >= minAmount;

  const parsedTakeProfitPct = showTakeProfit && takeProfitPct 
    ? parseFloat(takeProfitPct) 
    : 0;
  const isValidTakeProfit = !showTakeProfit || (parsedTakeProfitPct >= 0 && parsedTakeProfitPct <= 100);

  const isValid = isValidAmountWithMin && isValidTakeProfit && frequency;

  const frequencies = strategySetup && strategySetup.allowedFrequencies && strategySetup.allowedFrequencies.length > 0
    ? strategySetup.allowedFrequencies.map(freq => freq.frequency)
    : ['hourly', 'daily', 'weekly', 'monthly'];

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
      onClick={onCancel}
    >
      <div
        className='border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] p-6 shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className='text-sm font-semibold tracking-tight mb-1'>
          Modify Strategy
        </h2>
        <p className='text-xs text-[hsl(var(--gray-300)/0.7)] mb-4'>
          Update your {strategy.token} DCA strategy settings
        </p>

        <div className='flex flex-col gap-4'>
          {/* Frequency */}
          <div className='flex flex-col gap-1'>
            <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
              Frequency
            </label>
            <FrequencyDropdown
              frequencies={frequencies}
              selectedFrequency={frequency}
              onSelectFrequency={onFrequencyChange}
              isOpen={isModifyFrequencyDropdownOpen}
              onToggle={() => setIsModifyFrequencyDropdownOpen(!isModifyFrequencyDropdownOpen)}
              loading={false}
            />
          </div>

          {/* Amount per DCA */}
          <div className='flex flex-col gap-1'>
            <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
              USDC per DCA
              {minAmount > 0 && (
                <span className='text-[hsl(var(--gray-300)/0.6)] ml-1'>
                  (Min: {minAmount.toFixed(2)} USDC)
                </span>
              )}
            </label>
            <input
              type='number'
              min={minAmount.toFixed(2)}
              step='0.01'
              value={amountPerDca}
              onChange={(e) => onAmountPerDcaChange(e.target.value)}
              className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
              placeholder='0.00'
            />
            {amountPerDca && !isValidAmountWithMin && (
              <p className='text-xs text-red-500'>
                {!isValidAmount 
                  ? 'Please enter a valid amount greater than 0'
                  : `Amount must be at least ${minAmount.toFixed(2)} USDC`
                }
              </p>
            )}
          </div>

          {/* Take Profit */}
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
                  max='100'
                  step='0.1'
                  value={takeProfitPct}
                  onChange={(e) => onTakeProfitPctChange(e.target.value)}
                  className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                  placeholder='15'
                />
                {takeProfitPct && !isValidTakeProfit && (
                  <p className='text-xs text-red-500'>
                    Take profit must be between 0 and 100
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className='flex gap-3 justify-end mt-6'>
          <button
            type='button'
            onClick={onCancel}
            className='inline-flex items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)]'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={onSubmit}
            disabled={!isValid}
            className='inline-flex items-center justify-center bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Modify Strategy
          </button>
        </div>
      </div>
    </div>
  );
}

