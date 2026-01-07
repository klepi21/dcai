'use client';
import { useState, useEffect } from 'react';
import { LLMAnalysisResponse, TokenMarketData } from '../../types';
import { analyzeStrategyWithHodloth } from '../../utils/hodlothLLM';

interface StrategyAnalysisModalProps {
  isOpen: boolean;
  token: string;
  usdcPerSwap: number;
  frequency: string;
  takeProfit: number;
  marketData: TokenMarketData | null;
  onClose: () => void;
  onCreateStrategy: () => void;
  onModifyStrategy: (suggestions: string[], suggestedParams?: { usdc_per_swap?: number | null; frequency?: string | null; take_profit?: number | null }) => void;
}

export function StrategyAnalysisModal({
  isOpen,
  token,
  usdcPerSwap,
  frequency,
  takeProfit,
  marketData,
  onClose,
  onCreateStrategy,
  onModifyStrategy
}: StrategyAnalysisModalProps) {
  const [analysis, setAnalysis] = useState<LLMAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingSteps = [
    "Scanning liquidity depth...",
    "Analyzing historical volatility...",
    "Simulating price impact...",
    "Checking support levels...",
    "Calculating risk metrics...",
    "Formulating optimization details..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
      }, 800);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (isOpen && !analysis && !loading) {
      setLoading(true);
      setError(null);
      setLoadingStep(0);

      const plannedDuration = 180;
      const tokenTicker = token.split('-')[0] || token;

      analyzeStrategyWithHodloth(
        {
          token: tokenTicker,
          usdcPerSwap,
          frequency,
          takeProfit,
          plannedDuration
        },
        marketData || { price: null, totalLiquidity: null, totalVolume24h: null }
      )
        .then((result) => {
          setAnalysis(result);
          setLoading(false);
        })
        .catch((err) => {
          const errorMessage = err.message || 'Failed to analyze strategy';
          setError(errorMessage);
          setLoading(false);
        });
    }
  }, [isOpen, analysis, loading, token, usdcPerSwap, frequency, takeProfit, marketData]);

  const handleClose = () => {
    setAnalysis(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'MEDIUM':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'HIGH':
        return 'text-rose-500 border-rose-500/30 bg-rose-500/10';
      default:
        return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'Safe / Conservative';
      case 'MEDIUM': return 'Moderate Risk';
      case 'HIGH': return 'High Risk / Degen';
      default: return 'Unknown';
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm'
      onClick={handleClose}
    >
      <div
        className='bg-[#0a0a0a] border border-[hsl(var(--sky-300)/0.3)] rounded-lg shadow-[0_0_50px_-12px_rgba(14,165,233,0.25)] max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden relative'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className='p-5 border-b border-[hsl(var(--sky-300)/0.2)] bg-[hsl(var(--sky-300)/0.05)] flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='w-2 h-2 rounded-full bg-[hsl(var(--sky-300))] shadow-[0_0_10px_hsl(var(--sky-300))] animate-pulse'></div>
            <h3 className='text-lg font-bold tracking-wide text-[hsl(var(--sky-300))] font-mono uppercase'>Hodloth AI Insight</h3>
          </div>
          <button
            type='button'
            onClick={handleClose}
            className='text-[hsl(var(--gray-300)/0.5)] hover:text-[hsl(var(--sky-300))] transition-colors text-2xl leading-none'
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className='overflow-y-auto flex-1 p-0 relative min-h-[400px]'>

          {/* Background Grid Effect */}
          <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
          </div>

          {loading && (
            <div className='flex flex-col items-center justify-center h-full py-12 relative z-10'>
              <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-[hsl(var(--sky-300)/0.1)] border-t-[hsl(var(--sky-300))] animate-spin"></div>
                <div className="absolute inset-4 rounded-full border-2 border-[hsl(var(--sky-300)/0.1)] border-b-[hsl(var(--sky-300)/0.4)] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
                <video
                  autoPlay
                  loop
                  muted
                  className='w-full h-full object-cover opacity-80 mix-blend-screen'
                >
                  <source src='/assets/img/BlackSpinn.webm' type='video/webm' />
                </video>
              </div>

              <div className="h-8 flex items-center justify-center overflow-hidden">
                <p key={loadingStep} className='text-sm text-[hsl(var(--sky-300))] font-mono animate-in fade-in slide-in-from-bottom-4 duration-300'>
                  {`> ${loadingSteps[loadingStep]}`}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className='flex flex-col items-center justify-center h-full p-8 text-center relative z-10'>
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20 text-red-500 text-3xl">!</div>
              <h4 className="text-lg font-bold text-red-400 mb-2">Analysis Failed</h4>
              <p className='text-sm text-[hsl(var(--gray-300)/0.7)] mb-8 max-w-sm'>{error}</p>
              {!error.includes('HODLOTH needs a coffee break') && (
                <button
                  type='button'
                  onClick={onCreateStrategy}
                  className='px-6 py-2.5 bg-[#2a2a2a] hover:bg-[#333] text-white text-sm font-medium border border-[hsl(var(--gray-300)/0.2)] transition-all'
                >
                  Create Strategy Without Analysis
                </button>
              )}
            </div>
          )}

          {analysis && !loading && (
            <div className='flex flex-col gap-6 p-6 relative z-10 animate-in fade-in duration-500'>

              {/* Scorecard Header */}
              <div className={`flex items-center justify-between p-4 rounded-xl border ${getRiskColor(analysis.risk_level)}`}>
                <div>
                  <span className="text-xs font-bold uppercase opacity-70 mb-1 block">Risk Assessment</span>
                  <span className="text-2xl font-black">{analysis.risk_level}</span>
                  <span className="ml-3 text-sm font-medium opacity-80">— {getRiskLabel(analysis.risk_level)}</span>
                </div>
                <div className="text-4xl opacity-20">🛡️</div>
              </div>

              {/* Suggestions / Issues Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Issues */}
                <div className="bg-[hsl(var(--background)/0.5)] border border-[hsl(var(--gray-300)/0.1)] p-4 rounded-lg">
                  <h4 className="text-sm font-bold text-[hsl(var(--gray-300)/0.9)] flex items-center gap-2 mb-3">
                    <span className="text-amber-500">⚠</span> Potential Issues
                  </h4>
                  {analysis.issues.length > 0 ? (
                    <ul className="space-y-2">
                      {analysis.issues.map((issue, i) => (
                        <li key={i} className="text-xs leading-relaxed text-[hsl(var(--gray-300)/0.7)] pl-3 border-l-2 border-amber-500/20">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[hsl(var(--gray-300)/0.5)] italic">No major issues detected.</p>
                  )}
                </div>

                {/* Suggestions */}
                <div className="bg-[hsl(var(--sky-300)/0.05)] border border-[hsl(var(--sky-300)/0.2)] p-4 rounded-lg">
                  <h4 className="text-sm font-bold text-[hsl(var(--sky-300))] flex items-center gap-2 mb-3">
                    <span>✨</span> Optimization Suggestions
                  </h4>
                  {analysis.suggestions.length > 0 ? (
                    <ul className="space-y-2">
                      {analysis.suggestions.map((sugg, i) => (
                        <li key={i} className="text-xs leading-relaxed text-[hsl(var(--sky-300)/0.9)] pl-3 border-l-2 border-[hsl(var(--sky-300)/0.3)]">
                          {sugg}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-[hsl(var(--gray-300)/0.5)] italic">Strategy looks optimized.</p>
                  )}
                </div>
              </div>

              {/* Expected Effect */}
              {analysis.expected_effect && (
                <div className="bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.15)] p-4 rounded-lg">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--gray-300)/0.5)] mb-2">Projected Outcome</h4>
                  <p className="text-sm text-[hsl(var(--gray-300)/0.9)] leading-relaxed">
                    {analysis.expected_effect}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {analysis && !loading && (
          <div className='p-5 border-t border-[hsl(var(--gray-300)/0.1)] bg-[hsl(var(--background))] flex flex-col-reverse sm:flex-row gap-3 justify-end items-center relative z-20'>

            <div className="flex-1 text-xs text-[hsl(var(--gray-300)/0.4)] text-center sm:text-left hidden sm:block">
              AI analysis is based on historical data & current market conditions.
            </div>

            <button
              type='button'
              onClick={onCreateStrategy}
              className='w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-[hsl(var(--gray-300)/0.7)] hover:text-white transition-colors'
            >
              Ignore & Create
            </button>

            <button
              type='button'
              onClick={() => onModifyStrategy(analysis.suggestions, analysis.suggested_parameters)}
              className='w-full sm:w-auto relative group overflow-hidden px-8 py-2.5 bg-[hsl(var(--sky-300))] text-white text-sm font-bold shadow-[0_0_20px_hsl(var(--sky-300)/0.3)] hover:shadow-[0_0_30px_hsl(var(--sky-300)/0.5)] transition-all'
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span>Apply Optimization</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 group-hover:translate-x-1 transition-transform"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

