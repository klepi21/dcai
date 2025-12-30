interface FrequencyOption {
  frequency: string;
}

interface FrequencyDropdownProps {
  frequencies: string[];
  selectedFrequency: string;
  onSelectFrequency: (frequency: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  loading: boolean;
}

function getFrequencyDisplayName(freq: string): string {
  return freq.charAt(0).toUpperCase() + freq.slice(1);
}

export function FrequencyDropdown({
  frequencies,
  selectedFrequency,
  onSelectFrequency,
  isOpen,
  onToggle,
  loading
}: FrequencyDropdownProps) {
  if (loading) {
    return (
      <div className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm flex items-center text-[hsl(var(--gray-300)/0.6)]'>
        Loading frequencies...
      </div>
    );
  }

  // Check if the selected frequency is valid (exists in the frequencies array)
  const isValidFrequency = selectedFrequency && frequencies.includes(selectedFrequency);
  const currentFrequencyDisplay = isValidFrequency
    ? getFrequencyDisplayName(selectedFrequency)
    : (frequencies.length > 0 ? 'Select frequency' : 'No frequencies available');

  return (
    <div className='relative'>
      <button
        type='button'
        onClick={onToggle}
        className='flex h-9 w-full items-center gap-2 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-left text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
      >
        <span className='flex-1'>{currentFrequencyDisplay}</span>
        <span className='text-[hsl(var(--gray-300)/0.6)]'>▼</span>
      </button>

      {isOpen && (
        <>
          <div
            className='fixed inset-0 z-10'
            onClick={onToggle}
          />
          <div className='absolute z-20 mt-1 max-h-60 w-full overflow-auto border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] shadow-lg'>
            {frequencies.map((freq) => {
              const isSelected = selectedFrequency === freq;
              const displayName = getFrequencyDisplayName(freq);
              return (
                <button
                  key={freq}
                  type='button'
                  onClick={() => {
                    onSelectFrequency(freq);
                    onToggle();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[hsl(var(--gray-300)/0.1)] ${isSelected ? 'bg-[hsl(var(--sky-300)/0.2)]' : ''
                    }`}
                >
                  <span className='flex-1'>
                    {isSelected && <span className='text-[hsl(var(--sky-300))]'>✓ </span>}
                    {displayName}
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

