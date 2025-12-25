'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useDcaContract, useCreateStrategy, useDeposit, useWithdraw, useDeleteStrategy, useModifyStrategy } from '@/hooks';
import { useGetAccount, useGetNetworkConfig, Address, getActiveTransactionsStatus, TransactionManager } from '@/lib';

interface MultiversXToken {
  identifier: string;
  name: string;
  ticker: string;
  decimals: number;
  assets?: {
    pngUrl?: string;
    svgUrl?: string;
  };
}

interface DcaStrategy {
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
  lastExecutedTsMillis?: string; // Timestamp of last execution in milliseconds
  contractAddress: string; // DCA contract address (bech32 format)
}

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
  const [token, setToken] = useState<string>('');
  const [frequency, setFrequency] = useState<string>('');
  const [amountPerDca, setAmountPerDca] = useState<string>('');
  const [showTakeProfit, setShowTakeProfit] = useState<boolean>(false);
  const [takeProfitPct, setTakeProfitPct] = useState<string>('15');
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState<boolean>(false);
  const [isFrequencyDropdownOpen, setIsFrequencyDropdownOpen] = useState<boolean>(false);
  const [isModifyFrequencyDropdownOpen, setIsModifyFrequencyDropdownOpen] = useState<boolean>(false);
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
  // State for user's USDC wallet balance
  const [usdcWalletBalance, setUsdcWalletBalance] = useState<number>(0);
  // State for frequency info tooltip
  const [showFrequencyInfo, setShowFrequencyInfo] = useState<boolean>(false);
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

  // Helper function to get network path for token images
  const getNetworkPath = (): string => {
    if (network.apiAddress) {
      if (network.apiAddress.includes('devnet')) {
        return 'devnet';
      } else if (network.apiAddress.includes('testnet')) {
        return 'testnet';
      } else {
        return 'mainnet';
      }
    }
    return 'devnet'; // Default to devnet
  };

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
            let networkPathForImages = 'devnet';
          if (network.apiAddress) {
            if (network.apiAddress.includes('devnet')) {
              networkPathForImages = 'devnet';
            } else if (network.apiAddress.includes('testnet')) {
              networkPathForImages = 'testnet';
            } else {
              networkPathForImages = 'mainnet';
            }
          }
          
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
              tokenIdentifier: identifier,
              tokenLogo: `https://tools.multiversx.com/assets-cdn/${networkPathForImages}/tokens/${iconIdentifier}/icon.png`,
              frequency: attributes.dcaFrequency || 'Unknown',
              amountPerDca: amountPerSwap,
              takeProfitPct: takeProfitPercentage > 0 ? takeProfitPercentage : undefined,
              isActive: true, // You might want to check if strategy is active based on some condition
              availableUsdc: usdcBalance,
              tokenBalance: tokenBalance,
              lastExecutedTsMillis: lastExecutedTsMillis,
              contractAddress: contractAddress // Store the contract address for deposit/withdraw
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
        const networkPath = getNetworkPath();
        setups.forEach((setupItem) => {
          const dcaTokenIdentifier = setupItem.dcaToken;
          if (dcaTokenIdentifier && dcaTokenIdentifier !== 'EGLD' && !seenTokens.has(dcaTokenIdentifier)) {
            seenTokens.add(dcaTokenIdentifier);
            const tokenTicker = dcaTokenIdentifier.split('-')[0] || dcaTokenIdentifier;
            
            // Use dcaToken directly as the identifier for the image with network path
            contractTokens.push({
              identifier: dcaTokenIdentifier,
              name: tokenTicker,
              ticker: tokenTicker,
              decimals: 18, // Default, might need to fetch from API
              assets: {
                svgUrl: `https://tools.multiversx.com/assets-cdn/${networkPath}/tokens/${dcaTokenIdentifier}/icon.png`,
                pngUrl: `https://tools.multiversx.com/assets-cdn/${networkPath}/tokens/${dcaTokenIdentifier}/icon.png`
              }
            });
          }
        });
        
        setTokens(contractTokens);
        
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

    // Address is already in bech32 format (erd1...)
    const contractAddress = selectedSetup.address;

    // Take profit is optional in UI but required in ABI (use 0 if not provided)
    const parsedTakeProfit = showTakeProfit ? Number(takeProfitPct) : 0;

    try {
      setIsCreatingStrategy(true);
      
      const { sessionId } = await createStrategy(
        contractAddress,
        parsedAmount,
        frequency,
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


  const totalPortfolio = strategies.reduce((sum, s) => sum + s.availableUsdc, 0);

  return (
    <div className='flex w-full justify-center'>
      <div className='flex w-full max-w-6xl flex-col gap-10 bg-background text-foreground'>
        <section className='grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center'>
          <div className='flex flex-col gap-6'>
            <div className='flex flex-col gap-2'>
              <h1 className='text-2xl font-semibold tracking-tight'>DCA Board</h1>
              <p className='max-w-xl text-sm text-[hsl(var(--gray-300)/0.8)]'>
                Orchestrate AI-assisted dollar cost averaging strategies on MultiversX.
                Review balances, fund your DCA vault, and fine-tune each strategy&apos;s
                risk and take-profit behaviour.
              </p>
            </div>

            <div className='border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-5 shadow-sm max-w-md'>
              <h2 className='text-xs font-semibold uppercase tracking-[0.25em] text-[hsl(var(--sky-300)/0.9)]'>
                Portfolio
              </h2>
              <p className='mt-3 text-2xl font-bold'>${totalPortfolio.toFixed(2)}</p>
              <p className='mt-1 text-xs text-[hsl(var(--gray-300)/0.7)]'>
                Total value across all DCA strategies.
              </p>
            </div>
          </div>
          <div className='flex justify-center md:justify-end'>
            <Image
              src='/assets/img/stacking.png'
              alt='DCAi staking illustration'
              width={360}
              height={360}
              className='object-contain w-[180px] h-[180px] md:w-[360px] md:h-[360px]'
            />
          </div>
        </section>

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

          <form className='flex flex-col gap-4' onSubmit={handleAddStrategy}>
            <div className='flex items-center justify-between'>
              <h2 className='text-sm font-semibold tracking-tight'>
                Create a DCA strategy
              </h2>
              {setupError && (
                <span className='text-xs text-red-500'>{setupError}</span>
              )}
            </div>

            <div className='flex flex-col gap-1'>
              <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
                Token to DCA into
              </label>
              {loadingTokens ? (
                <div className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm flex items-center text-[hsl(var(--gray-300)/0.6)]'>
                  Loading tokens...
                </div>
              ) : (
                <div className='relative'>
                  <button
                    type='button'
                    onClick={() => setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                    className='flex h-9 w-full items-center gap-2 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-left text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                  >
                    {(() => {
                      const selectedToken = tokens.find(t => (t.identifier || t.ticker) === token);
                      // Use dcaToken identifier directly for the image with network path
                      const networkPath = getNetworkPath();
                      const tokenIcon = selectedToken?.assets?.pngUrl || selectedToken?.assets?.svgUrl || 
                        (selectedToken?.identifier 
                          ? `https://tools.multiversx.com/assets-cdn/${networkPath}/tokens/${selectedToken.identifier}/icon.png`
                          : undefined);
                      return (
                        <>
                          {tokenIcon && (
                            <Image
                              src={tokenIcon}
                              alt={selectedToken?.ticker || ''}
                              width={20}
                              height={20}
                              className='flex-shrink-0'
                              onError={(e) => {
                                // Hide the image on error (especially for WEGLD)
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          )}
                          <span className='flex-1'>
                            {selectedToken?.ticker}
                          </span>
                          <span className='text-[hsl(var(--gray-300)/0.6)]'>▼</span>
                        </>
                      );
                    })()}
                  </button>
                  
                  {isTokenDropdownOpen && (
                    <>
                      <div
                        className='fixed inset-0 z-10'
                        onClick={() => setIsTokenDropdownOpen(false)}
                      />
                      <div className='absolute z-20 mt-1 max-h-60 w-full overflow-auto border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] shadow-lg'>
                        {tokens.map((t) => {
                          // Use dcaToken identifier directly for the image with network path
                          const networkPath = getNetworkPath();
                          const tokenIcon = t.assets?.pngUrl || t.assets?.svgUrl ||
                            (t.identifier 
                              ? `https://tools.multiversx.com/assets-cdn/${networkPath}/tokens/${t.identifier}/icon.png`
                              : undefined);
                          const isSelected = (t.identifier || t.ticker) === token;
                          return (
                            <button
                              key={t.identifier || t.ticker}
                              type='button'
                              onClick={() => {
                                const newToken = t.identifier || t.ticker;
                                setToken(newToken);
                                setIsTokenDropdownOpen(false);
                                
                                // Update frequency and min amount for the selected token
                                const selectedSetup = setups?.find(s => s.dcaToken === newToken);
                                if (selectedSetup) {
                                  if (selectedSetup.allowedFrequencies && selectedSetup.allowedFrequencies.length > 0) {
                                    setFrequency(selectedSetup.allowedFrequencies[0].frequency);
                                  }
                                  // Set default amount to 1 USDC (not the minimum)
                                  setAmountPerDca('1.00');
                                }
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[hsl(var(--gray-300)/0.1)] ${
                                isSelected ? 'bg-[hsl(var(--sky-300)/0.2)]' : ''
                              }`}
                            >
                              {tokenIcon && (
                                <Image
                                  src={tokenIcon}
                                  alt={t.ticker}
                                  width={20}
                                  height={20}
                                  className='flex-shrink-0'
                                  onError={(e) => {
                                    // Hide the image on error (especially for WEGLD)
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              )}
                              <span className='flex-1'>
                                {isSelected && <span className='text-[hsl(var(--sky-300))]'>✓ </span>}
                                {t.ticker}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='flex flex-col gap-1'>
                <div className='flex items-center gap-1'>
                  <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
                    Frequency
                  </label>
                  <button
                    type='button'
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFrequencyInfo(!showFrequencyInfo);
                    }}
                    className='relative flex items-center justify-center h-4 w-4 text-[hsl(var(--gray-300)/0.6)] hover:text-[hsl(var(--sky-300))] transition-colors'
                    title='DCAi LLM Information'
                  >
                    <span className='text-xs'>ℹ</span>
                    {showFrequencyInfo && (
                      <>
                        <div
                          className='fixed inset-0 z-40'
                          onClick={() => setShowFrequencyInfo(false)}
                        />
                        <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-xs bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.2)] shadow-lg z-50 rounded'>
                          <p className='text-[hsl(var(--gray-300)/0.9)]'>
                            DCAi LLM works only with <strong>Daily</strong> or <strong>Weekly</strong> frequency. These frequencies are marked with &quot;(DCAi Activated)&quot; in the dropdown.
                          </p>
                          <div className='absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-[hsl(var(--background))] border-r border-b border-[hsl(var(--gray-300)/0.2)] rotate-45'></div>
                        </div>
                      </>
                    )}
                  </button>
                </div>
                {loadingSetup ? (
                  <div className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm flex items-center text-[hsl(var(--gray-300)/0.6)]'>
                    Loading frequencies...
                  </div>
                ) : (() => {
                  // Find the setup for the selected token
                  const selectedSetup = setups?.find(s => s.dcaToken === token) || setup;
                  const frequencies = selectedSetup && selectedSetup.allowedFrequencies && selectedSetup.allowedFrequencies.length > 0
                    ? selectedSetup.allowedFrequencies.map(freq => freq.frequency)
                    : ['hourly', 'daily', 'weekly', 'monthly'];
                  
                  // Get display name for frequency
                  const getFrequencyDisplayName = (freq: string) => {
                    const freqName = freq.toLowerCase();
                    if (freqName === 'daily' || freqName === 'weekly') {
                      return `${freq} (DCAi Activated)`;
                    }
                    // Capitalize first letter
                    return freq.charAt(0).toUpperCase() + freq.slice(1);
                  };
                  
                  // Get current frequency display name
                  const currentFrequencyDisplay = frequency ? getFrequencyDisplayName(frequency) : 'Select frequency';
                  
                  return (
                    <div className='relative'>
                      <button
                        type='button'
                        onClick={() => setIsFrequencyDropdownOpen(!isFrequencyDropdownOpen)}
                        className='flex h-9 w-full items-center gap-2 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-left text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                      >
                        <span className='flex-1'>{currentFrequencyDisplay}</span>
                        <span className='text-[hsl(var(--gray-300)/0.6)]'>▼</span>
                      </button>
                      
                      {isFrequencyDropdownOpen && (
                        <>
                          <div
                            className='fixed inset-0 z-10'
                            onClick={() => setIsFrequencyDropdownOpen(false)}
                          />
                          <div className='absolute z-20 mt-1 max-h-60 w-full overflow-auto border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] shadow-lg'>
                            {frequencies.map((freq) => {
                              const isSelected = frequency === freq;
                              const displayName = getFrequencyDisplayName(freq);
                              return (
                                <button
                                  key={freq}
                                  type='button'
                                  onClick={() => {
                                    setFrequency(freq);
                                    setIsFrequencyDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[hsl(var(--gray-300)/0.1)] ${
                                    isSelected ? 'bg-[hsl(var(--sky-300)/0.2)]' : ''
                                  }`}
                                >
                                  <span className='flex-1'>
                                    {isSelected && <span className='text-[hsl(var(--sky-300))]'>✓ </span>}
                                    {displayName}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className='flex flex-col gap-1'>
                <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
                  USDC per DCA
                  {(() => {
                    const selectedSetup = setups?.find(s => s.dcaToken === token) || setup;
                    return selectedSetup && (
                      <span className='text-[hsl(var(--gray-300)/0.6)] ml-1'>
                        (Min: {parseFloat(selectedSetup.minAmountPerSwap).toFixed(2)} USDC)
                      </span>
                    );
                  })()}
                </label>
                <input
                  type='number'
                  min={(() => {
                    const selectedSetup = setups?.find(s => s.dcaToken === token) || setup;
                    return selectedSetup ? parseFloat(selectedSetup.minAmountPerSwap).toFixed(2) : '0';
                  })()}
                  step='0.01'
                  value={amountPerDca}
                  onChange={(e) => setAmountPerDca(e.target.value)}
                  className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                  placeholder={(() => {
                    const selectedSetup = setups?.find(s => s.dcaToken === token) || setup;
                    return selectedSetup ? parseFloat(selectedSetup.minAmountPerSwap).toFixed(2) : '50';
                  })()}
                />
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <button
                type='button'
                onClick={() => setShowTakeProfit(!showTakeProfit)}
                className='flex items-center justify-between border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] p-3 text-left text-sm transition-colors hover:border-[hsl(var(--sky-300)/0.3)]'
              >
                <span className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
                  Take-profit % (Optional)
                </span>
                <span className='text-[hsl(var(--sky-300))]'>
                  {showTakeProfit ? '−' : '+'}
                </span>
              </button>
              
              {showTakeProfit && (
                <div className='flex flex-col gap-1 border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-3'>
                  <input
                    type='number'
                    min='0'
                    step='0.1'
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(e.target.value)}
                    className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                    placeholder='15'
                  />
                  <p className='text-[11px] text-[hsl(var(--gray-300)/0.7)]'>
                    For every DCA leg, DCAi will try to lock profit once price
                    moves up by this percentage.
                  </p>
                </div>
              )}
            </div>

            <div className='mt-2 flex justify-end'>
              <button
                type='submit'
                disabled={isCreatingStrategy}
                className='inline-flex items-center justify-center bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {isCreatingStrategy ? 'Creating...' : 'Create Strategy'}
              </button>
            </div>
          </form>

          <div className='flex flex-col gap-3'>
            <h2 className='text-sm font-semibold tracking-tight'>
              Active strategies
            </h2>
            {strategies.length === 0 ? (
              <p className='text-sm text-[hsl(var(--gray-300)/0.7)]'>
                No strategies yet. Create your first DCA plan on the left.
              </p>
            ) : (
              <div className='flex flex-col gap-2'>
                {(() => {
                  // Group strategies by token
                  const groupedStrategies = strategies.reduce((acc, strategy) => {
                    const token = strategy.token;
                    if (!acc[token]) {
                      acc[token] = [];
                    }
                    acc[token].push(strategy);
                    return acc;
                  }, {} as Record<string, typeof strategies>);

                  return Object.entries(groupedStrategies).map(([token, tokenStrategies]) => {
                    const groupKey = token;
                    const isExpanded = expandedGroups.has(groupKey);
                    const currentIndex = strategyIndices[groupKey] || 0;
                    const currentStrategy = tokenStrategies[currentIndex];
                    // Use first strategy for header image (always available)
                    const headerStrategy = tokenStrategies[0];

                    return (
                      <div
                        key={groupKey}
                        className='border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))]'
                      >
                        {/* Collapsed header */}
                        <button
                          type='button'
                          onClick={() => {
                            const newExpanded = new Set(expandedGroups);
                            if (isExpanded) {
                              newExpanded.delete(groupKey);
                            } else {
                              newExpanded.add(groupKey);
                              // Initialize index if not set
                              if (strategyIndices[groupKey] === undefined) {
                                setStrategyIndices(prev => ({ ...prev, [groupKey]: 0 }));
                              }
                            }
                            setExpandedGroups(newExpanded);
                          }}
                          className='w-full flex items-center justify-between p-4 text-left hover:bg-[hsl(var(--gray-300)/0.05)] transition-colors'
                        >
                          <div className='flex items-center gap-2'>
                            {headerStrategy?.tokenLogo ? (
                              <Image
                                src={headerStrategy.tokenLogo}
                                alt={token}
                                width={24}
                                height={24}
                                className='rounded-full'
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ) : null}
                            <div className='flex flex-col'>
                              <span className='font-medium text-sm'>
                                {token} DCA
                              </span>
                              <span className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                                {tokenStrategies.length} {tokenStrategies.length === 1 ? 'strategy' : 'strategies'}
                              </span>
                            </div>
                          </div>
                          <span className='text-[hsl(var(--gray-300)/0.7)]'>
                            {isExpanded ? '▼' : '▶'}
                          </span>
                        </button>

                        {/* Expanded content with slider */}
                        {isExpanded && currentStrategy && (
                          <div className='border-t border-[hsl(var(--gray-300)/0.2)] p-4'>
                            {/* Slider navigation */}
                            {tokenStrategies.length > 1 && (
                              <div className='flex items-center justify-between mb-4'>
                                <button
                                  type='button'
                                  onClick={() => {
                                    const newIndex = currentIndex > 0 ? currentIndex - 1 : tokenStrategies.length - 1;
                                    setStrategyIndices(prev => ({ ...prev, [groupKey]: newIndex }));
                                  }}
                                  className='flex items-center justify-center h-8 w-8 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.8)] transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:text-[hsl(var(--sky-300))]'
                                  disabled={tokenStrategies.length <= 1}
                                >
                                  ←
                                </button>
                                <span className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                                  {currentIndex + 1} / {tokenStrategies.length}
                                </span>
                                <button
                                  type='button'
                                  onClick={() => {
                                    const newIndex = currentIndex < tokenStrategies.length - 1 ? currentIndex + 1 : 0;
                                    setStrategyIndices(prev => ({ ...prev, [groupKey]: newIndex }));
                                  }}
                                  className='flex items-center justify-center h-8 w-8 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.8)] transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:text-[hsl(var(--sky-300))]'
                                  disabled={tokenStrategies.length <= 1}
                                >
                                  →
                                </button>
                              </div>
                            )}

                            {/* Strategy card */}
                            <div className='flex flex-col gap-3 text-sm'>
                              <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-2'>
                                  {currentStrategy.tokenLogo && (
                                    <Image
                                      src={currentStrategy.tokenLogo}
                                      alt={currentStrategy.token}
                                      width={24}
                                      height={24}
                                      className='rounded-full'
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <div className='flex flex-col'>
                                    <span className='font-medium'>
                                      {currentStrategy.token} DCA
                                    </span>
                                    <span className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                                      {currentStrategy.frequency} • $
                                      {currentStrategy.amountPerDca.toFixed(2)} USDC per run
                                    </span>
                                  </div>
                                </div>
                                <div className='flex items-center gap-2'>
                                  <button
                                    type='button'
                                    onClick={() => handleModifyStrategy(currentStrategy.id)}
                                    className='inline-flex items-center px-3 py-1 text-xs font-medium transition-colors border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-foreground hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)]'
                                  >
                                    Modify Strategy
                                  </button>
                                  <button
                                    type='button'
                                    onClick={() => handleDeleteStrategy(currentStrategy.id)}
                                    className='inline-flex items-center justify-center h-6 w-6 border border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.8)] transition-colors hover:border-red-500/50 hover:text-red-500 hover:bg-red-500/10'
                                    title='Delete strategy'
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                              
                              <div className='flex flex-col gap-2 border-t border-[hsl(var(--gray-300)/0.2)] pt-3'>
                                <div className='flex items-center justify-between text-xs'>
                                  <span className='text-[hsl(var(--gray-300)/0.7)]'>Available USDC</span>
                                  <span className='font-medium'>${currentStrategy.availableUsdc.toFixed(2)}</span>
                                </div>
                                <div className='flex items-center justify-between text-xs'>
                                  <span className='text-[hsl(var(--gray-300)/0.7)]'>
                                    Available {currentStrategy.token}
                                  </span>
                                  <span className='font-medium'>
                                    {currentStrategy.tokenBalance.toFixed(2)} {currentStrategy.token}
                                  </span>
                                </div>
                                
                                {currentStrategy.takeProfitPct !== undefined && (
                                  <div className='flex items-center justify-between text-xs'>
                                    <span className='text-[hsl(var(--gray-300)/0.7)]'>Take-profit</span>
                                    <span className='font-medium'>{currentStrategy.takeProfitPct.toFixed(1)}%</span>
                                  </div>
                                )}
                                
                                {currentStrategy.lastExecutedTsMillis && parseFloat(currentStrategy.lastExecutedTsMillis) > 0 && (
                                  <div className='flex items-center justify-between text-xs'>
                                    <span className='text-[hsl(var(--gray-300)/0.7)]'>Last DCA</span>
                                    <span className='font-medium'>
                                      {(() => {
                                        const timestamp = parseFloat(currentStrategy.lastExecutedTsMillis);
                                        const date = new Date(timestamp);
                                        const now = new Date();
                                        const diffMs = now.getTime() - date.getTime();
                                        const diffMins = Math.floor(diffMs / 60000);
                                        const diffHours = Math.floor(diffMs / 3600000);
                                        const diffDays = Math.floor(diffMs / 86400000);
                                        
                                        if (diffMins < 1) {
                                          return 'Just now';
                                        } else if (diffMins < 60) {
                                          return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
                                        } else if (diffHours < 24) {
                                          return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
                                        } else if (diffDays < 7) {
                                          return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
                                        } else {
                                          return date.toLocaleDateString('en-US', { 
                                            month: 'short', 
                                            day: 'numeric',
                                            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                                          });
                                        }
                                      })()}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className='flex flex-wrap gap-2'>
                                <button
                                  type='button'
                                  onClick={() => handleDeposit(currentStrategy.id)}
                                  className='flex-1 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)]'
                                >
                                  Deposit
                                </button>
                                <button
                                  type='button'
                                  onClick={() => handleWithdraw(currentStrategy.id, 'usdc')}
                                  disabled={currentStrategy.availableUsdc === 0}
                                  className='flex-1 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[hsl(var(--gray-300)/0.2)] disabled:hover:bg-[hsl(var(--background))]'
                                >
                                  Withdraw USDC
                                </button>
                                <button
                                  type='button'
                                  onClick={() => handleWithdraw(currentStrategy.id, 'token')}
                                  disabled={currentStrategy.tokenBalance === 0}
                                  className='flex-1 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[hsl(var(--gray-300)/0.2)] disabled:hover:bg-[hsl(var(--background))]'
                                >
                                  Withdraw {currentStrategy.token}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </section>

        <section className='relative mt-8 border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-6 shadow-sm'>
          <div className='pointer-events-none absolute top-0 right-8 z-10 -translate-y-1/2'>
            <Image
              src='/assets/img/slothyoga.png'
              alt='DCAi sloth yoga'
              width={180}
              height={180}
              className='object-contain w-[90px] h-[90px] md:w-[180px] md:h-[180px]'
            />
          </div>

          <h2 className='mb-4 text-sm font-semibold tracking-tight'>
            Latest DCAi Activity
          </h2>
          <div className='flex flex-col gap-3'>
            {activities.length === 0 ? (
              <p className='text-sm text-[hsl(var(--gray-300)/0.7)]'>
                No activity yet. Your DCAi transactions will appear here.
              </p>
            ) : (
              <>
                {/* Calculate pagination */}
                {(() => {
                  const totalPages = Math.ceil(activities.length / itemsPerPage);
                  const startIndex = (currentActivityPage - 1) * itemsPerPage;
                  const endIndex = startIndex + itemsPerPage;
                  const currentActivities = activities.slice(startIndex, endIndex);

                  // Format timestamp to human-readable
                  const formatTimeAgo = (timestamp: number) => {
                    const now = Date.now();
                    const diffMs = now - timestamp;
                    const diffMins = Math.floor(diffMs / 60000);
                    const diffHours = Math.floor(diffMs / 3600000);
                    const diffDays = Math.floor(diffMs / 86400000);
                    
                    if (diffMins < 1) {
                      return 'Just now';
                    } else if (diffMins < 60) {
                      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
                    } else if (diffHours < 24) {
                      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
                    } else if (diffDays < 7) {
                      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
                    } else {
                      const date = new Date(timestamp);
                      return date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                      });
                    }
                  };

                  return (
                    <>
                      {/* Activity items */}
                      <div className='flex flex-col gap-3'>
                        {currentActivities.map((activity, index) => {
                          const isLast = index === currentActivities.length - 1;

                          return (
                            <div
                              key={`${activity.type}-${activity.timestamp}-${startIndex + index}`}
                              className={`flex items-center gap-3 ${!isLast ? 'border-b border-[hsl(var(--gray-300)/0.1)] pb-3' : ''} text-sm`}
                            >
                              <div className='flex h-8 w-8 items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] text-[hsl(var(--gray-300)/0.9)]'>
                                <span className='text-xs'>{activity.icon}</span>
                              </div>
                              <div className='flex-1'>
                                <p className='font-medium'>{activity.title}</p>
                                <p className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                                  {activity.description} • {formatTimeAgo(activity.timestamp)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination controls */}
                      {totalPages > 1 && (
                        <div className='flex items-center justify-between pt-3 border-t border-[hsl(var(--gray-300)/0.1)]'>
                          <button
                            type='button'
                            onClick={() => setCurrentActivityPage(prev => Math.max(1, prev - 1))}
                            disabled={currentActivityPage === 1}
                            className='inline-flex items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[hsl(var(--gray-300)/0.2)] disabled:hover:bg-[hsl(var(--background))]'
                          >
                            Previous
                          </button>
                          <span className='text-xs text-[hsl(var(--gray-300)/0.7)]'>
                            Page {currentActivityPage} of {totalPages}
                          </span>
                          <button
                            type='button'
                            onClick={() => setCurrentActivityPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentActivityPage === totalPages}
                            className='inline-flex items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[hsl(var(--gray-300)/0.2)] disabled:hover:bg-[hsl(var(--background))]'
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </section>
      </div>

      {/* Withdraw Modal */}
      {withdrawModal.isOpen && withdrawModal.strategyId && withdrawModal.asset && (() => {
        const strategy = strategies.find(s => s.id === withdrawModal.strategyId);
        if (!strategy) return null;

        const amount = parseFloat(withdrawModal.amount);
        const isValid = !isNaN(amount) && amount > 0;
        
        // Get the balance for the selected asset
        const balance = withdrawModal.asset === 'usdc' ? strategy.availableUsdc : strategy.tokenBalance;
        const assetName = withdrawModal.asset === 'usdc' ? 'USDC' : strategy.token;
        const maxAmount = balance;
        const isValidAmount = isValid && amount <= maxAmount;

        return (
          <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
            onClick={handleWithdrawCancel}
          >
            <div
              className='border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] p-6 shadow-lg w-full max-w-md mx-4'
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className='text-sm font-semibold tracking-tight mb-1'>
                Withdraw {assetName}
              </h2>
              <p className='text-xs text-[hsl(var(--gray-300)/0.7)] mb-4'>
                Enter {assetName} amount to withdraw from {strategy.token} DCA strategy
              </p>

              <div className='flex flex-col gap-2 mb-4'>
                <div className='flex items-center justify-between text-xs text-[hsl(var(--gray-300)/0.7)]'>
                  <span>Available balance:</span>
                  <span className='font-medium'>{balance.toFixed(2)} {assetName}</span>
                </div>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  max={maxAmount.toFixed(2)}
                  value={withdrawModal.amount}
                  onChange={(e) => setWithdrawModal({ ...withdrawModal, amount: e.target.value })}
                  className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                  placeholder='0.00'
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isValidAmount) {
                      handleWithdrawSubmit();
                    } else if (e.key === 'Escape') {
                      handleWithdrawCancel();
                    }
                  }}
                />
                {withdrawModal.amount && !isValidAmount && (
                  <p className='text-xs text-red-500'>
                    {!isValid 
                      ? 'Please enter a valid amount greater than 0'
                      : `Amount cannot exceed available balance of ${maxAmount.toFixed(2)} ${assetName}`
                    }
                  </p>
                )}
              </div>

              <div className='flex gap-3 justify-end'>
                <button
                  type='button'
                  onClick={handleWithdrawCancel}
                  className='inline-flex items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)]'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleWithdrawSubmit}
                  disabled={!isValidAmount}
                  className='inline-flex items-center justify-center bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Deposit Modal */}
      {depositModal.isOpen && depositModal.strategyId && (() => {
        const strategy = strategies.find(s => s.id === depositModal.strategyId);
        if (!strategy) return null;

        const amount = parseFloat(depositModal.amount);
        const isValid = !isNaN(amount) && amount > 0;

        return (
          <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
            onClick={handleDepositCancel}
          >
            <div
              className='border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] p-6 shadow-lg w-full max-w-md mx-4'
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className='text-sm font-semibold tracking-tight mb-1'>
                Deposit USDC
              </h2>
              <p className='text-xs text-[hsl(var(--gray-300)/0.7)] mb-4'>
                Enter USDC amount to deposit for {strategy.token} DCA strategy
              </p>

              <div className='flex flex-col gap-2 mb-4'>
                <div className='flex items-center justify-between text-xs text-[hsl(var(--gray-300)/0.7)]'>
                  <span>Wallet balance:</span>
                  <span className='font-medium'>{usdcWalletBalance.toFixed(2)} USDC</span>
                </div>
              </div>

              <div className='flex flex-col gap-2 mb-6'>
                <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
                  Amount (USDC)
                </label>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={depositModal.amount}
                  onChange={(e) => setDepositModal({ ...depositModal, amount: e.target.value })}
                  className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                  placeholder='0.00'
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isValid) {
                      handleDepositSubmit();
                    } else if (e.key === 'Escape') {
                      handleDepositCancel();
                    }
                  }}
                />
                {depositModal.amount && !isValid && (
                  <p className='text-xs text-red-500'>
                    Please enter a valid amount greater than 0
                  </p>
                )}
              </div>

              <div className='flex gap-3 justify-end'>
                <button
                  type='button'
                  onClick={handleDepositCancel}
                  className='inline-flex items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)]'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleDepositSubmit}
                  disabled={!isValid}
                  className='inline-flex items-center justify-center bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Deposit
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modify Strategy Modal */}
      {modifyModal.isOpen && modifyModal.strategyId && (() => {
        const strategy = strategies.find(s => s.id === modifyModal.strategyId);
        if (!strategy) return null;

        // Find the setup for this strategy's token to get allowed frequencies
        const strategySetup = setups?.find(s => {
          const setupTicker = s.dcaToken.split('-')[0];
          return setupTicker === strategy.token;
        });

        const amountPerDca = parseFloat(modifyModal.amountPerDca);
        const isValidAmount = !isNaN(amountPerDca) && amountPerDca > 0;
        
        // Get minimum amount from setup
        const minAmount = strategySetup ? parseFloat(strategySetup.minAmountPerSwap) : 0;
        const isValidAmountWithMin = isValidAmount && amountPerDca >= minAmount;

        const takeProfitPct = modifyModal.showTakeProfit && modifyModal.takeProfitPct 
          ? parseFloat(modifyModal.takeProfitPct) 
          : 0;
        const isValidTakeProfit = !modifyModal.showTakeProfit || (takeProfitPct >= 0 && takeProfitPct <= 100);

        const isValid = isValidAmountWithMin && isValidTakeProfit && modifyModal.frequency;

        return (
          <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
            onClick={handleModifyStrategyCancel}
          >
            <div
              className='border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] p-6 shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto'
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className='text-sm font-semibold tracking-tight mb-1'>
                Modify Strategy
              </h2>
              <p className='text-xs text-[hsl(var(--gray-300)/0.7)] mb-4'>
                Update your {strategy.token} DCA strategy settings
              </p>

              <div className='flex flex-col gap-4'>
                {/* Frequency */}
                <div className='flex flex-col gap-1'>
                  <div className='flex items-center gap-1'>
                    <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
                      Frequency
                    </label>
                    <button
                      type='button'
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFrequencyInfo(!showFrequencyInfo);
                      }}
                      className='relative flex items-center justify-center h-4 w-4 text-[hsl(var(--gray-300)/0.6)] hover:text-[hsl(var(--sky-300))] transition-colors'
                      title='DCAi LLM Information'
                    >
                      <span className='text-xs'>ℹ</span>
                      {showFrequencyInfo && (
                        <>
                          <div
                            className='fixed inset-0 z-40'
                            onClick={() => setShowFrequencyInfo(false)}
                          />
                          <div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 text-xs bg-[hsl(var(--background))] border border-[hsl(var(--gray-300)/0.2)] shadow-lg z-50 rounded'>
                            <p className='text-[hsl(var(--gray-300)/0.9)]'>
                              DCAi LLM works only with <strong>Daily</strong> or <strong>Weekly</strong> frequency. These frequencies are marked with &quot;(DCAi Activated)&quot; in the dropdown.
                            </p>
                            <div className='absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-[hsl(var(--background))] border-r border-b border-[hsl(var(--gray-300)/0.2)] rotate-45'></div>
                          </div>
                        </>
                      )}
                    </button>
                  </div>
                  {(() => {
                    const frequencies = strategySetup && strategySetup.allowedFrequencies && strategySetup.allowedFrequencies.length > 0
                      ? strategySetup.allowedFrequencies.map(freq => freq.frequency)
                      : ['hourly', 'daily', 'weekly', 'monthly'];
                    
                    // Get display name for frequency
                    const getFrequencyDisplayName = (freq: string) => {
                      const freqName = freq.toLowerCase();
                      if (freqName === 'daily' || freqName === 'weekly') {
                        return `${freq} (DCAi Activated)`;
                      }
                      // Capitalize first letter
                      return freq.charAt(0).toUpperCase() + freq.slice(1);
                    };
                    
                    // Get current frequency display name
                    const currentFrequencyDisplay = modifyModal.frequency ? getFrequencyDisplayName(modifyModal.frequency) : 'Select frequency';
                    
                    return (
                      <div className='relative'>
                        <button
                          type='button'
                          onClick={() => setIsModifyFrequencyDropdownOpen(!isModifyFrequencyDropdownOpen)}
                          className='flex h-9 w-full items-center gap-2 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-left text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                        >
                          <span className='flex-1'>{currentFrequencyDisplay}</span>
                          <span className='text-[hsl(var(--gray-300)/0.6)]'>▼</span>
                        </button>
                        
                        {isModifyFrequencyDropdownOpen && (
                          <>
                            <div
                              className='fixed inset-0 z-40'
                              onClick={() => setIsModifyFrequencyDropdownOpen(false)}
                            />
                            <div className='absolute z-50 mt-1 max-h-60 w-full overflow-auto border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] shadow-lg'>
                              {frequencies.map((freq) => {
                                const isSelected = modifyModal.frequency === freq;
                                const displayName = getFrequencyDisplayName(freq);
                                return (
                                  <button
                                    key={freq}
                                    type='button'
                                    onClick={() => {
                                      setModifyModal({ ...modifyModal, frequency: freq });
                                      setIsModifyFrequencyDropdownOpen(false);
                                    }}
                                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[hsl(var(--gray-300)/0.1)] ${
                                      isSelected ? 'bg-[hsl(var(--sky-300)/0.2)]' : ''
                                    }`}
                                  >
                                    <span className='flex-1'>
                                      {isSelected && <span className='text-[hsl(var(--sky-300))]'>✓ </span>}
                                      {displayName}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Amount per DCA */}
                <div className='flex flex-col gap-1'>
                  <label className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
                    USDC per DCA
                    {minAmount > 0 && (
                      <span className='text-[hsl(var(--gray-300)/0.6)] ml-1'>
                        (Min: {minAmount.toFixed(2)} USDC)
                      </span>
                    )}
                  </label>
                  <input
                    type='number'
                    min={minAmount.toFixed(2)}
                    step='0.01'
                    value={modifyModal.amountPerDca}
                    onChange={(e) => setModifyModal({ ...modifyModal, amountPerDca: e.target.value })}
                    className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                    placeholder='0.00'
                  />
                  {modifyModal.amountPerDca && !isValidAmountWithMin && (
                    <p className='text-xs text-red-500'>
                      {!isValidAmount 
                        ? 'Please enter a valid amount greater than 0'
                        : `Amount must be at least ${minAmount.toFixed(2)} USDC`
                      }
                    </p>
                  )}
                </div>

                {/* Take Profit */}
                <div className='flex flex-col gap-2'>
                  <button
                    type='button'
                    onClick={() => setModifyModal({ ...modifyModal, showTakeProfit: !modifyModal.showTakeProfit })}
                    className='flex items-center justify-between border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] p-3 text-left text-sm transition-colors hover:border-[hsl(var(--sky-300)/0.3)]'
                  >
                    <span className='text-xs font-medium text-[hsl(var(--gray-300)/0.8)]'>
                      Take-profit % (Optional)
                    </span>
                    <span className='text-[hsl(var(--sky-300))]'>
                      {modifyModal.showTakeProfit ? '−' : '+'}
                    </span>
                  </button>
                  
                  {modifyModal.showTakeProfit && (
                    <div className='flex flex-col gap-1 border-2 border-[hsl(var(--gray-300)/0.3)] bg-[hsl(var(--background))] p-3'>
                      <input
                        type='number'
                        min='0'
                        max='100'
                        step='0.1'
                        value={modifyModal.takeProfitPct}
                        onChange={(e) => setModifyModal({ ...modifyModal, takeProfitPct: e.target.value })}
                        className='h-9 border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-2 text-sm outline-none focus-visible:border-[hsl(var(--sky-300)/0.5)] focus-visible:ring-1 focus-visible:ring-[hsl(var(--sky-300)/0.3)]'
                        placeholder='15'
                      />
                      {modifyModal.takeProfitPct && !isValidTakeProfit && (
                        <p className='text-xs text-red-500'>
                          Take profit must be between 0 and 100
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className='flex gap-3 justify-end mt-6'>
                <button
                  type='button'
                  onClick={handleModifyStrategyCancel}
                  className='inline-flex items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)]'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleModifyStrategySubmit}
                  disabled={!isValid}
                  className='inline-flex items-center justify-center bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  Modify Strategy
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && deleteModal.strategyId && (() => {
        const strategy = strategies.find(s => s.id === deleteModal.strategyId);
        if (!strategy) return null;

        return (
          <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
            onClick={handleDeleteCancel}
          >
            <div
              className='border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] p-6 shadow-lg w-full max-w-md mx-4'
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className='text-sm font-semibold tracking-tight mb-1'>
                Delete Strategy
              </h2>
              <p className='text-xs text-[hsl(var(--gray-300)/0.7)] mb-4'>
                Are you sure you want to delete your {strategy.token} DCA strategy? This action cannot be undone.
              </p>

              <div className='flex gap-3 justify-end'>
                <button
                  type='button'
                  onClick={handleDeleteCancel}
                  className='inline-flex items-center justify-center border border-[hsl(var(--gray-300)/0.2)] bg-[hsl(var(--background))] px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-[hsl(var(--sky-300)/0.5)] hover:bg-[hsl(var(--gray-300)/0.05)]'
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={handleDeleteConfirm}
                  className='inline-flex items-center justify-center bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700'
                >
                  Delete Strategy
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

