'use client';
import { DcaStrategy } from '../../types';

interface DepositModalProps {
  isOpen: boolean;
  strategy: DcaStrategy | null;
  amount: string;
  usdcWalletBalance: number;
  onAmountChange: (amount: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function DepositModal({
  isOpen,
  strategy,
  amount,
  usdcWalletBalance,
  onAmountChange,
  onSubmit,
  onCancel
}: DepositModalProps) {
  if (!isOpen || !strategy) return null;

  const parsedAmount = parseFloat(amount);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0;

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
          Deposit USDC
        </h2>
        <p className='text-xs text-[hsl(var(--gray-300)/0.7)] mb-4'>
          Enter USDC amount to deposit for {strategy.token} DCA strategy
        </p>

        <div className='flex flex-col gap-2 mb-4'>
          <div className='flex items-center justify-between text-xs text-[hsl(var(--gray-300)/0.7)]'>
            <span>Wallet balance:</span>
            <span className='font-medium'>{usdcWalletBalance.toFixed(2)} USDC</span>
          </div>
        </div>

        <div className='flex flex-col gap-2 mb-6'>
          <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
            Amount (USDC)
          </label>
          <input
            type='number'
            min='0'
            step='0.01'
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
            placeholder='0.00'
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid) {
                onSubmit();
              } else if (e.key === 'Escape') {
                onCancel();
              }
            }}
          />
          {amount && !isValid && (
            <p className='text-xs text-red-500'>
              Please enter a valid amount greater than 0
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
            disabled={!isValid}
            className='inline-flex items-center justify-center bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Deposit
          </button>
        </div>
      </div>
    </div>
  );
}

