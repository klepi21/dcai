'use client';
import { DcaStrategy } from '../../types';

interface DeleteModalProps {
  isOpen: boolean;
  strategy: DcaStrategy | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteModal({
  isOpen,
  strategy,
  onConfirm,
  onCancel
}: DeleteModalProps) {
  if (!isOpen || !strategy) return null;

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
          Delete Strategy
        </h2>
        <p className='text-xs text-[hsl(var(--gray-300)/0.7)] mb-4'>
          Are you sure you want to delete your {strategy.token} DCA strategy? This action cannot be undone.
        </p>

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
            onClick={onConfirm}
            className='inline-flex items-center justify-center bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700'
          >
            Delete Strategy
          </button>
        </div>
      </div>
    </div>
  );
}

