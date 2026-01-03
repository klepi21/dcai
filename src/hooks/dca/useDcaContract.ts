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

export interface Swap {
  usdcAmount: string; // BigUint (in USDC smallest units)
  dcaTokenAmount: string; // BigUint (in token smallest units)
  timestampMillis: string; // u64
}

export interface StrategyTokenAttributes {
  amountPerSwap: string; // BigUint (in USDC smallest units)
  dcaFrequency: string; // bytes (frequency name)
  frequencyInMillis: string; // u64
  takeProfitPercentage: string; // u64
  usdcBalance: string; // BigUint (in USDC smallest units)
  tokenBalance: string; // BigUint (in token smallest units)
  lastExecutedTsMillis: string; // u64
  buys: Swap[]; // List<Swap>
  sells: Swap[]; // List<Swap>
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
          // Check if the current item is the start of a new entry (Address)
          // Address is 32 bytes = 64 hex characters
          const currentItem = returnData[i];
          const currentItemHex = currentItem ? base64ToHex(currentItem) : '';

          if (currentItemHex.length === 64) {
            // Found a new address, stop parsing frequencies for this entry
            break;
          }

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

          if (looksLikeFrequency && looksLikeDuration) {
            // This looks like a frequency pair
            allowedFrequencies.push({
              frequency: potentialFreq,
              duration: potentialDuration
            });
          }

          // Move to next pair regardless. 
          // If it was valid, we consumed it. 
          // If it was invalid (e.g. empty name), we skip it and try the next pair.
          // Unless we hit an Address (checked at top of loop), we assume it's part of the frequency list (or garbage to skip).
          i += 2;
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

      if (!returnData || returnData.length < 11) {
        throw new Error('Invalid response: insufficient data returned (expected 11 values)');
      }

      // Parse the response according to ABI
      // Returns: [u64, BigUint, bytes, u64, u64, BigUint, BigUint, u64, List<Swap>, List<Swap>]
      // 0: u64 (nonce - can be ignored, we already have it)
      // 1: amount_per_swap (BigUint)
      // 2: dca_frequency (bytes)
      // 3: frequency_in_millis (u64)
      // 4: take_profit_percentage (u64)
      // 5: usdc_balance (BigUint)
      // 6: dca_token_balance (BigUint)
      // 7: last_executed_ts_millis (u64)
      // 8: is_in_profit (bool - new return value)
      // 9: List<Swap> (buys)
      // 10: List<Swap> (sells)

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

      const dcaTokenBalanceHex = returnData[6] ? base64ToHex(returnData[6]) : '0';
      const dcaTokenBalance = hexToDecimal(dcaTokenBalanceHex);

      const lastExecutedTsMillisHex = returnData[7] ? base64ToHex(returnData[7]) : '0';
      const lastExecutedTsMillis = hexToDecimal(lastExecutedTsMillisHex);

      // Helper function to parse List<Swap>
      // According to MultiversX ABI, List<Swap> is encoded as a single base64 string
      // The encoding format: [4-byte usdc_length (u32, big-endian)] + [usdc_bytes] + [4-byte token_length (u32, big-endian)] + [token_bytes] + [8-byte timestamp (u64, big-endian)]
      // Note: Both usdc_length and token_length are u32 (4 bytes), NOT 1 byte!
      const parseSwapList = (listData: any, listName: string): Swap[] => {
        const swaps: Swap[] = [];

        if (!listData || (typeof listData === 'string' && listData === '')) {
          return swaps;
        }

        try {
          // MultiversX returns List<Swap> as a single base64-encoded string
          if (typeof listData !== 'string') {
            return swaps;
          }

          // Decode base64 to bytes
          const bytes = Uint8Array.from(Buffer.from(listData, 'base64'));

          if (bytes.length < 4) {
            return swaps;
          }

          // Parse multiple Swap structs until we reach the end
          // Each Swap: [4-byte usdc_length] + [usdc_bytes] + [4-byte token_length] + [token_bytes] + [8-byte timestamp]
          let offset = 0;

          while (offset < bytes.length) {
            // Check if we have enough bytes for usdc_length (4 bytes)
            if (offset + 4 > bytes.length) {
              break;
            }

            // Read usdc_length (u32, big-endian)
            const usdcLength = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
            offset += 4;

            if (usdcLength === 0) {
              // Zero length means we're done or there's an issue
              break;
            }

            // Check if we have enough bytes for usdc_amount
            if (offset + usdcLength > bytes.length) {
              break;
            }

            // Read usdc_amount (BigUint)
            const usdcBytes = bytes.slice(offset, offset + usdcLength);
            const usdcHex = Array.from(usdcBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            const usdcHexTrimmed = usdcHex.replace(/^0+/, '') || '0';
            const usdcAmount = hexToDecimal(usdcHexTrimmed || '0');
            offset += usdcLength;

            // Check if we have enough bytes for token_length (4 bytes)
            if (offset + 4 > bytes.length) {
              break;
            }

            // Read token_length (u32, big-endian)
            const tokenLength = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
            offset += 4;

            let dcaTokenAmount: string;
            if (tokenLength === 0) {
              // Zero-length means value is 0
              dcaTokenAmount = '0';
            } else {
              // Check if we have enough bytes for token_amount
              if (offset + tokenLength > bytes.length) {
                break;
              }
              const tokenBytes = bytes.slice(offset, offset + tokenLength);
              const tokenHex = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');
              const tokenHexTrimmed = tokenHex.replace(/^0+/, '') || '0';
              dcaTokenAmount = hexToDecimal(tokenHexTrimmed || '0');
              offset += tokenLength;
            }

            // Check if we have enough bytes for timestamp (8 bytes)
            if (offset + 8 > bytes.length) {
              break;
            }

            // Read timestamp as big-endian u64
            let timestamp = BigInt(0);
            const timestampBytes = bytes.slice(offset, offset + 8);

            // Read the bytes (most significant bytes first, big-endian)
            for (let j = 0; j < 8; j++) {
              timestamp = (timestamp << BigInt(8)) | BigInt(timestampBytes[j]);
            }

            const timestampMillis = timestamp.toString();
            offset += 8;

            const swap: Swap = {
              usdcAmount: usdcAmount || '0',
              dcaTokenAmount: dcaTokenAmount || '0',
              timestampMillis
            };
            swaps.push(swap);
          }

        } catch (error) {
          // Return what we've parsed so far, even if there was an error
        }

        return swaps;
      };


      // Parse List<Swap> for buys (index 9)
      const buys = parseSwapList(returnData[9], 'buys');

      // Parse List<Swap> for sells (index 10)
      const sells = parseSwapList(returnData[10], 'sells');

      const attributes = {
        amountPerSwap,
        dcaFrequency,
        frequencyInMillis,
        takeProfitPercentage,
        usdcBalance,
        tokenBalance: dcaTokenBalance, // Keep tokenBalance for backward compatibility
        lastExecutedTsMillis,
        buys,
        sells
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

