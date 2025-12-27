'use client';
import { DcaStrategy } from '../../types';

interface WithdrawModalProps {
  isOpen: boolean;
  strategy: DcaStrategy | null;
  asset: 'usdc' | 'token' | null;
  amount: string;
  onAmountChange: (amount: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function WithdrawModal({
  isOpen,
  strategy,
  asset,
  amount,
  onAmountChange,
  onSubmit,
  onCancel
}: WithdrawModalProps) {
  if (!isOpen || !strategy || !asset) return null;

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0;
  
  const balance = asset === 'usdc' ? strategy.availableUsdc : strategy.tokenBalance;
  const assetName = asset === 'usdc' ? 'USDC' : strategy.token;
  const maxAmount = balance;
  const isValidAmount = isValid && parsedAmount <= maxAmount;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
      onClick={onCancel}
    >
      <div
        className='border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] p-6 shadow-lg w-full max-w-md mx-4'
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className='text-sm font-semibold tracking-tight mb-1'>
          Withdraw {assetName}
        </h2>
        <p className='text-xs text-[hsl(var(--gray-300)/0.7)] mb-4'>
          Enter {assetName} amount to withdraw from {strategy.token} DCA strategy
        </p>

        <div className='flex flex-col gap-2 mb-4'>
          <div className='flex items-center justify-between text-xs text-[hsl(var(--gray-300)/0.7)]'>
            <span>Available balance:</span>
            <span className='font-medium'>{balance.toFixed(2)} {assetName}</span>
          </div>
          <input
            type='number'
            min='0'
            step='0.01'
            max={maxAmount.toFixed(2)}
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
            placeholder='0.00'
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValidAmount) {
                onSubmit();
              } else if (e.key === 'Escape') {
                onCancel();
              }
            }}
          />
          {amount && !isValidAmount && (
            <p className='text-xs text-red-500'>
              {!isValid 
                ? 'Please enter a valid amount greater than 0'
                : `Amount cannot exceed available balance of ${maxAmount.toFixed(2)} ${assetName}`
              }
            </p>
          )}
        </div>

        <div className='flex gap-3 justify-end'>
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
            disabled={!isValidAmount}
            className='inline-flex items-center justify-center bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
}

