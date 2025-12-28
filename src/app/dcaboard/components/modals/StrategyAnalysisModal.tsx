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

  useEffect(() => {
    if (isOpen && !analysis && !loading) {
      setLoading(true);
      setError(null);
      
      // Calculate planned duration based on frequency (default 180 days)
      const plannedDuration = 180;
      
      // Extract token ticker from identifier (e.g., "HTM-abdfrg" -> "HTM")
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
          // Handle rate limit errors specifically
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
        return 'text-green-500';
      case 'MEDIUM':
        return 'text-yellow-500';
      case 'HIGH':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
      onClick={handleClose}
    >
      <div
        className='bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.2)] rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='p-4 border-b border-[hsl(var(--gray-300)/0.2)]'>
          <div className='flex items-center justify-between'>
            <h3 className='text-lg font-semibold'>Strategy Analysis</h3>
            <button
              type='button'
              onClick={handleClose}
              className='text-[hsl(var(--gray-300)/0.7)] hover:text-foreground transition-colors'
            >
              ×
            </button>
          </div>
        </div>

        <div className='overflow-y-auto flex-1 p-4'>
          {loading && (
            <div className='flex flex-col items-center justify-center py-12'>
              <video
                autoPlay
                loop
                muted
                className='w-48 h-48 mb-4'
              >
                <source src='/assets/img/BlackSpinn.webm' type='video/webm' />
              </video>
              <p className='text-sm text-[hsl(var(--gray-300)/0.8)]'>
                Analyzing your strategy...
              </p>
            </div>
          )}

          {error && (
            <div className='py-8 text-center'>
              <p className='text-sm text-red-500 mb-4 whitespace-pre-line text-left'>{error}</p>
              {!error.includes('HODLOTH needs a coffee break') && (
                <button
                  type='button'
                  onClick={onCreateStrategy}
                  className='inline-flex items-center justify-center bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700'
                >
                  Create Strategy Anyway
                </button>
              )}
            </div>
          )}

          {analysis && !loading && (
            <div className='flex flex-col gap-4'>
              {/* Risk Level */}
              <div className='p-4 border border-[hsl(var(--gray-300)/0.2)] rounded bg-[hsl(var(--gray-300)/0.02)]'>
                <div className='flex items-center gap-2 mb-2'>
                  <span className='text-sm font-medium text-[hsl(var(--gray-300)/0.8)]'>
                    Risk Level:
                  </span>
                  <span className={`text-lg font-bold ${getRiskColor(analysis.risk_level)}`}>
                    {analysis.risk_level}
                  </span>
                </div>
              </div>

              {/* Issues */}
              {analysis.issues.length > 0 && (
                <div>
                  <h4 className='text-sm font-semibold mb-2 text-[hsl(var(--gray-300)/0.9)]'>
                    Detected Issues:
                  </h4>
                  <ul className='list-disc list-inside space-y-1 text-sm text-[hsl(var(--gray-300)/0.8)]'>
                    {analysis.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggestions */}
              {analysis.suggestions.length > 0 && (
                <div>
                  <h4 className='text-sm font-semibold mb-2 text-[hsl(var(--gray-300)/0.9)]'>
                    Suggestions:
                  </h4>
                  <ul className='list-disc list-inside space-y-1 text-sm text-[hsl(var(--gray-300)/0.8)]'>
                    {analysis.suggestions.map((suggestion, idx) => (
                      <li key={idx}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Expected Effect */}
              {analysis.expected_effect && (
                <div>
                  <h4 className='text-sm font-semibold mb-2 text-[hsl(var(--gray-300)/0.9)]'>
                    Expected Effect:
                  </h4>
                  <p className='text-sm text-[hsl(var(--gray-300)/0.8)]'>
                    {analysis.expected_effect}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {analysis && !loading && (
          <div className='p-4 border-t border-[hsl(var(--gray-300)/0.2)] flex gap-3 justify-end'>
            <button
              type='button'
              onClick={handleClose}
              className='inline-flex items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)]'
            >
              Cancel
            </button>
            <button
              type='button'
              onClick={() => onModifyStrategy(analysis.suggestions, analysis.suggested_parameters)}
              className='inline-flex items-center justify-center border border-[hsl(var(--sky-300)/0.5)] bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium text-[hsl(var(--sky-300))] transition-colors hover:bg-[hsl(var(--sky-300)/0.1)]'
            >
              Modify Strategy
            </button>
            <button
              type='button'
              onClick={onCreateStrategy}
              className='inline-flex items-center justify-center bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700'
            >
              Create Strategy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

