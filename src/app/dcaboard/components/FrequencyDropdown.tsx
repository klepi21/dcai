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

  // Sanitize frequency values - remove any invisible characters, trim whitespace, and normalize
  const sanitizeFrequency = (freq: string): string => {
    if (!freq) return '';
    // Remove any non-printable characters and trim
    return freq.replace(/[^\x20-\x7E]/g, '').trim().toLowerCase();
  };

  // Filter out invalid frequencies (empty or only non-printable characters)
  const validFrequencies = frequencies.filter(f => {
    const sanitized = sanitizeFrequency(f);
    return sanitized.length > 0; // Only keep frequencies with actual printable characters
  });

  const sanitizedSelectedFrequency = sanitizeFrequency(selectedFrequency);
  const sanitizedFrequencies = validFrequencies.map(f => sanitizeFrequency(f));

  // Check if the selected frequency is valid (exists in the frequencies array)
  const isValidFrequency = sanitizedSelectedFrequency && sanitizedFrequencies.includes(sanitizedSelectedFrequency);

  // Find the original frequency value that matches (for display purposes)
  const matchingFrequency = isValidFrequency
    ? validFrequencies[sanitizedFrequencies.indexOf(sanitizedSelectedFrequency)]
    : '';

  const currentFrequencyDisplay = matchingFrequency
    ? getFrequencyDisplayName(matchingFrequency)
    : (validFrequencies.length > 0 ? 'Select frequency' : 'No frequencies available');

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
            {validFrequencies.map((freq) => {
              // Use sanitized comparison for accurate selection matching
              const sanitizedFreq = sanitizeFrequency(freq);
              const isSelected = sanitizedFreq === sanitizedSelectedFrequency;
              const displayName = getFrequencyDisplayName(freq);
              return (
                <button
                  key={freq}
                  type='button'
                  onClick={() => {
                    onSelectFrequency(freq);
                    onToggle();
                  }}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors hover:bg-[hsl(var(--gray-300)/0.1)] ${isSelected ? 'bg-[hsl(var(--sky-300)/0.2)]' : ''
                    }`}
                >
                  {isSelected && <span className='text-[hsl(var(--sky-300))] mr-1'>✓</span>}
                  {displayName}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

