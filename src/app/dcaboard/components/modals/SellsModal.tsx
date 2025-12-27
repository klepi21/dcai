'use client';
import { Swap } from '../../types';

interface SellsModalProps {
  isOpen: boolean;
  sells: Swap[];
  token: string;
  onClose: () => void;
}

export function SellsModal({ isOpen, sells, token, onClose }: SellsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
      onClick={onClose}
    >
      <div
        className='bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.2)] rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between p-4 border-b border-[hsl(var(--gray-300)/0.2)]'>
          <h3 className='text-lg font-semibold'>Take Profit History ({sells.length})</h3>
          <button
            type='button'
            onClick={onClose}
            className='text-[hsl(var(--gray-300)/0.7)] hover:text-foreground transition-colors'
          >
            ×
          </button>
        </div>
        <div className='overflow-y-auto flex-1 p-4'>
          {sells.length === 0 ? (
            <p className='text-sm text-[hsl(var(--gray-300)/0.7)] text-center py-8'>
              No take profit transactions yet
            </p>
          ) : (
            <div className='flex flex-col gap-3'>
              {sells.map((sell, idx) => {
                const tokenAmount = parseFloat(sell.dcaTokenAmount) / 1000000000000000000; // DCA tokens have 18 decimals
                const usdcAmount = parseFloat(sell.usdcAmount) / 1000000; // USDC has 6 decimals
                // Handle timestamp - check if it's a valid timestamp
                let date: Date;
                try {
                  const timestamp = parseInt(sell.timestampMillis);
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
                          {tokenAmount.toFixed(4)} {token}
                        </span>
                        <span className='text-[hsl(var(--gray-300)/0.7)]'>→</span>
                        <span className='text-sm font-medium'>
                          ${usdcAmount.toFixed(2)} USDC
                        </span>
                      </div>
                      <span className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                        {isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString()}
                      </span>
                    </div>
                    <div className='text-xs text-[hsl(var(--red-300)/0.8)] font-medium'>
                      Take Profit
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

