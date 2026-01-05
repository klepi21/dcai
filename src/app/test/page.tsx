'use client';
import React from 'react';
import { AuthRedirectWrapper } from '@/wrappers';
import AIChipVisualization from './components/AIChipVisualization';

export default function TestPage() {
    return (
        <AuthRedirectWrapper requireAuth={false}>
            <div className='min-h-screen w-full bg-[hsl(var(--background))] flex items-center justify-center p-8'>
                <AIChipVisualization />
            </div>
        </AuthRedirectWrapper>
    );
}
