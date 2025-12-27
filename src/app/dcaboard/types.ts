export interface MultiversXToken {
  identifier: string;
  name: string;
  ticker: string;
  decimals: number;
  assets?: {
    pngUrl?: string;
    svgUrl?: string;
  };
}

export interface Swap {
  usdcAmount: string;
  dcaTokenAmount: string;
  timestampMillis: string;
}

export interface DcaStrategy {
  id: string;
  token: string;
  tokenIdentifier: string; // Strategy token identifier (e.g., DCAIHTM-cffd95-01)
  dcaTokenIdentifier?: string; // Actual DCA token identifier (e.g., HTM-abdfrg)
  tokenLogo?: string;
  frequency: string;
  amountPerDca: number;
  takeProfitPct?: number;
  isActive: boolean;
  availableUsdc: number;
  tokenBalance: number;
  lastExecutedTsMillis?: string;
  contractAddress: string;
  buys?: Swap[];
  sells?: Swap[];
}

export interface ActivityItem {
  type: 'deposit' | 'createStrategy' | 'modifyStrategy' | 'deleteStrategy';
  title: string;
  description: string;
  timestamp: number;
  icon: string;
}

export interface TokenMarketData {
  price: number | null;
  totalLiquidity: number | null;
  totalVolume24h: number | null;
}

export interface LLMAnalysisResponse {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  issues: string[];
  suggestions: string[];
  expected_effect: string;
  suggested_parameters?: {
    usdc_per_swap?: number | null;
    frequency?: string | null;
    take_profit?: number | null;
  };
}

