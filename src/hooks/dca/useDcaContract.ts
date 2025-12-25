'use client';
import { useState, useEffect } from 'react';
import { useGetNetworkConfig, Address } from '@/lib';

// Parent DCA Contract address
const PARENT_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqlvf9wdk30sq9j7h8r3tj2zmjzlpy8dm8u7zs4qhued';

// Individual DCA Contract address (for querying strategy attributes)
const DCA_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq85r6zsrnvd8jqhl8dpuk3j06s2dqpq33u7zskhn3f9';

export interface DcaSetup {
  address: string; // Address (DCA contract address)
  dcaToken: string; // EgldOrEsdtTokenIdentifier
  minAmountPerSwap: string; // BigUint (as string, in hex)
  strategyToken: string; // TokenIdentifier
  allowedFrequencies: Array<{ frequency: string; duration: string }>; // variadic<multi<bytes,u64>>
}

// Helper function to decode base64 to string
const base64ToString = (base64: string): string => {
  try {
    return Buffer.from(base64, 'base64').toString('utf-8').replace(/\0/g, '');
  } catch {
    return '';
  }
};

// Helper function to decode base64 hex to number string
const base64ToHex = (base64: string): string => {
  try {
    const bytes = Buffer.from(base64, 'base64');
    return bytes.toString('hex');
  } catch {
    return '0';
  }
};

// Helper function to convert hex to decimal (for BigUint)
const hexToDecimal = (hex: string): string => {
  try {
    if (!hex || hex === '0') return '0';
    return BigInt('0x' + hex).toString();
  } catch {
    return '0';
  }
};

// Helper function to encode u64 to hex string for contract arguments
// MultiversX Gateway API expects minimal hex representation (e.g., nonce 1 = "01")
const encodeU64 = (value: number | string): string => {
  try {
    const num = typeof value === 'string' ? BigInt(value) : BigInt(value);
    // Convert to minimal hex representation (no padding)
    // e.g., 1 -> "01", 10 -> "0a", 255 -> "ff"
    return num.toString(16).padStart(2, '0');
  } catch {
    return '';
  }
};

export interface StrategyTokenAttributes {
  amountPerSwap: string; // BigUint (in USDC smallest units)
  dcaFrequency: string; // bytes (frequency name)
  frequencyInMillis: string; // u64
  takeProfitPercentage: string; // u64
  usdcBalance: string; // BigUint (in USDC smallest units)
  tokenBalance: string; // BigUint (in token smallest units)
  lastExecutedTsMillis: string; // u64
}

export const useDcaContract = () => {
  const { network } = useGetNetworkConfig();
  const [setup, setSetup] = useState<DcaSetup | null>(null);
  const [setups, setSetups] = useState<DcaSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryGetDcaContracts = async (): Promise<DcaSetup[]> => {
    try {
      setLoading(true);
      setError(null);

      // Determine Gateway URL based on network
      let gatewayUrl = 'https://devnet-gateway.multiversx.com';
      if (network.apiAddress) {
        if (network.apiAddress.includes('devnet')) {
          gatewayUrl = 'https://devnet-gateway.multiversx.com';
        } else if (network.apiAddress.includes('testnet')) {
          gatewayUrl = 'https://testnet-gateway.multiversx.com';
        } else {
          gatewayUrl = 'https://gateway.multiversx.com';
        }
      }
      
      const queryUrl = `${gatewayUrl}/vm-values/query`;
      
      const requestBody = {
        scAddress: PARENT_CONTRACT_ADDRESS,
        funcName: 'getDcaContracts',
        args: []
      };
      
      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to query contract: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Check for errors in the response
      const responseData = data.data?.data;
      if (responseData) {
        if (responseData.returnCode && responseData.returnCode !== 'ok') {
          const errorMsg = responseData.returnMessage || responseData.returnCode;
          throw new Error(`Contract query error: ${errorMsg}`);
        }
      }
      
      // The response structure is: data.data.returnData
      const returnData = data.data?.data?.returnData;
      
      if (!returnData || returnData.length === 0) {
        const errorMsg = responseData?.returnMessage || responseData?.returnCode || 'No data returned';
        throw new Error(`Contract query failed: ${errorMsg}`);
      }

      // Parse the variadic multi-result
      // getDcaContracts returns: variadic<multi<Address,EgldOrEsdtTokenIdentifier,BigUint,TokenIdentifier,variadic<multi<bytes,u64>>>>
      // This means we have multiple entries, each with:
      // - Address (DCA contract address)
      // - EgldOrEsdtTokenIdentifier (dcaToken)
      // - BigUint (minAmountPerSwap)
      // - TokenIdentifier (strategyToken)
      // - variadic<multi<bytes,u64>> (allowedFrequencies - variable number of pairs)
      
      const setupsList: DcaSetup[] = [];
      let i = 0;
      
      while (i < returnData.length) {
        // Parse each DCA contract entry
        // Entry structure: address, dcaToken, minAmountPerSwap, strategyToken, freq1_name, freq1_duration, freq2_name, freq2_duration, ...
        
        // 1. Address (Address - DCA contract address)
        const addressBase64 = returnData[i];
        const addressHex = addressBase64 ? base64ToHex(addressBase64) : '';
        // Convert hex address to bech32 format (erd1...)
        let addressBech32 = addressHex;
        try {
          if (addressHex && addressHex.length === 64) {
            // Create Address from hex string and convert to bech32
            const addressBytes = Uint8Array.from(Buffer.from(addressHex, 'hex'));
            const address = new Address(addressBytes);
            addressBech32 = address.toBech32();
          }
        } catch (error) {
          // Conversion failed, keep hex
        }
        i++;
        
        if (i >= returnData.length) break;
        
        // 2. DcaToken (EgldOrEsdtTokenIdentifier)
        const dcaTokenBase64 = returnData[i];
        const dcaToken = dcaTokenBase64 ? base64ToString(dcaTokenBase64) : 'EGLD';
        i++;
        
        if (i >= returnData.length) break;
        
        // 3. MinAmountPerSwap (BigUint)
        const minAmountBase64 = returnData[i];
        const minAmountHex = minAmountBase64 ? base64ToHex(minAmountBase64) : '0';
        const minAmountRaw = hexToDecimal(minAmountHex);
        const usdcDecimals = 1000000; // 10^6
        const minAmountUsdc = parseFloat(minAmountRaw) / usdcDecimals;
        const minAmountPerSwap = minAmountUsdc > 0 ? minAmountUsdc.toFixed(2) : '0.00';
        i++;
        
        if (i >= returnData.length) break;
        
        // 4. StrategyToken (TokenIdentifier)
        const strategyTokenBase64 = returnData[i];
        const strategyToken = strategyTokenBase64 ? base64ToString(strategyTokenBase64) : '';
        i++;
        
        // 5. AllowedFrequencies (variadic<multi<bytes,u64>>)
        // This is a variable number of pairs, so we need to parse until we hit the next entry
        // The next entry starts with an Address (32 bytes, 64 hex chars)
        // Strategy: Parse frequency pairs, checking if the next value after a pair looks like an Address
        const allowedFrequencies: Array<{ frequency: string; duration: string }> = [];
        
        while (i + 1 < returnData.length) {
          const freqBase64 = returnData[i];
          const durationBase64 = returnData[i + 1];
          const potentialFreq = freqBase64 ? base64ToString(freqBase64) : '';
          const potentialDurationHex = durationBase64 ? base64ToHex(durationBase64) : '0';
          const potentialDuration = hexToDecimal(potentialDurationHex);
          
          // Check if this looks like a frequency pair
          // Frequency names are typically short strings without hyphens
          // Token identifiers are "EGLD" or contain hyphens like "WEGLD-d7c6bb"
          const looksLikeFrequency = potentialFreq && 
            potentialFreq.length > 0 && 
            potentialFreq.length < 100 &&
            potentialFreq !== 'EGLD' &&
            !potentialFreq.match(/^[A-Z0-9]+-[a-f0-9]+$/i); // Not a token identifier pattern
          
          const looksLikeDuration = potentialDuration && 
            parseFloat(potentialDuration) > 0 && 
            parseFloat(potentialDuration) < 1000000000000000; // Reasonable duration in milliseconds
          
          // Check if the value after this pair looks like an Address (start of next entry)
          // Address is 32 bytes, so when base64 decoded and converted to hex, it should be 64 hex characters
          let looksLikeNextEntry = false;
          if (i + 2 < returnData.length) {
            const nextPotentialAddress = returnData[i + 2];
            const nextAddressHex = nextPotentialAddress ? base64ToHex(nextPotentialAddress) : '';
            // Address is 32 bytes = 64 hex characters
            // If the next value is 64 hex chars, it's likely an Address (start of next entry)
            if (nextAddressHex.length === 64) {
              looksLikeNextEntry = true;
            }
          }
          
          if (looksLikeFrequency && looksLikeDuration && !looksLikeNextEntry) {
            // This looks like a frequency pair
            allowedFrequencies.push({
              frequency: potentialFreq,
              duration: potentialDuration
            });
            i += 2;
          } else if (looksLikeFrequency && looksLikeDuration) {
            // Even if it might be followed by a new entry, if it looks like a frequency, include it
            // (it could be the last frequency of this entry)
            allowedFrequencies.push({
              frequency: potentialFreq,
              duration: potentialDuration
            });
            i += 2;
            // If the next value looks like an Address, we've reached the end of frequencies
            if (i < returnData.length) {
              const nextValue = returnData[i];
              const nextValueHex = nextValue ? base64ToHex(nextValue) : '';
              if (nextValueHex.length === 64) {
                break; // Next entry starts here
              }
            }
          } else {
            // This doesn't look like a frequency pair, might be start of next entry
            break;
          }
        }
        
        const parsedEntry = {
          address: addressBech32, // Store as bech32 format (erd1...)
          dcaToken: dcaToken || 'EGLD',
          minAmountPerSwap,
          strategyToken,
          allowedFrequencies
        };
        
        setupsList.push(parsedEntry);
      }
      
      // Set the first setup as the default for backward compatibility
      if (setupsList.length > 0) {
        setSetup(setupsList[0]);
      }
      setSetups(setupsList);
      return setupsList;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to query contract';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const queryGetStrategyTokenAttributes = async (
    nonce: number,
    contractAddress: string, // Contract address from token.owner field
    tokenInfo?: { identifier?: string; collection?: string; ticker?: string; decimals?: number }
  ): Promise<StrategyTokenAttributes | null> => {
    try {
      // Determine Gateway URL based on network
      let gatewayUrl = 'https://devnet-gateway.multiversx.com';
      if (network.apiAddress) {
        if (network.apiAddress.includes('devnet')) {
          gatewayUrl = 'https://devnet-gateway.multiversx.com';
        } else if (network.apiAddress.includes('testnet')) {
          gatewayUrl = 'https://testnet-gateway.multiversx.com';
        } else {
          gatewayUrl = 'https://gateway.multiversx.com';
        }
      }

      const queryUrl = `${gatewayUrl}/vm-values/query`;
      
      // Encode nonce as u64 (hex)
      const nonceArg = encodeU64(nonce);
      
      const requestBody = {
        scAddress: contractAddress, // Use the owner address from the token (the contract that owns this strategy)
        funcName: 'getStrategyTokenAttributes',
        args: [nonceArg]
      };

      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to query strategy attributes: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      const responseData = data.data?.data;
      if (responseData) {
        if (responseData.returnCode && responseData.returnCode !== 'ok') {
          const errorMsg = responseData.returnMessage || responseData.returnCode;
          throw new Error(`Contract query error: ${errorMsg}`);
        }
      }
      
      const returnData = data.data?.data?.returnData;
      
      if (!returnData || returnData.length < 8) {
        throw new Error('Invalid response: insufficient data returned (expected 8 values)');
      }

      // Parse the response
      // Returns: [u64, BigUint, bytes, u64, u64, BigUint, BigUint, u64]
      // 0: u64 (nonce - can be ignored, we already have it)
      // 1: amount_per_swap (BigUint)
      // 2: dca_frequency (bytes)
      // 3: frequency_in_millis (u64)
      // 4: take_profit_percentage (u64)
      // 5: usdc_balance (BigUint)
      // 6: token_balance (BigUint)
      // 7: last_executed_ts_millis (u64)

      if (!returnData || returnData.length < 8) {
        throw new Error('Invalid response: insufficient data returned (expected 8 values)');
      }

      // Skip index 0 (nonce u64) and start from index 1
      const amountPerSwapHex = returnData[1] ? base64ToHex(returnData[1]) : '0';
      const amountPerSwap = hexToDecimal(amountPerSwapHex);

      const dcaFrequency = returnData[2] ? base64ToString(returnData[2]) : '';

      const frequencyInMillisHex = returnData[3] ? base64ToHex(returnData[3]) : '0';
      const frequencyInMillis = hexToDecimal(frequencyInMillisHex);

      const takeProfitPercentageHex = returnData[4] ? base64ToHex(returnData[4]) : '0';
      const takeProfitPercentage = hexToDecimal(takeProfitPercentageHex);

      const usdcBalanceHex = returnData[5] ? base64ToHex(returnData[5]) : '0';
      const usdcBalance = hexToDecimal(usdcBalanceHex);

      const tokenBalanceHex = returnData[6] ? base64ToHex(returnData[6]) : '0';
      const tokenBalance = hexToDecimal(tokenBalanceHex);

      const lastExecutedTsMillisHex = returnData[7] ? base64ToHex(returnData[7]) : '0';
      const lastExecutedTsMillis = hexToDecimal(lastExecutedTsMillisHex);

      // Convert balances to readable format (USDC has 6 decimals)
      const usdcDecimals = 1000000; // 10^6
      const usdcBalanceFormatted = parseFloat(usdcBalance) / usdcDecimals;
      const tokenBalanceFormatted = parseFloat(tokenBalance) / usdcDecimals; // Assuming same decimals for token
      const amountPerSwapFormatted = parseFloat(amountPerSwap) / usdcDecimals;

      const attributes = {
        amountPerSwap,
        dcaFrequency,
        frequencyInMillis,
        takeProfitPercentage,
        usdcBalance,
        tokenBalance,
        lastExecutedTsMillis
      };

      return attributes;
    } catch (err) {
      return null;
    }
  };

  useEffect(() => {
    queryGetDcaContracts();
  }, [network.chainId]);

  return {
    setup,
    setups,
    loading,
    error,
    refetch: queryGetDcaContracts,
    queryGetStrategyTokenAttributes,
    contractAddress: DCA_CONTRACT_ADDRESS
  };
};

