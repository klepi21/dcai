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
  tokenIdentifier: string;
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

