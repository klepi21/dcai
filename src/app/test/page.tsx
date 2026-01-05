'use client';
import React, { useState } from 'react';
import { AuthRedirectWrapper } from '@/wrappers';
import AIChipVisualization from './components/AIChipVisualization';
import { X } from 'lucide-react';

export default function TestPage() {
    const [depositAmount, setDepositAmount] = useState('1000');
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <AuthRedirectWrapper requireAuth={false}>
            <div className='min-h-screen w-full bg-black text-white relative overflow-hidden'>
                {/* Header */}
                <header className='absolute top-0 left-0 right-0 z-50 p-6 flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        <div className='text-2xl font-bold tracking-wider'>XOXNO</div>
                    </div>
                    <button className='px-6 py-2 bg-gradient-to-r from-amber-600 to-amber-700 rounded-full text-sm font-semibold hover:from-amber-500 hover:to-amber-600 transition-all'>
                        DeFi
                    </button>
                </header>

                {/* Main Content */}
                <div className='relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-24'>
                    {/* Amount Display */}
                    <div className='text-center mb-12'>
                        <div className='inline-block px-4 py-1 bg-amber-900/30 border border-amber-700/50 rounded-full text-xs text-amber-400 mb-4'>
                            DeFi
                        </div>
                        <div className='text-6xl font-bold text-emerald-400 mb-2'>
                            ${depositAmount}
                        </div>
                        <div className='text-gray-500 text-sm'>in $XOXNO</div>
                    </div>

                    {/* Description */}
                    <div className='max-w-3xl text-center mb-16'>
                        <h1 className='text-3xl md:text-4xl font-light text-gray-300 mb-6 leading-relaxed'>
                            Leverage XOXNO's lending infrastructure to create autonomous onchain strategies
                            that compound EGLD exposure.
                        </h1>
                    </div>

                    {/* AI Chip Visualization */}
                    <div className='w-full max-w-5xl mb-16'>
                        <AIChipVisualization />
                    </div>

                    {/* Strategy Details */}
                    <div className='max-w-2xl w-full space-y-8 mb-12'>
                        <div>
                            <h2 className='text-xl font-semibold text-gray-300 mb-4'>Objective</h2>
                            <p className='text-gray-400 leading-relaxed'>
                                Build an autonomous compounding strategy using XOXNO's xLend as the lending core.
                            </p>
                        </div>

                        <div>
                            <h2 className='text-xl font-semibold text-gray-300 mb-4'>Key Requirements</h2>
                            <ul className='space-y-3 text-gray-400'>
                                <li className='flex items-start gap-3'>
                                    <span className='text-emerald-400 mt-1'>•</span>
                                    <span>Accept xEGLD deposits from users</span>
                                </li>
                                <li className='flex items-start gap-3'>
                                    <span className='text-emerald-400 mt-1'>•</span>
                                    <span>Issue a meta ESDT representing each user's proportional share</span>
                                </li>
                                <li className='flex items-start gap-3'>
                                    <span className='text-emerald-400 mt-1'>•</span>
                                    <span>Aggregate deposits into a single onchain position</span>
                                </li>
                                <li className='flex items-start gap-3'>
                                    <span className='text-emerald-400 mt-1'>•</span>
                                    <span>Use the position as collateral in xLend</span>
                                </li>
                                <li className='flex items-start gap-3'>
                                    <span className='text-emerald-400 mt-1'>•</span>
                                    <span>Borrow stablecoins (e.g. USDC) against the collateral</span>
                                </li>
                                <li className='flex items-start gap-3'>
                                    <span className='text-emerald-400 mt-1'>•</span>
                                    <span>Use borrowed funds to buy EGLD</span>
                                </li>
                                <li className='flex items-start gap-3'>
                                    <span className='text-emerald-400 mt-1'>•</span>
                                    <span>Stake EGLD back into xEGLD</span>
                                </li>
                                <li className='flex items-start gap-3'>
                                    <span className='text-emerald-400 mt-1'>•</span>
                                    <span>Re-supply xEGLD to compound the position</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className='group relative px-12 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full text-lg font-semibold hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/50 hover:shadow-emerald-400/60'
                    >
                        <span className='relative z-10'>Deploy Strategy</span>
                        <div className='absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-0 group-hover:opacity-100 blur-xl transition-opacity' />
                    </button>
                </div>

                {/* Deployment Modal */}
                {isModalOpen && (
                    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm'>
                        <div className='relative w-full max-w-md bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-2xl p-8 shadow-2xl'>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className='absolute top-4 right-4 text-gray-400 hover:text-white transition-colors'
                            >
                                <X size={24} />
                            </button>

                            <h2 className='text-2xl font-bold mb-6 text-center'>Deploy Your Strategy</h2>

                            <div className='space-y-6'>
                                <div>
                                    <label className='block text-sm text-gray-400 mb-2'>Deposit Amount (xEGLD)</label>
                                    <input
                                        type='number'
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        className='w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none transition-colors'
                                        placeholder='1000'
                                    />
                                </div>

                                <div className='bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-2'>
                                    <div className='flex justify-between text-sm'>
                                        <span className='text-gray-400'>Target APY</span>
                                        <span className='text-emerald-400 font-semibold'>~15-25%</span>
                                    </div>
                                    <div className='flex justify-between text-sm'>
                                        <span className='text-gray-400'>Leverage</span>
                                        <span className='text-white font-semibold'>2.5x</span>
                                    </div>
                                    <div className='flex justify-between text-sm'>
                                        <span className='text-gray-400'>Risk Level</span>
                                        <span className='text-amber-400 font-semibold'>Moderate</span>
                                    </div>
                                </div>

                                <button className='w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg text-lg font-semibold hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/30'>
                                    Confirm & Deploy
                                </button>

                                <p className='text-xs text-gray-500 text-center'>
                                    By deploying, you agree to the autonomous strategy execution and associated risks.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Background Gradient */}
                <div className='absolute inset-0 bg-gradient-radial from-emerald-900/10 via-transparent to-transparent pointer-events-none' />
            </div>
        </AuthRedirectWrapper>
    );
}
