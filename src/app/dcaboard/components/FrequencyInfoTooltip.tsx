interface FrequencyInfoTooltipProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function FrequencyInfoTooltip({ isOpen, onToggle }: FrequencyInfoTooltipProps) {
  return (
    <button
      type='button'
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className='relative flex items-center justify-center h-4 w-4 text-[hsl(var(--gray-300)/0.6)] hover:text-[hsl(var(--sky-300))] transition-colors'
      title='DCAi LLM Information'
    >
      <span className='text-xs'>ℹ</span>
      {isOpen && (
        <>
          <div
            className='fixed inset-0 z-40'
            onClick={onToggle}
          />
          <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-xs bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.2)] shadow-lg z-50 rounded'>
            <p className='text-[hsl(var(--gray-300)/0.9)]'>
              DCAi LLM works only with <strong>Daily</strong> or <strong>Weekly</strong> frequency. These frequencies are marked with &quot;(DCAi Activated)&quot; in the dropdown.
            </p>
            <div className='absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-[hsl(var(--background))] border-r border-b border-[hsl(var(--gray-300)/0.2)] rotate-45'></div>
          </div>
        </>
      )}
    </button>
  );
}

