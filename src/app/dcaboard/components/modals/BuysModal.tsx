'use client';
import { Swap } from '../../types';
import { formatLastDca } from '../../utils/formatTime';

interface BuysModalProps {
  isOpen: boolean;
  buys: Swap[];
  token: string;
  onClose: () => void;
}

export function BuysModal({ isOpen, buys, token, onClose }: BuysModalProps) {
  if (!isOpen) return null;

  // Calculate average buy price (average of individual buy prices)
  let averageBuyPrice: number | null = null;
  if (buys.length > 0) {
    const prices = buys
      .map((buy) => {
        const usdcAmount = parseFloat(buy.usdcAmount) / 1000000; // USDC has 6 decimals
        const tokenAmount = parseFloat(buy.dcaTokenAmount) / 1000000000000000000; // DCA tokens have 18 decimals
        if (tokenAmount > 0) {
          return usdcAmount / tokenAmount; // Price per token for this buy
        }
        return null;
      })
      .filter((price): price is number => price !== null);
    
    if (prices.length > 0) {
      averageBuyPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    }
  }

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
      onClick={onClose}
    >
      <div
        className='bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.2)] rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='p-4 border-b border-[hsl(var(--gray-300)/0.2)]'>
          <div className='flex items-center justify-between mb-2'>
            <h3 className='text-lg font-semibold'>Buy History ({buys.length})</h3>
            <button
              type='button'
              onClick={onClose}
              className='text-[hsl(var(--gray-300)/0.7)] hover:text-foreground transition-colors'
            >
              ×
            </button>
          </div>
          {averageBuyPrice !== null && (
            <div className='text-sm text-[hsl(var(--gray-300)/0.8)]'>
              Average Buy Price: <span className='font-medium text-foreground'>${averageBuyPrice.toFixed(4)}</span> per {token}
            </div>
          )}
        </div>
        <div className='overflow-y-auto flex-1 p-4'>
          {buys.length === 0 ? (
            <p className='text-sm text-[hsl(var(--gray-300)/0.7)] text-center py-8'>
              No buy transactions yet
            </p>
          ) : (
            <div className='flex flex-col gap-3'>
              {buys.map((buy, idx) => {
                const usdcAmount = parseFloat(buy.usdcAmount) / 1000000; // USDC has 6 decimals
                const tokenAmount = parseFloat(buy.dcaTokenAmount) / 1000000000000000000; // DCA tokens have 18 decimals
                // Handle timestamp - check if it's a valid timestamp
                let date: Date;
                try {
                  const timestamp = parseInt(buy.timestampMillis);
                  // Check if timestamp is reasonable (between 2000 and 2100)
                  if (timestamp > 946684800000 && timestamp < 4102444800000) {
                    date = new Date(timestamp);
                  } else {
                    // Invalid timestamp, use current date as fallback
                    date = new Date();
                  }
                } catch {
                  date = new Date();
                }
                return (
                  <div
                    key={idx}
                    className='flex items-center justify-between p-3 border border-[hsl(var(--gray-300)/0.2)] rounded bg-[hsl(var(--gray-300)/0.02)]'
                  >
                    <div className='flex flex-col gap-1'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-medium'>
                          ${usdcAmount.toFixed(2)} USDC
                        </span>
                        <span className='text-[hsl(var(--gray-300)/0.7)]'>→</span>
                        <span className='text-sm font-medium'>
                          {tokenAmount.toFixed(4)} {token}
                        </span>
                      </div>
                      <span className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                        {isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString()}
                      </span>
                    </div>
                    <div className='text-xs text-[hsl(var(--sky-300)/0.8)] font-medium'>
                      Buy
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

