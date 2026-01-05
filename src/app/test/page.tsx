'use client';
import React, { useState } from 'react';
import { AuthRedirectWrapper } from '@/wrappers';
import AIChipVisualization from './components/AIChipVisualization';
import { ArrowRight, Zap, TrendingUp, Shield } from 'lucide-react';

export default function TestPage() {
    const [depositAmount, setDepositAmount] = useState('');
    const [isDeploying, setIsDeploying] = useState(false);

    const handleDeploy = () => {
        setIsDeploying(true);
        // Simulate deployment
        setTimeout(() => {
            setIsDeploying(false);
        }, 2000);
    };

    return (
        <AuthRedirectWrapper requireAuth={false}>
            <div className='min-h-screen w-full bg-black text-white flex items-center justify-center p-4 overflow-hidden relative'>
                {/* Subtle background gradient */}
                <div className='absolute inset-0 bg-gradient-radial from-amber-950/10 via-transparent to-transparent opacity-40' />

                {/* Main Content - Centered */}
                <div className='relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center justify-center space-y-12'>

                    {/* Hero Title */}
                    <div className='text-center space-y-4'>
                        <h1 className='text-5xl md:text-6xl font-light tracking-tight'>
                            Autonomous <span className='text-amber-400 font-medium'>EGLD</span> Compounding
                        </h1>
                        <p className='text-xl text-gray-400 max-w-2xl mx-auto'>
                            Deploy your xEGLD into an AI-managed strategy that automatically compounds your position through lending and staking.
                        </p>
                    </div>

                    {/* AI Chip Visualization */}
                    <div className='w-full'>
                        <AIChipVisualization />
                    </div>

                    {/* Strategy Stats */}
                    <div className='grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl'>
                        <div className='bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-sm border border-gray-800 rounded-xl p-6 text-center'>
                            <Zap className='w-8 h-8 text-amber-400 mx-auto mb-3' />
                            <div className='text-2xl font-bold text-amber-400'>2.5x</div>
                            <div className='text-sm text-gray-400 mt-1'>Leverage</div>
                        </div>
                        <div className='bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-sm border border-gray-800 rounded-xl p-6 text-center'>
                            <TrendingUp className='w-8 h-8 text-emerald-400 mx-auto mb-3' />
                            <div className='text-2xl font-bold text-emerald-400'>15-25%</div>
                            <div className='text-sm text-gray-400 mt-1'>Target APY</div>
                        </div>
                        <div className='bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-sm border border-gray-800 rounded-xl p-6 text-center'>
                            <Shield className='w-8 h-8 text-blue-400 mx-auto mb-3' />
                            <div className='text-2xl font-bold text-blue-400'>Auto</div>
                            <div className='text-sm text-gray-400 mt-1'>Rebalancing</div>
                        </div>
                    </div>

                    {/* Current Position Display */}
                    <div className='w-full max-w-md'>
                        <div className='bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-sm border border-gray-800 rounded-2xl p-6'>
                            <h3 className='text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider'>Your Position</h3>
                            <div className='space-y-3'>
                                <div className='flex justify-between items-center'>
                                    <span className='text-gray-400 text-sm'>Deposited</span>
                                    <span className='text-white font-semibold'>0.00 xEGLD</span>
                                </div>
                                <div className='flex justify-between items-center'>
                                    <span className='text-gray-400 text-sm'>Current Value</span>
                                    <span className='text-emerald-400 font-semibold'>$0.00</span>
                                </div>
                                <div className='flex justify-between items-center'>
                                    <span className='text-gray-400 text-sm'>Current APY</span>
                                    <span className='text-amber-400 font-semibold'>0.00%</span>
                                </div>
                                <div className='pt-3 border-t border-gray-800'>
                                    <div className='flex justify-between items-center'>
                                        <span className='text-gray-400 text-sm'>Total Profit</span>
                                        <span className='text-white font-bold'>$0.00</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Deposit Input & CTA */}
                    <div className='w-full max-w-md space-y-4'>
                        <div className='bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-sm border border-gray-800 rounded-2xl p-6 space-y-4'>
                            <label className='block'>
                                <span className='text-sm text-gray-400 mb-2 block'>Deposit Amount</span>
                                <div className='relative'>
                                    <input
                                        type='number'
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        placeholder='0.00'
                                        className='w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-4 text-2xl font-semibold text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none transition-colors'
                                    />
                                    <span className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium'>xEGLD</span>
                                </div>
                            </label>

                            <button
                                onClick={handleDeploy}
                                disabled={!depositAmount || isDeploying}
                                className='group w-full relative bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed rounded-xl py-4 font-semibold text-lg transition-all duration-300 shadow-lg shadow-amber-500/20 hover:shadow-amber-400/40 disabled:shadow-none'
                            >
                                <span className='relative z-10 flex items-center justify-center gap-2'>
                                    {isDeploying ? (
                                        <>
                                            <div className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                                            Deploying...
                                        </>
                                    ) : (
                                        <>
                                            Deploy Strategy
                                            <ArrowRight className='w-5 h-5 group-hover:translate-x-1 transition-transform' />
                                        </>
                                    )}
                                </span>
                                <div className='absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 opacity-0 group-hover:opacity-100 blur-xl transition-opacity -z-10' />
                            </button>
                        </div>

                        {/* How it Works - Compact */}
                        <div className='text-center text-sm text-gray-500'>
                            <details className='cursor-pointer'>
                                <summary className='hover:text-gray-400 transition-colors'>How does it work?</summary>
                                <div className='mt-4 text-left space-y-2 text-xs'>
                                    <p>• Your xEGLD is used as collateral in lending protocols</p>
                                    <p>• AI borrows stablecoins against your position</p>
                                    <p>• Borrowed funds buy more EGLD, which is staked</p>
                                    <p>• New xEGLD is re-supplied to compound the loop</p>
                                    <p>• Fully autonomous - no manual intervention needed</p>
                                </div>
                            </details>
                        </div>
                    </div>

                </div>
            </div>
        </AuthRedirectWrapper>
    );
}
