import { NextRequest, NextResponse } from 'next/server';
import { LLMAnalysisResponse } from '@/app/dcaboard/types';

const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_API_BASE = 'https://api.x.ai/v1';
const GROK_MODEL = 'grok-3';

interface StrategyInputs {
  token: string;
  usdcPerSwap: number;
  frequency: string;
  takeProfit: number;
  plannedDuration: number;
}

interface MarketStatistics {
  totalLiquidity: number | null;
  totalVolume24h: number | null;
  price: number | null;
}

export async function POST(request: NextRequest) {
  try {
    if (!GROK_API_KEY) {
      return NextResponse.json(
        { error: 'Grok API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { strategy, marketStats }: { strategy: StrategyInputs; marketStats: MarketStatistics } = body;

    // Optimized prompt - reduced from ~400-500 tokens to ~200-250 tokens
    const priceStr = marketStats.price !== null ? marketStats.price.toFixed(6) : 'N/A';
    const liqStr = marketStats.totalLiquidity !== null ? marketStats.totalLiquidity.toFixed(0) : 'N/A';
    const volStr = marketStats.totalVolume24h !== null ? marketStats.totalVolume24h.toFixed(0) : 'N/A';
    
    const prompt = `Analyze DCA strategy. Token: ${strategy.token}, Swap: $${strategy.usdcPerSwap}, Freq: ${strategy.frequency}, TP: ${strategy.takeProfit}%, Duration: ${strategy.plannedDuration}d. Market: Price $${priceStr}, Liq $${liqStr}, Vol24h $${volStr}.

Tasks: Detect risks/inefficiencies, explain using stats, suggest param improvements (keep strategy type), classify risk (LOW/MEDIUM/HIGH), provide specific param values.

Output JSON only:
{"risk_level":"LOW|MEDIUM|HIGH","issues":["issue1"],"suggestions":["suggestion1"],"expected_effect":"brief effect","suggested_parameters":{"usdc_per_swap":50.0|null,"frequency":"daily"|null,"take_profit":10.0|null}}`;

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
        temperature: 0.5,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Grok API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return NextResponse.json(
        { error: 'No response from Grok API' },
        { status: 500 }
      );
    }

    // Try to extract JSON from the response (handle markdown code blocks)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const analysis = JSON.parse(jsonContent) as LLMAnalysisResponse;
    
    // Validate the response structure
    if (!analysis.risk_level || !Array.isArray(analysis.issues) || !Array.isArray(analysis.suggestions)) {
      return NextResponse.json(
        { error: 'Invalid response format from Grok API' },
        { status: 500 }
      );
    }

    // Ensure suggested_parameters exists
    if (!analysis.suggested_parameters) {
      analysis.suggested_parameters = {};
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Error in analyze-strategy API route:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to analyze strategy',
        fallback: {
          risk_level: 'MEDIUM',
          issues: ['Unable to analyze strategy at this time'],
          suggestions: ['Please review your strategy parameters manually'],
          expected_effect: 'Analysis unavailable'
        }
      },
      { status: 500 }
    );
  }
}

