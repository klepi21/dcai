import { LLMAnalysisResponse } from '../types';

const GROK_API_KEY = process.env.NEXT_PUBLIC_GROK_API_KEY;
const GROK_API_BASE = 'https://api.x.ai/v1';
const GROK_MODEL = 'grok-3';

// Rate limiting: max 3 requests per 5 minutes per user
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 3;

interface RateLimitEntry {
  timestamps: number[];
}

function checkRateLimit(): void {
  if (typeof window === 'undefined') return; // Server-side, allow
  
  const storageKey = 'grok_llm_rate_limit';
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
      throw new Error(`Rate limit exceeded. Please wait ${minutesLeft} minute(s) before requesting another analysis.`);
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

export async function analyzeStrategyWithGrok(
  strategy: StrategyInputs,
  marketStats: MarketStatistics
): Promise<LLMAnalysisResponse> {
  // Check rate limit before making API call
  checkRateLimit();
  // Optimized prompt - reduced from ~400-500 tokens to ~200-250 tokens
  const priceStr = marketStats.price !== null ? marketStats.price.toFixed(6) : 'N/A';
  const liqStr = marketStats.totalLiquidity !== null ? marketStats.totalLiquidity.toFixed(0) : 'N/A';
  const volStr = marketStats.totalVolume24h !== null ? marketStats.totalVolume24h.toFixed(0) : 'N/A';
  
  const prompt = `Analyze DCA strategy. Token: ${strategy.token}, Swap: $${strategy.usdcPerSwap}, Freq: ${strategy.frequency}, TP: ${strategy.takeProfit}%, Duration: ${strategy.plannedDuration}d. Market: Price $${priceStr}, Liq $${liqStr}, Vol24h $${volStr}.

Tasks: Detect risks/inefficiencies, explain using stats, suggest param improvements (keep strategy type), classify risk (LOW/MEDIUM/HIGH), provide specific param values.

Output JSON only:
{"risk_level":"LOW|MEDIUM|HIGH","issues":["issue1"],"suggestions":["suggestion1"],"expected_effect":"brief effect","suggested_parameters":{"usdc_per_swap":50.0|null,"frequency":"daily"|null,"take_profit":10.0|null}}`;

  try {
    const response = await fetch(`${GROK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5, // Lower temperature for more focused responses
        max_tokens: 500 // Reduced from 1000 to save tokens
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from Grok API');
    }

    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const analysis = JSON.parse(jsonContent) as LLMAnalysisResponse;
    
    // Validate the response structure
    if (!analysis.risk_level || !Array.isArray(analysis.issues) || !Array.isArray(analysis.suggestions)) {
      throw new Error('Invalid response format from Grok API');
    }

    // Ensure suggested_parameters exists (even if null values)
    if (!analysis.suggested_parameters) {
      analysis.suggested_parameters = {};
    }

    return analysis;
  } catch (error) {
    console.error('Error calling Grok API:', error);
    // Return a default response on error
    return {
      risk_level: 'MEDIUM',
      issues: ['Unable to analyze strategy at this time'],
      suggestions: ['Please review your strategy parameters manually'],
      expected_effect: 'Analysis unavailable'
    };
  }
}

