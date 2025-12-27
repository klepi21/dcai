import Image from 'next/image';
import { MultiversXToken } from '../types';
import { getNetworkPath } from '../utils/network';
import { NetworkConfig } from '@/lib';

interface TokenDropdownProps {
  tokens: MultiversXToken[];
  selectedToken: string;
  onSelectToken: (token: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  loading: boolean;
  network: NetworkConfig;
}

export function TokenDropdown({
  tokens,
  selectedToken,
  onSelectToken,
  isOpen,
  onToggle,
  loading,
  network
}: TokenDropdownProps) {
  if (loading) {
    return (
      <div className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm flex items-center text-[hsl(var(--gray-300)/0.6)]'>
        Loading tokens...
      </div>
    );
  }

  const selectedTokenData = tokens.find(t => (t.identifier || t.ticker) === selectedToken);
  const networkPath = getNetworkPath(network);
  const tokenIcon = selectedTokenData?.assets?.pngUrl || selectedTokenData?.assets?.svgUrl || 
    (selectedTokenData?.identifier 
      ? `https://tools.multiversx.com/assets-cdn/${networkPath}/tokens/${selectedTokenData.identifier}/icon.png`
      : undefined);

  return (
    <div className='relative'>
      <button
        type='button'
        onClick={onToggle}
        className='flex h-9 w-full items-center gap-2 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-left text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
      >
        {tokenIcon && (
          <Image
            src={tokenIcon}
            alt={selectedTokenData?.ticker || ''}
            width={20}
            height={20}
            className='flex-shrink-0'
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        )}
        <span className='flex-1'>
          {selectedTokenData?.ticker || 'Select token'}
        </span>
        <span className='text-[hsl(var(--gray-300)/0.6)]'>▼</span>
      </button>
      
      {isOpen && (
        <>
          <div
            className='fixed inset-0 z-10'
            onClick={onToggle}
          />
          <div className='absolute z-20 mt-1 max-h-60 w-full overflow-auto border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] shadow-lg'>
            {tokens.map((t) => {
              const icon = t.assets?.pngUrl || t.assets?.svgUrl ||
                (t.identifier 
                  ? `https://tools.multiversx.com/assets-cdn/${networkPath}/tokens/${t.identifier}/icon.png`
                  : undefined);
              const isSelected = (t.identifier || t.ticker) === selectedToken;
              return (
                <button
                  key={t.identifier || t.ticker}
                  type='button'
                  onClick={() => {
                    onSelectToken(t.identifier || t.ticker);
                    onToggle();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[hsl(var(--gray-300)/0.1)] ${
                    isSelected ? 'bg-[hsl(var(--sky-300)/0.2)]' : ''
                  }`}
                >
                  {icon && (
                    <Image
                      src={icon}
                      alt={t.ticker}
                      width={20}
                      height={20}
                      className='flex-shrink-0'
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  )}
                  <span className='flex-1'>
                    {isSelected && <span className='text-[hsl(var(--sky-300))]'>✓ </span>}
                    {t.ticker}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

