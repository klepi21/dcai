import { LLMAnalysisResponse } from '../types';

// Rate limiting: max 3 requests per 5 minutes per user
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 3;

interface RateLimitEntry {
  timestamps: number[];
}

function checkRateLimit(): void {
  if (typeof window === 'undefined') return; // Server-side, allow
  
  const storageKey = 'hodloth_llm_rate_limit';
  const now = Date.now();
  
  try {
    const stored = localStorage.getItem(storageKey);
    let rateLimit: RateLimitEntry = stored ? JSON.parse(stored) : { timestamps: [] };
    
    // Remove timestamps outside the window
    rateLimit.timestamps = rateLimit.timestamps.filter(
      (ts: number) => now - ts < RATE_LIMIT_WINDOW
    );
    
    // Check if limit exceeded
    if (rateLimit.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      const oldestRequest = rateLimit.timestamps[0];
      const timeUntilNext = RATE_LIMIT_WINDOW - (now - oldestRequest);
      const minutesLeft = Math.ceil(timeUntilNext / 60000);
      const resetTime = new Date(now + timeUntilNext);
      const resetTimeStr = resetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const minutesText = minutesLeft === 1 ? 'minute' : 'minutes';
      const message = `🦥 HODLOTH needs a coffee break! You've used all ${MAX_REQUESTS_PER_WINDOW} analysis requests. 

Why the limit? HODLOTH's AI brain runs on premium compute (and coffee ☕), so we limit usage to keep costs sustainable and ensure quality analysis for everyone.

⏰ Your limit resets in ${minutesLeft} ${minutesText} (at ${resetTimeStr}). Time to grab a snack and come back refreshed! 🍪`;
      
      throw new Error(message);
    }
    
    // Add current request
    rateLimit.timestamps.push(now);
    localStorage.setItem(storageKey, JSON.stringify(rateLimit));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      throw error;
    }
    // If localStorage fails, allow the request (graceful degradation)
  }
}

interface StrategyInputs {
  token: string;
  usdcPerSwap: number;
  frequency: string;
  takeProfit: number;
  plannedDuration: number; // in days
}

interface MarketStatistics {
  totalLiquidity: number | null;
  totalVolume24h: number | null;
  price: number | null;
}

export async function analyzeStrategyWithHodloth(
  strategy: StrategyInputs,
  marketStats: MarketStatistics
): Promise<LLMAnalysisResponse> {
  // Check rate limit before making API call
  checkRateLimit();

  try {
    // Call our server-side API route to HODLOTH LLM
    const response = await fetch('/api/analyze-strategy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strategy,
        marketStats
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Check if there's a fallback response
      if (errorData.fallback) {
        return errorData.fallback;
      }
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const analysis = await response.json() as LLMAnalysisResponse;
    
    // Validate the response structure
    if (!analysis.risk_level || !Array.isArray(analysis.issues) || !Array.isArray(analysis.suggestions)) {
      throw new Error('Invalid response format from API');
    }

    // Ensure suggested_parameters exists
    if (!analysis.suggested_parameters) {
      analysis.suggested_parameters = {};
    }

    return analysis;
  } catch (error) {
    console.error('Error calling analyze-strategy API:', error);
    // Return a default response on error
    return {
      risk_level: 'MEDIUM',
      issues: ['Unable to analyze strategy at this time'],
      suggestions: ['Please review your strategy parameters manually'],
      expected_effect: 'Analysis unavailable'
    };
  }
}

