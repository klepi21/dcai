import React from 'react';
import Image from 'next/image';

interface SuccessModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onClose: () => void;
}

export function SuccessModal({ isOpen, title, message, onClose }: SuccessModalProps) {
    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
            <div className='relative w-full max-w-md overflow-hidden rounded-xl border border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-2xl animate-in fade-in zoom-in duration-300'>
                <div className='flex flex-col items-center text-center'>
                    <div className='relative w-40 h-40 mb-4'>
                        <Image
                            src='/assets/img/slothclap.png'
                            alt='Success'
                            fill
                            className='object-contain'
                        />
                    </div>

                    <h2 className='text-2xl font-bold mb-2 bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent'>
                        {title}
                    </h2>

                    <p className='text-[hsl(var(--gray-300)/0.9)] mb-6'>
                        {message}
                    </p>

                    <button
                        onClick={onClose}
                        className='w-full rounded-lg bg-[hsl(var(--sky-300)/0.2)] px-4 py-2 font-medium text-[hsl(var(--sky-300))] hover:bg-[hsl(var(--sky-300)/0.3)] transition-colors'
                    >
                        Awesome!
                    </button>
                </div>
            </div>
        </div>
    );
}
