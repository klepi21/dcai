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
}

export interface ActivityItem {
  type: 'deposit' | 'createStrategy' | 'modifyStrategy' | 'deleteStrategy';
  title: string;
  description: string;
  timestamp: number;
  icon: string;
}

