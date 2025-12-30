import React from 'react';
import Image from 'next/image';

export function LoadingState() {
    return (
        <div className='flex flex-col items-center justify-center p-8 min-h-[300px] animate-pulse'>
            <div className='relative w-32 h-32 mb-4'>
                <Image
                    src='/assets/img/slothclap.png'
                    alt='Loading strategies'
                    fill
                    className='object-contain'
                />
            </div>
            <h3 className='text-lg font-medium text-[hsl(var(--gray-300))]'>
                Finding active strategies...
            </h3>
        </div>
    );
}
