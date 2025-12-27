'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useDcaContract, useCreateStrategy, useDeposit, useWithdraw, useDeleteStrategy, useModifyStrategy } from '@/hooks';
import { useGetAccount, useGetNetworkConfig, getActiveTransactionsStatus } from '@/lib';
import { MultiversXToken, DcaStrategy, ActivityItem, TokenMarketData } from './types';
import { PortfolioHeader } from './components/PortfolioHeader';
import { CreateStrategyForm } from './components/CreateStrategyForm';
import { ActiveStrategiesList } from './components/ActiveStrategiesList';
import { ActivityFeed } from './components/ActivityFeed';
import { DepositModal } from './components/modals/DepositModal';
import { WithdrawModal } from './components/modals/WithdrawModal';
import { DeleteModal } from './components/modals/DeleteModal';
import { ModifyStrategyModal } from './components/modals/ModifyStrategyModal';
import { StrategyAnalysisModal } from './components/modals/StrategyAnalysisModal';
import { getNetworkPath, getApiUrl } from './utils/network';

export default function DCABoard() {
  const { setup, setups, loading: loadingSetup, error: setupError, queryGetStrategyTokenAttributes } = useDcaContract();
  const { address } = useGetAccount();
  const { network } = useGetNetworkConfig();
  const { createStrategy } = useCreateStrategy();
  const { deposit } = useDeposit();
  const { withdraw } = useWithdraw();
  const { deleteStrategy } = useDeleteStrategy();
  const { modifyStrategy } = useModifyStrategy();
  const [isCreatingStrategy, setIsCreatingStrategy] = useState(false);
  const [strategies, setStrategies] = useState<DcaStrategy[]>([]);
  const [tokens, setTokens] = useState<MultiversXToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number>>({});
  const [tokenMarketData, setTokenMarketData] = useState<Record<string, TokenMarketData>>({});
  const [token, setToken] = useState<string>('');
  const [frequency, setFrequency] = useState<string>('');
  const [amountPerDca, setAmountPerDca] = useState<string>('');
  const [showTakeProfit, setShowTakeProfit] = useState<boolean>(false);
  const [takeProfitPct, setTakeProfitPct] = useState<string>('15');
  // State for expandable strategy groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [strategyIndices, setStrategyIndices] = useState<Record<string, number>>({});
  // State for deposit modal
  const [depositModal, setDepositModal] = useState<{ isOpen: boolean; strategyId: string | null; amount: string }>({
    isOpen: false,
    strategyId: null,
    amount: ''
  });
  // State for withdraw modal
  const [withdrawModal, setWithdrawModal] = useState<{ isOpen: boolean; strategyId: string | null; asset: 'usdc' | 'token' | null; amount: string }>({
    isOpen: false,
    strategyId: null,
    asset: null,
    amount: ''
  });
  // State for modify strategy modal
  const [modifyModal, setModifyModal] = useState<{ 
    isOpen: boolean; 
    strategyId: string | null; 
    amountPerDca: string; 
    frequency: string; 
    takeProfitPct: string;
    showTakeProfit: boolean;
  }>({
    isOpen: false,
    strategyId: null,
    amountPerDca: '',
    frequency: '',
    takeProfitPct: '',
    showTakeProfit: false
  });
  // State for delete confirmation modal
  const [deleteModal, setDeleteModal] = useState<{ 
    isOpen: boolean; 
    strategyId: string | null;
  }>({
    isOpen: false,
    strategyId: null
  });
  // State for strategy analysis modal
  const [analysisModal, setAnalysisModal] = useState<{
    isOpen: boolean;
    token: string;
    usdcPerSwap: number;
    frequency: string;
    takeProfit: number;
  }>({
    isOpen: false,
    token: '',
    usdcPerSwap: 0,
    frequency: '',
    takeProfit: 0
  });
  // State for user's USDC wallet balance
  const [usdcWalletBalance, setUsdcWalletBalance] = useState<number>(0);
  // State for activity items
  const [activities, setActivities] = useState<Array<{
    type: 'deposit' | 'createStrategy' | 'modifyStrategy' | 'deleteStrategy';
    title: string;
    description: string;
    timestamp: number;
    icon: string;
  }>>([]);
  // State for activity pagination
  const [currentActivityPage, setCurrentActivityPage] = useState<number>(1);
  const itemsPerPage = 6;
  
  // Ref to track if component is mounted
  const isMountedRef = useRef(true);
  
  // Auto-expand first group when strategies change
  useEffect(() => {
    if (strategies.length > 0 && expandedGroups.size === 0) {
      // Group strategies by token to find the first token
      const groupedStrategies = strategies.reduce((acc, strategy) => {
        const token = strategy.token;
        if (!acc[token]) {
          acc[token] = [];
        }
        acc[token].push(strategy);
        return acc;
      }, {} as Record<string, typeof strategies>);
      
      const firstToken = Object.keys(groupedStrategies)[0];
      if (firstToken) {
        setExpandedGroups(new Set([firstToken]));
        setStrategyIndices({ [firstToken]: 0 });
      }
    }
  }, [strategies]);


  // Fetch user's Meta ESDT tokens starting with "DCAI"
  // This function is extracted so it can be called manually after transactions
  const fetchUserDcaiTokens = async () => {
    if (!address) {
      if (isMountedRef.current) {
        setStrategies([]);
      }
      return;
    }

    try {
      // Determine API URL based on network
      const apiUrl = getApiUrl(network);

      // ONE API call to get all Meta ESDT tokens
      const tokensUrl = `${apiUrl}/accounts/${address}/tokens?includeMetaESDT=true`;
      
      const response = await fetch(tokensUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tokens: ${response.status} - ${response.statusText}`);
      }

      const tokensData = await response.json();
      
      // Filter tokens that start with "DCAI"
      const dcaiTokens = tokensData.filter((token: any) => {
        const identifier = token.identifier || token.tokenIdentifier || '';
        return identifier.startsWith('DCAI');
      });

      // Fetch strategy attributes for each DCAI token with 0.35s delay between calls
      const strategiesData: DcaStrategy[] = [];
      
      for (let i = 0; i < dcaiTokens.length; i++) {
        if (!isMountedRef.current) break; // Stop if component unmounted
        
        try {
          const dcaiToken = dcaiTokens[i];
          // Extract nonce from token - use the nonce field directly (it's already in decimal)
          // or fallback to parsing from identifier if nonce field is not available
          const identifier = dcaiToken.identifier || dcaiToken.tokenIdentifier || '';
          let nonce: number;
          
          if (dcaiToken.nonce !== undefined && dcaiToken.nonce !== null) {
            // Use the nonce field directly (already in decimal format)
            nonce = typeof dcaiToken.nonce === 'string' ? parseInt(dcaiToken.nonce, 10) : dcaiToken.nonce;
          } else {
            // Fallback: Extract nonce from token identifier (format: "COLLECTION-NONCE" where NONCE is hex)
            // e.g., "DCAIWEGLD-5b41d1-01" -> nonce is 1 (from "01")
            const nonceHex = identifier.split('-').pop() || '';
            try {
              // Parse hex nonce to decimal (e.g., "01" -> 1, "0a" -> 10)
              nonce = parseInt(nonceHex, 16);
            } catch (error) {
              continue; // Skip this token if we can't parse nonce
            }
          }
          
          if (isNaN(nonce) || nonce === 0) {
            continue; // Skip nonce 0 (invalid strategy token)
          }

          // Get the owner address (this is the contract address for this strategy)
          const contractAddress = dcaiToken.owner;
          if (!contractAddress) {
            continue; // Skip if no owner address
          }

          // Add delay between calls (0.35 seconds) except for the first one
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 350));
          }

          if (!isMountedRef.current) break; // Check again after delay

          // Extract token info before calling queryGetStrategyTokenAttributes
          const collection = dcaiToken.collection || '';
          const tokenTicker = collection.split('-')[0]?.replace('DCAI', '') || identifier.split('-')[0]?.replace('DCAI', '') || 'UNKNOWN';
          
          // Use the owner address as the contract address for this strategy
          const attributes = await queryGetStrategyTokenAttributes(nonce, contractAddress, {
            identifier,
            collection,
            ticker: tokenTicker,
            decimals: dcaiToken.decimals
          });
          
          if (!isMountedRef.current) break; // Check after async call
          
          if (attributes) {
          // Get network path for token images
          const networkPathForImages = getNetworkPath(network);
          
          // Find the setup that matches this token ticker to get the correct dcaToken for the image
          const matchingSetup = setups?.find(s => {
            const setupTicker = s.dcaToken.split('-')[0];
            return setupTicker === tokenTicker;
          });
          
          // Try to find the token in the tokens array (which has full identifiers with hash)
          const tokenFromList = tokens.find(t => {
            const tTicker = t.ticker || t.identifier?.split('-')[0];
            return tTicker === tokenTicker;
          });
          
          // Special case for WEGLD - use the correct identifier
          let iconIdentifier: string;
          if (tokenTicker === 'WEGLD') {
            iconIdentifier = 'WEGLD-bd4d79';
          } else {
            // Use dcaToken from matching setup, or token identifier from tokens list, or fallback to ticker
            iconIdentifier = matchingSetup?.dcaToken || tokenFromList?.identifier || (tokenTicker !== 'UNKNOWN' ? tokenTicker : collection);
          }
          
          // Convert USDC balance from smallest units (6 decimals) to readable format
          const usdcDecimals = 1000000; // 10^6
          const usdcBalance = parseFloat(attributes.usdcBalance) / usdcDecimals;
          
          // Convert token balance (assuming 18 decimals for wrapped tokens, but check token decimals)
          const tokenDecimals = dcaiToken.decimals || 18;
          const tokenDecimalsMultiplier = 10 ** tokenDecimals;
          const tokenBalance = parseFloat(attributes.tokenBalance) / tokenDecimalsMultiplier;
          
          // Convert amount per swap from smallest units to readable format
          const amountPerSwap = parseFloat(attributes.amountPerSwap) / usdcDecimals;
          
          // Parse take profit percentage (it's a u64, stored with 3 decimal places)
          // e.g., 20000 = 20%, so divide by 1000 to get percentage
          const takeProfitPct = parseFloat(attributes.takeProfitPercentage);
          const takeProfitPercentage = takeProfitPct > 0 ? takeProfitPct / 1000 : 0;
          
          // Convert last executed timestamp from milliseconds to human-readable format
          const lastExecutedTsMillis = attributes.lastExecutedTsMillis;
          
            const strategy: DcaStrategy = {
              id: `${identifier}-${nonce}`, // Use identifier-nonce as unique ID
              token: tokenTicker,
              tokenIdentifier: identifier, // Strategy token identifier (e.g., DCAIHTM-cffd95-01)
              dcaTokenIdentifier: matchingSetup?.dcaToken || tokenFromList?.identifier || iconIdentifier, // Actual DCA token identifier (e.g., HTM-abdfrg)
              tokenLogo: `https://tools.multiversx.com/assets-cdn/${networkPathForImages}/tokens/${iconIdentifier}/icon.png`,
              frequency: attributes.dcaFrequency || 'Unknown',
              amountPerDca: amountPerSwap,
              takeProfitPct: takeProfitPercentage > 0 ? takeProfitPercentage : undefined,
              isActive: true, // You might want to check if strategy is active based on some condition
              availableUsdc: usdcBalance,
              tokenBalance: tokenBalance,
              lastExecutedTsMillis: lastExecutedTsMillis,
              contractAddress: contractAddress, // Store the contract address for deposit/withdraw
              buys: attributes.buys || [],
              sells: attributes.sells || []
            };
            
            strategiesData.push(strategy);
          }
        } catch (error) {
          // If one strategy fails, continue with the next one
          // Don't let one error prevent other strategies from loading
          continue;
        }
      }
      
      if (isMountedRef.current) {
        setStrategies(strategiesData);
      }

    } catch (error) {
      if (isMountedRef.current) {
        setStrategies([]);
      }
    }
  };

  // Fetch activity transactions
  const fetchActivity = async () => {
    if (!address) {
      setActivities([]);
      return;
    }

    try {
      // Determine API URL based on network
      const apiUrl = getApiUrl(network);

      const functions = ['deposit', 'createStrategy', 'modifyStrategy', 'deleteStrategy'];
      const allActivities: Array<{
        type: 'deposit' | 'createStrategy' | 'modifyStrategy' | 'deleteStrategy';
        title: string;
        description: string;
        timestamp: number;
        icon: string;
      }> = [];

      // Fetch transactions for each function with 0.35 second delay
      for (let i = 0; i < functions.length; i++) {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 350));
        }

        if (!isMountedRef.current) break;

        const func = functions[i];
        const transfersUrl = `${apiUrl}/accounts/${address}/transfers?status=success&function=${func}`;

        try {
          const response = await fetch(transfersUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
          });

          if (!response.ok) {
            continue; // Skip this function if request fails
          }

          const transfers = await response.json();

          // Process each transfer
          for (const transfer of transfers) {
            if (!transfer.action?.arguments) continue;

            // Handle timestamp - could be in seconds or milliseconds
            let timestamp = transfer.timestampMs || transfer.timestamp || Date.now();
            // If timestamp is in seconds (less than year 2000 in ms), convert to milliseconds
            if (timestamp < 946684800000) {
              timestamp = timestamp * 1000;
            }
            const transfersList = transfer.action.arguments.transfers || [];
            
            let title = '';
            let description = '';
            let icon = '';

            if (func === 'deposit') {
              // Find USDC transfer
              const usdcTransfer = transfersList.find((t: any) => t.ticker === 'USDC' || t.token?.startsWith('USDC-'));
              const metaEsdtTransfer = transfersList.find((t: any) => t.type === 'MetaESDT');
              
              if (usdcTransfer) {
                const usdcAmount = parseFloat(usdcTransfer.value || '0') / 1000000; // USDC has 6 decimals
                const tokenName = metaEsdtTransfer?.name?.replace('DCAi', '') || metaEsdtTransfer?.ticker?.replace('DCAI', '') || 'token';
                title = 'Deposit received';
                description = `$${usdcAmount.toFixed(2)} USDC deposited to ${tokenName} strategy`;
                icon = '+';
              }
            } else if (func === 'createStrategy') {
              const metaEsdtTransfer = transfersList.find((t: any) => t.type === 'MetaESDT');
              if (metaEsdtTransfer) {
                const tokenName = metaEsdtTransfer.name?.replace('DCAi', '') || metaEsdtTransfer.ticker?.replace('DCAI', '') || 'token';
                title = 'Strategy created';
                description = `${tokenName} DCA strategy activated`;
                icon = '⚙';
              }
            } else if (func === 'modifyStrategy') {
              const metaEsdtTransfer = transfersList.find((t: any) => t.type === 'MetaESDT');
              if (metaEsdtTransfer) {
                const tokenName = metaEsdtTransfer.name?.replace('DCAi', '') || metaEsdtTransfer.ticker?.replace('DCAI', '') || 'token';
                title = 'Strategy modified';
                description = `${tokenName} DCA strategy updated`;
                icon = '⚙';
              }
            } else if (func === 'deleteStrategy') {
              const metaEsdtTransfer = transfersList.find((t: any) => t.type === 'MetaESDT');
              if (metaEsdtTransfer) {
                const tokenName = metaEsdtTransfer.name?.replace('DCAi', '') || metaEsdtTransfer.ticker?.replace('DCAI', '') || 'token';
                title = 'Strategy deleted';
                description = `${tokenName} DCA strategy removed`;
                icon = '×';
              }
            }

            if (title && description) {
              allActivities.push({
                type: func as 'deposit' | 'createStrategy' | 'modifyStrategy' | 'deleteStrategy',
                title,
                description,
                timestamp,
                icon
              });
            }
          }
        } catch (error) {
          // Continue with next function if this one fails
          continue;
        }
      }

      // Sort by timestamp (newest first)
      allActivities.sort((a, b) => b.timestamp - a.timestamp);

      if (isMountedRef.current) {
        setActivities(allActivities);
        // Reset to page 1 when activities change
        setCurrentActivityPage(1);
      }
    } catch (error) {
      if (isMountedRef.current) {
        setActivities([]);
      }
    }
  };

  // Fetch strategies when address, network, or setups change
  useEffect(() => {
    // Reset mounted ref when effect runs
    isMountedRef.current = true;
    fetchUserDcaiTokens();
    
    // Cleanup function - only set to false if component actually unmounts
    // Don't set to false on dependency changes, as that would prevent state updates
  }, [address, network.apiAddress, setups]); // Added setups to find matching dcaToken

  // Fetch activity AFTER strategies have been loaded
  useEffect(() => {
    // Only fetch activity if we have address, strategies are loaded (not loading), and setups are available
    if (address && !loadingSetup && setups && setups.length > 0 && strategies.length >= 0) {
      // Small delay to ensure all other data is loaded first
      const timeoutId = setTimeout(() => {
        fetchActivity();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [address, loadingSetup, setups, strategies.length]);
  
  // Reset mounted ref when component mounts
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Function to fetch prices for all tokens
  const fetchTokenPrices = async (tokensToFetch: MultiversXToken[]) => {
    if (tokensToFetch.length === 0) return;

    try {
      // Determine API URL based on network
      let apiUrl = 'https://devnet-api.multiversx.com';
      if (network.apiAddress) {
        if (network.apiAddress.includes('devnet')) {
          apiUrl = 'https://devnet-api.multiversx.com';
        } else if (network.apiAddress.includes('testnet')) {
          apiUrl = 'https://testnet-api.multiversx.com';
        } else {
          apiUrl = 'https://api.multiversx.com';
        }
      }

      // Fetch tokens from MultiversX API
      const response = await fetch(`${apiUrl}/tokens?size=300`);
      
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const apiTokens = Array.isArray(data) ? data : (data.data || []);
      
      // Create a map of token identifier to price
      const prices: Record<string, number> = {};
      const marketData: Record<string, TokenMarketData> = {};
      
      tokensToFetch.forEach(tokenToFetch => {
        const token = apiTokens.find((t: any) => 
          t.identifier === tokenToFetch.identifier ||
          t.identifier?.toLowerCase() === tokenToFetch.identifier?.toLowerCase()
        );
        
        if (token) {
          const priceValue = token.price || token.priceUsd || token.priceUSD;
          if (priceValue !== undefined && priceValue !== null) {
            const parsedPrice = parseFloat(priceValue);
            if (!isNaN(parsedPrice)) {
              prices[tokenToFetch.identifier] = parsedPrice;
            }
          }
          
          // Store market data
          const liquidity = token.totalLiquidity ? parseFloat(token.totalLiquidity) : null;
          const volume24h = token.totalVolume24h ? parseFloat(token.totalVolume24h) : null;
          marketData[tokenToFetch.identifier] = {
            price: prices[tokenToFetch.identifier] || null,
            totalLiquidity: liquidity && !isNaN(liquidity) ? liquidity : null,
            totalVolume24h: volume24h && !isNaN(volume24h) ? volume24h : null
          };
        }
      });
      
      setTokenPrices(prices);
      setTokenMarketData(marketData);
    } catch (error) {
      // Silently fail - prices are optional
    }
  };

  // Load tokens and setup from smart contract
  useEffect(() => {
    if (loadingSetup) {
      setLoadingTokens(true);
      return;
    }

    if (setupError) {
      setLoadingTokens(false);
      return;
    }

    if (setups && setups.length > 0) {
      try {
        setLoadingTokens(true);
        
        // Build token list from all DCA contracts
        // Each setup has a dcaToken (the token to DCA into)
        const contractTokens: MultiversXToken[] = [];
        const seenTokens = new Set<string>();
        
        // Add all unique dcaTokens from all setups
        const networkPath = getNetworkPath(network);
        setups.forEach((setupItem) => {
          const dcaTokenIdentifier = setupItem.dcaToken;
          if (dcaTokenIdentifier && !seenTokens.has(dcaTokenIdentifier)) {
            seenTokens.add(dcaTokenIdentifier);
            const tokenTicker = dcaTokenIdentifier.split('-')[0] || dcaTokenIdentifier;
            
            // Special handling for EGLD - use CoinMarketCap image
            const isEGLD = dcaTokenIdentifier === 'EGLD';
            const iconUrl = isEGLD 
              ? 'https://s2.coinmarketcap.com/static/img/coins/200x200/6892.png'
              : `https://tools.multiversx.com/assets-cdn/${networkPath}/tokens/${dcaTokenIdentifier}/icon.png`;
            
            contractTokens.push({
              identifier: dcaTokenIdentifier,
              name: tokenTicker,
              ticker: tokenTicker,
              decimals: 18, // Default, might need to fetch from API
              assets: {
                svgUrl: iconUrl,
                pngUrl: iconUrl
              }
            });
          }
        });
        
        setTokens(contractTokens);
        
        // Fetch prices for all tokens
        fetchTokenPrices(contractTokens);
        
        // Set default token
        if (contractTokens.length > 0 && !token) {
          setToken(contractTokens[0].identifier || contractTokens[0].ticker);
        }
        
        // Update frequency and min amount when token changes
        // Find the setup that matches the selected token
        const selectedSetup = setups.find(s => s.dcaToken === token) || setup;
        if (selectedSetup) {
          // Set default frequency from allowed frequencies
          if (selectedSetup.allowedFrequencies && selectedSetup.allowedFrequencies.length > 0) {
            if (!frequency || !selectedSetup.allowedFrequencies.find(f => f.frequency === frequency)) {
              setFrequency(selectedSetup.allowedFrequencies[0].frequency);
            }
          }
          
          // Set default amount to 1 USDC (not the minimum)
          if (!amountPerDca) {
            setAmountPerDca('1.00');
          }
        }
        
      } catch (error) {
      } finally {
        setLoadingTokens(false);
      }
    }
  }, [setups, setup, loadingSetup, setupError, token, frequency, amountPerDca]);

  const handleAddStrategy = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = Number(amountPerDca);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    // Find the setup that matches the selected token
    const selectedSetup = setups?.find(s => s.dcaToken === token);
    if (!selectedSetup) {
      alert('Please select a valid token');
      return;
    }

    // Take profit is optional in UI but required in ABI (use 0 if not provided)
    const parsedTakeProfit = showTakeProfit ? Number(takeProfitPct) : 0;

    // Show analysis modal instead of creating strategy directly
    setAnalysisModal({
      isOpen: true,
      token,
      usdcPerSwap: parsedAmount,
      frequency,
      takeProfit: parsedTakeProfit
    });
  };

  const handleCreateStrategyAfterAnalysis = async () => {
    const parsedAmount = analysisModal.usdcPerSwap;
    const selectedSetup = setups?.find(s => s.dcaToken === analysisModal.token);
    if (!selectedSetup) {
      alert('Please select a valid token');
      return;
    }

    const contractAddress = selectedSetup.address;
    const parsedTakeProfit = analysisModal.takeProfit;

    try {
      setIsCreatingStrategy(true);
      setAnalysisModal({ isOpen: false, token: '', usdcPerSwap: 0, frequency: '', takeProfit: 0 });
      
      const { sessionId } = await createStrategy(
        contractAddress,
        parsedAmount,
        analysisModal.frequency,
        parsedTakeProfit
      );

      // Reset form
      setAmountPerDca('1.00');
      setShowTakeProfit(false);
      setTakeProfitPct('15');
      
      // Wait for transaction success and then refetch
      const success = await waitForTransactionSuccess(sessionId);
      if (success && isMountedRef.current) {
        fetchUserDcaiTokens();
        // Refetch activity after a short delay
        setTimeout(() => {
          fetchActivity();
        }, 1000);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create strategy');
    } finally {
      setIsCreatingStrategy(false);
    }
  };

  const handleModifyStrategyAfterAnalysis = async (suggestions: string[], suggestedParams?: { usdc_per_swap?: number | null; frequency?: string | null; take_profit?: number | null }) => {
    if (!suggestedParams) {
      // Fallback: just show suggestions
      const suggestionsText = suggestions.length > 0 
        ? suggestions.join('\n• ')
        : 'No specific suggestions provided.';
      alert(`LLM Suggestions:\n\n• ${suggestionsText}\n\nPlease review and adjust your strategy parameters manually.`);
      setAnalysisModal({ isOpen: false, token: '', usdcPerSwap: 0, frequency: '', takeProfit: 0 });
      return;
    }

    // Apply suggested parameters
    let newUsdcPerSwap = analysisModal.usdcPerSwap;
    let newFrequency = analysisModal.frequency;
    let newTakeProfit = analysisModal.takeProfit;

    if (suggestedParams.usdc_per_swap !== null && suggestedParams.usdc_per_swap !== undefined) {
      newUsdcPerSwap = suggestedParams.usdc_per_swap;
      setAmountPerDca(newUsdcPerSwap.toFixed(2));
    }

    if (suggestedParams.frequency !== null && suggestedParams.frequency !== undefined) {
      newFrequency = suggestedParams.frequency.toLowerCase();
      setFrequency(newFrequency);
    }

    if (suggestedParams.take_profit !== null && suggestedParams.take_profit !== undefined) {
      newTakeProfit = suggestedParams.take_profit;
      setTakeProfitPct(newTakeProfit.toFixed(1));
      if (newTakeProfit > 0) {
        setShowTakeProfit(true);
      }
    }

    // Update analysis modal with new values
    const updatedModal = {
      isOpen: true,
      token: analysisModal.token,
      usdcPerSwap: newUsdcPerSwap,
      frequency: newFrequency,
      takeProfit: newTakeProfit
    };
    setAnalysisModal(updatedModal);

    // Find the setup that matches the selected token
    const selectedSetup = setups?.find(s => s.dcaToken === analysisModal.token);
    if (!selectedSetup) {
      alert('Please select a valid token');
      setAnalysisModal({ isOpen: false, token: '', usdcPerSwap: 0, frequency: '', takeProfit: 0 });
      return;
    }

    const contractAddress = selectedSetup.address;

    // Close the analysis modal and create strategy with new parameters
    try {
      setIsCreatingStrategy(true);
      setAnalysisModal({ isOpen: false, token: '', usdcPerSwap: 0, frequency: '', takeProfit: 0 });
      
      const { sessionId } = await createStrategy(
        contractAddress,
        newUsdcPerSwap,
        newFrequency,
        newTakeProfit
      );

      // Reset form
      setAmountPerDca('1.00');
      setShowTakeProfit(false);
      setTakeProfitPct('15');
      
      // Wait for transaction success and then refetch
      const success = await waitForTransactionSuccess(sessionId);
      if (success && isMountedRef.current) {
        fetchUserDcaiTokens();
        // Refetch activity after a short delay
        setTimeout(() => {
          fetchActivity();
        }, 1000);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create strategy with suggested parameters');
    } finally {
      setIsCreatingStrategy(false);
    }
  };

  const handleModifyStrategy = (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) return;

    setModifyModal({
      isOpen: true,
      strategyId,
      amountPerDca: strategy.amountPerDca.toFixed(2),
      frequency: strategy.frequency,
      takeProfitPct: strategy.takeProfitPct !== undefined ? strategy.takeProfitPct.toFixed(1) : '',
      showTakeProfit: strategy.takeProfitPct !== undefined
    });
  };

  const handleModifyStrategySubmit = async () => {
    if (!modifyModal.strategyId) return;

    const strategy = strategies.find(s => s.id === modifyModal.strategyId);
    if (!strategy) {
      setModifyModal({ isOpen: false, strategyId: null, amountPerDca: '', frequency: '', takeProfitPct: '', showTakeProfit: false });
      return;
    }

    const amountPerDca = parseFloat(modifyModal.amountPerDca);
    if (isNaN(amountPerDca) || amountPerDca <= 0) {
      return; // Validation handled in UI
    }

    const takeProfitPct = modifyModal.showTakeProfit && modifyModal.takeProfitPct 
      ? parseFloat(modifyModal.takeProfitPct) 
      : 0;

    try {
      const { sessionId } = await modifyStrategy(
        strategy.contractAddress,
        amountPerDca,
        modifyModal.frequency,
        takeProfitPct,
        strategy.tokenIdentifier
      );
      setModifyModal({ isOpen: false, strategyId: null, amountPerDca: '', frequency: '', takeProfitPct: '', showTakeProfit: false });
      
      // Wait for transaction success and then refetch
      const success = await waitForTransactionSuccess(sessionId);
      if (success && isMountedRef.current) {
        fetchUserDcaiTokens();
        // Refetch activity after a short delay
        setTimeout(() => {
          fetchActivity();
        }, 1000);
      }
    } catch (error) {
      // Error handling is done by the transaction system
      setModifyModal({ isOpen: false, strategyId: null, amountPerDca: '', frequency: '', takeProfitPct: '', showTakeProfit: false });
    }
  };

  const handleModifyStrategyCancel = () => {
    setModifyModal({ isOpen: false, strategyId: null, amountPerDca: '', frequency: '', takeProfitPct: '', showTakeProfit: false });
  };

  const handleDeleteStrategy = (strategyId: string) => {
    setDeleteModal({
      isOpen: true,
      strategyId
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.strategyId) return;

    const strategy = strategies.find(s => s.id === deleteModal.strategyId);
    if (!strategy) {
      setDeleteModal({ isOpen: false, strategyId: null });
      return;
    }

    try {
      const { sessionId } = await deleteStrategy(strategy.contractAddress, strategy.tokenIdentifier);
      setDeleteModal({ isOpen: false, strategyId: null });
      
      // Wait for transaction success and then refetch
      const success = await waitForTransactionSuccess(sessionId);
      if (success && isMountedRef.current) {
        fetchUserDcaiTokens();
        // Refetch activity after a short delay
        setTimeout(() => {
          fetchActivity();
        }, 1000);
      }
    } catch (error) {
      // Error handling is done by the transaction system
      setDeleteModal({ isOpen: false, strategyId: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, strategyId: null });
  };

  // Fetch user's USDC wallet balance
  const fetchUsdcWalletBalance = async () => {
    if (!address) {
      setUsdcWalletBalance(0);
      return;
    }

    try {
      // Determine API URL based on network
      const apiUrl = getApiUrl(network);

      // Fetch user's tokens
      const tokensUrl = `${apiUrl}/accounts/${address}/tokens`;
      const response = await fetch(tokensUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        setUsdcWalletBalance(0);
        return;
      }

      const tokensData = await response.json();
      
      // Find USDC token (USDC-350c4e for devnet, might be different for other networks)
      const usdcToken = tokensData.find((token: any) => {
        const identifier = token.identifier || token.tokenIdentifier || '';
        return identifier.startsWith('USDC-');
      });

      if (usdcToken) {
        // USDC has 6 decimals
        const usdcDecimals = 1000000; // 10^6
        const balance = parseFloat(usdcToken.balance || '0') / usdcDecimals;
        setUsdcWalletBalance(balance);
      } else {
        setUsdcWalletBalance(0);
      }
    } catch (error) {
      setUsdcWalletBalance(0);
    }
  };

  const handleDeposit = (strategyId: string) => {
    setDepositModal({
      isOpen: true,
      strategyId,
      amount: ''
    });
    // Fetch USDC balance when modal opens
    fetchUsdcWalletBalance();
  };

  // Helper function to wait for transaction success and then refetch
  const waitForTransactionSuccess = async (sessionId: string) => {
    const maxAttempts = 60; // Maximum polling attempts (60 seconds)
    let attempts = 0;

    const pollTransactionStatus = async (): Promise<boolean> => {
      if (attempts >= maxAttempts) {
        return false; // Timeout
      }

      try {
        const transactionsStatus = getActiveTransactionsStatus();
        
        // Check if transaction is no longer in active transactions (completed)
        // If it's not in the active list, it means it completed (success or failed)
        // We'll check by looking for the sessionId in the status object
        const hasTransaction = transactionsStatus && 
          Object.values(transactionsStatus).some((tx: any) => 
            tx && (tx.sessionId === sessionId || (Array.isArray(tx) && tx.some((t: any) => t?.sessionId === sessionId)))
          );
        
        // If transaction is no longer active, it completed
        // We assume success if it's no longer in active transactions
        // (TransactionManager removes successful transactions from active list)
        if (!hasTransaction) {
          // Give a small delay to ensure blockchain state is updated
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        }

        // Transaction still pending, wait and retry
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return pollTransactionStatus();
      } catch (error) {
        return false;
      }
    };

    return pollTransactionStatus();
  };

  const handleDepositSubmit = async () => {
    if (!depositModal.strategyId) return;

    const strategy = strategies.find(s => s.id === depositModal.strategyId);
    if (!strategy) {
      setDepositModal({ isOpen: false, strategyId: null, amount: '' });
      return;
    }

    const amount = parseFloat(depositModal.amount);
    if (isNaN(amount) || amount <= 0) {
      return; // Validation handled in UI
    }

    try {
      const { sessionId } = await deposit(strategy.contractAddress, amount, strategy.tokenIdentifier);
      setDepositModal({ isOpen: false, strategyId: null, amount: '' });
      
      // Wait for transaction success and then refetch
      const success = await waitForTransactionSuccess(sessionId);
      if (success && isMountedRef.current) {
        fetchUserDcaiTokens();
        // Refetch activity after a short delay
        setTimeout(() => {
          fetchActivity();
        }, 1000);
      }
    } catch (error) {
      // Error handling is done by the transaction system
      setDepositModal({ isOpen: false, strategyId: null, amount: '' });
    }
  };

  const handleDepositCancel = () => {
    setDepositModal({ isOpen: false, strategyId: null, amount: '' });
  };

  const handleWithdraw = (strategyId: string, asset: 'usdc' | 'token') => {
    setWithdrawModal({
      isOpen: true,
      strategyId,
      asset,
      amount: ''
    });
  };

  const handleWithdrawSubmit = async () => {
    if (!withdrawModal.strategyId || !withdrawModal.asset) return;

    const strategy = strategies.find(s => s.id === withdrawModal.strategyId);
    if (!strategy) {
      setWithdrawModal({ isOpen: false, strategyId: null, asset: null, amount: '' });
      return;
    }

    const amount = parseFloat(withdrawModal.amount);
    if (isNaN(amount) || amount <= 0) {
      return; // Validation handled in UI
    }

    try {
      const { sessionId } = await withdraw(strategy.contractAddress, amount, withdrawModal.asset, strategy.tokenIdentifier);
      setWithdrawModal({ isOpen: false, strategyId: null, asset: null, amount: '' });
      
      // Wait for transaction success and then refetch
      const success = await waitForTransactionSuccess(sessionId);
      if (success && isMountedRef.current) {
        fetchUserDcaiTokens();
        // Refetch activity after a short delay
        setTimeout(() => {
          fetchActivity();
        }, 1000);
      }
    } catch (error) {
      // Error handling is done by the transaction system
      setWithdrawModal({ isOpen: false, strategyId: null, asset: null, amount: '' });
    }
  };

  const handleWithdrawCancel = () => {
    setWithdrawModal({ isOpen: false, strategyId: null, asset: null, amount: '' });
  };


  // Calculate total portfolio: USDC + USD value of all token balances
  const totalPortfolio = strategies.reduce((sum, s) => {
    const usdcValue = s.availableUsdc;
    let tokenValue = 0;
    
    // Calculate USD value of token balance if price is available
    if (s.dcaTokenIdentifier && tokenPrices[s.dcaTokenIdentifier]) {
      tokenValue = s.tokenBalance * tokenPrices[s.dcaTokenIdentifier];
    }
    
    return sum + usdcValue + tokenValue;
  }, 0);

  return (
    <div className='flex w-full justify-center overflow-visible relative'>
      <div className='flex w-full max-w-6xl flex-col gap-12 bg-background text-foreground overflow-visible'>
        <PortfolioHeader totalPortfolio={totalPortfolio} />

        <section className='relative grid gap-8 border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)]'>
          <div className='pointer-events-none absolute -top-20 pt-2 left-2 z-10'>
            <Image
              src='/assets/img/sloth.png'
              alt='DCAi sloth mascot'
              width={260}
              height={120}
              className='object-contain'
            />
          </div>

          <CreateStrategyForm
            tokens={tokens}
            token={token}
            onTokenChange={setToken}
            frequency={frequency}
            onFrequencyChange={setFrequency}
            amountPerDca={amountPerDca}
            onAmountPerDcaChange={setAmountPerDca}
            showTakeProfit={showTakeProfit}
            onShowTakeProfitChange={setShowTakeProfit}
            takeProfitPct={takeProfitPct}
            onTakeProfitPctChange={setTakeProfitPct}
            setup={setup}
            setups={setups}
            loadingSetup={loadingSetup}
            loadingTokens={loadingTokens}
            setupError={setupError}
            isCreatingStrategy={isCreatingStrategy}
            onSubmit={handleAddStrategy}
            network={network}
          />

          <div className='flex flex-col gap-3'>
            <h2 className='text-sm font-semibold tracking-tight'>
              Active strategies
            </h2>
            <ActiveStrategiesList
              strategies={strategies}
              expandedGroups={expandedGroups}
              strategyIndices={strategyIndices}
              onToggleGroup={(groupKey) => {
                const newExpanded = new Set(expandedGroups);
                if (newExpanded.has(groupKey)) {
                  newExpanded.delete(groupKey);
                } else {
                  newExpanded.add(groupKey);
                  if (strategyIndices[groupKey] === undefined) {
                    setStrategyIndices(prev => ({ ...prev, [groupKey]: 0 }));
                  }
                }
                setExpandedGroups(newExpanded);
              }}
              onSetStrategyIndex={(groupKey, index) => {
                setStrategyIndices(prev => ({ ...prev, [groupKey]: index }));
              }}
              onModifyStrategy={handleModifyStrategy}
              onDeleteStrategy={handleDeleteStrategy}
              onDeposit={handleDeposit}
              onWithdraw={handleWithdraw}
              tokenPrices={tokenPrices}
            />
          </div>
        </section>

        <ActivityFeed
          activities={activities}
          currentPage={currentActivityPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentActivityPage}
        />
      </div>

      <WithdrawModal
        isOpen={withdrawModal.isOpen}
        strategy={strategies.find(s => s.id === withdrawModal.strategyId) || null}
        asset={withdrawModal.asset}
        amount={withdrawModal.amount}
        onAmountChange={(amount) => setWithdrawModal({ ...withdrawModal, amount })}
        onSubmit={handleWithdrawSubmit}
        onCancel={handleWithdrawCancel}
      />

      <DepositModal
        isOpen={depositModal.isOpen}
        strategy={strategies.find(s => s.id === depositModal.strategyId) || null}
        amount={depositModal.amount}
        usdcWalletBalance={usdcWalletBalance}
        onAmountChange={(amount) => setDepositModal({ ...depositModal, amount })}
        onSubmit={handleDepositSubmit}
        onCancel={handleDepositCancel}
      />

      <ModifyStrategyModal
        isOpen={modifyModal.isOpen}
        strategy={strategies.find(s => s.id === modifyModal.strategyId) || null}
        setups={setups}
        amountPerDca={modifyModal.amountPerDca}
        frequency={modifyModal.frequency}
        takeProfitPct={modifyModal.takeProfitPct}
        showTakeProfit={modifyModal.showTakeProfit}
        onAmountPerDcaChange={(amount) => setModifyModal({ ...modifyModal, amountPerDca: amount })}
        onFrequencyChange={(frequency) => setModifyModal({ ...modifyModal, frequency })}
        onTakeProfitPctChange={(pct) => setModifyModal({ ...modifyModal, takeProfitPct: pct })}
        onShowTakeProfitChange={(show) => setModifyModal({ ...modifyModal, showTakeProfit: show })}
        onSubmit={handleModifyStrategySubmit}
        onCancel={handleModifyStrategyCancel}
      />

      <DeleteModal
        isOpen={deleteModal.isOpen}
        strategy={strategies.find(s => s.id === deleteModal.strategyId) || null}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      <StrategyAnalysisModal
        isOpen={analysisModal.isOpen}
        token={analysisModal.token}
        usdcPerSwap={analysisModal.usdcPerSwap}
        frequency={analysisModal.frequency}
        takeProfit={analysisModal.takeProfit}
        marketData={analysisModal.token ? (tokenMarketData[analysisModal.token] || null) : null}
        onClose={() => setAnalysisModal({ isOpen: false, token: '', usdcPerSwap: 0, frequency: '', takeProfit: 0 })}
        onCreateStrategy={handleCreateStrategyAfterAnalysis}
        onModifyStrategy={handleModifyStrategyAfterAnalysis}
      />
    </div>
  );
};

