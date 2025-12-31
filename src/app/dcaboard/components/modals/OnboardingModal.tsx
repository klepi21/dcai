'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, Zap, Target, TrendingUp, Sparkles } from 'lucide-react';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        {
            title: 'Welcome to DCAi',
            description: 'Your sophisticated dashboard for AI-powered Dollar Cost Averaging on MultiversX. Let\'s get you started with the basics.',
            image: '/assets/img/slothclap.png',
            icon: <Sparkles className="w-6 h-6 text-[hsl(var(--sky-300))]" />,
        },
        {
            title: 'DCA Strategies',
            description: 'Create automated buy plans for your favorite tokens. Set your frequency (Daily, Weekly, Hourly) and the amount of USDC to swap each time.',
            image: '/assets/img/stacking.png',
            icon: <Target className="w-6 h-6 text-[hsl(var(--sky-300))]" />,
        },
        {
            title: 'AI Optimization',
            description: 'Leverage Grok/HODLOTH LLMs to analyze your strategy. The AI can suggest optimal adjustments to your parameters based on market conditions.',
            image: '/assets/img/slothyoga.png',
            icon: <Zap className="w-6 h-6 text-[hsl(var(--sky-300))]" />,
        },
        {
            title: 'Automated Take-Profit',
            description: 'Set a target percentage, and DCAi will automatically lock in your profits when the price moves up. Fully automated, hands-off execution.',
            image: '/assets/img/slothclap.png',
            icon: <TrendingUp className="w-6 h-6 text-[hsl(var(--sky-300))]" />,
        }
    ];

    if (!isOpen) return null;

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onClose();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md'>
            <div className='relative w-full max-w-lg overflow-hidden border-2 border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] shadow-2xl animate-in fade-in zoom-in duration-300'>
                {/* Progress bar */}
                <div className="absolute top-0 left-0 h-1 bg-[hsl(var(--sky-300))] transition-all duration-300 ease-out" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />

                <button
                    onClick={onClose}
                    className='absolute right-4 top-4 z-20 text-[hsl(var(--gray-300)/0.6)] hover:text-foreground transition-colors'
                >
                    <X size={20} />
                </button>

                <div className='p-8 pt-12'>
                    <div className='flex flex-col items-center text-center'>
                        <div className='mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--sky-300)/0.1)] border border-[hsl(var(--sky-300)/0.2)]'>
                            {steps[currentStep].icon}
                        </div>

                        <div className='relative h-48 w-full mb-8'>
                            <Image
                                src={steps[currentStep].image}
                                alt={steps[currentStep].title}
                                fill
                                className='object-contain'
                            />
                        </div>

                        <h2 className='text-2xl font-bold tracking-tight mb-3'>
                            {steps[currentStep].title}
                        </h2>

                        <p className='text-[hsl(var(--gray-300)/0.8)] text-sm leading-relaxed mb-8 min-h-[60px]'>
                            {steps[currentStep].description}
                        </p>

                        <div className='flex w-full items-center justify-between gap-4'>
                            <button
                                onClick={prevStep}
                                disabled={currentStep === 0}
                                className='flex items-center gap-2 px-4 py-2 text-sm font-medium text-[hsl(var(--gray-300)/0.6)] hover:text-foreground disabled:opacity-0 transition-opacity'
                            >
                                <ChevronLeft size={18} />
                                Back
                            </button>

                            <div className='flex gap-1.5'>
                                {steps.map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-[hsl(var(--sky-300))]' : 'w-1.5 bg-[hsl(var(--gray-300)/0.2)]'
                                            }`}
                                    />
                                ))}
                            </div>

                            <button
                                onClick={nextStep}
                                className='flex items-center gap-2 rounded-none bg-[hsl(var(--sky-300)/0.2)] border border-[hsl(var(--sky-300)/0.4)] px-6 py-2 text-sm font-semibold text-[hsl(var(--sky-300))] hover:bg-[hsl(var(--sky-300)/0.3)] transition-colors'
                            >
                                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                                {currentStep !== steps.length - 1 && <ChevronRight size={18} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
