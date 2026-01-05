'use client';
import { useState, useEffect } from 'react';
import { useGetNetworkConfig, Address } from '@/lib';

// Parent DCA Contract address
const PARENT_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqpwhknfcusvvu9efccfy9c72dh7neggyru7zsv8v9rg';

// Individual DCA Contract address (for querying strategy attributes)
const DCA_CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgq85r6zsrnvd8jqhl8dpuk3j06s2dqpq33u7zskhn3f9';

export interface DcaSetup {
  address: string; // Address (DCA contract address)
  dcaToken: string; // EgldOrEsdtTokenIdentifier
  minAmountPerSwap: string; // BigUint (as string, in hex)
  strategyToken: string; // TokenIdentifier
  profitFeePercentage: string; // u64
  slippagePercentage: string; // u64
  isPaused: boolean; // bool
  admins: string[]; // variadic<Address>
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
  takeProfitConditionMet: boolean; // bool
  buys: Swap[]; // List<Swap>
  sells: Swap[]; // List<Swap>
}

export const useDcaContract = () => {
  const { network } = useGetNetworkConfig();
  const [setup, setSetup] = useState<DcaSetup | null>(null);
  const [setups, setSetups] = useState<DcaSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to determine Gateway URL
  const getGatewayUrl = () => {
    let gatewayUrl = 'https://gateway.multiversx.com';
    if (network.apiAddress) {
      if (network.apiAddress.includes('devnet')) {
        gatewayUrl = 'https://devnet-gateway.multiversx.com';
      } else if (network.apiAddress.includes('testnet')) {
        gatewayUrl = 'https://testnet-gateway.multiversx.com';
      } else {
        gatewayUrl = 'https://gateway.multiversx.com';
      }
    }
    return gatewayUrl;
  };

  /**
   * Universal parser for DcaSetup structure.
   * Can be used for both Parent (prefixed with Address) and Child (direct fields) calls.
   * @param data Flattened returnData array
   * @param offset Current index in data
   * @param includeAddress Whether the data starts with a contract Address (Parent call)
   */
  const parseDcaSetupInternal = (data: string[], offset: number, includeAddress: boolean) => {
    let i = offset;

    let addressBech32 = '';
    if (includeAddress) {
      const addressHex = base64ToHex(data[i]);
      try {
        const addressBytes = Uint8Array.from(Buffer.from(addressHex, 'hex'));
        addressBech32 = new Address(addressBytes).toBech32();
      } catch (e) {
        addressBech32 = addressHex;
      }
      i++;
    }

    if (i >= data.length) return { result: null, nextOffset: i };

    const dcaToken = base64ToString(data[i++]) || 'EGLD';
    const minAmountRaw = hexToDecimal(base64ToHex(data[i++]));
    const strategyToken = base64ToString(data[i++]);
    const profitFeePercentage = hexToDecimal(base64ToHex(data[i++]));
    const slippagePercentage = hexToDecimal(base64ToHex(data[i++]));
    const isPaused = base64ToHex(data[i++]) === '01';

    const admins: string[] = [];
    const allowedFrequencies: Array<{ frequency: string; duration: string }> = [];

    // Parse variable fields: Admins and Frequencies
    // Heuristic: Admins are 32-byte hex (64 chars). Frequencies are (string, u64).
    while (i < data.length) {
      const current = data[i];
      const hex = base64ToHex(current);

      // Check for start of NEXT contract in Parent call
      if (includeAddress && hex.length === 64) {
        // Look ahead to confirm context (DcaToken at i+1, MinAmount at i+2)
        if (i + 2 < data.length) {
          const next1 = base64ToString(data[i + 1]);
          const next2 = base64ToHex(data[i + 2]);
          const isNextToken = next1 === 'EGLD' || /^[A-Z0-9]+-[a-f0-9]{6}$/i.test(next1);
          const isNextAmount = /^[0-9a-fA-F]+$/.test(next2);
          if (isNextToken && isNextAmount) break; // Start of next contract
        }
      }

      const str = base64ToString(current);
      let isFreq = false;
      if (str.length > 0 && str.length < 50 && !/[^\x20-\x7E]/.test(str)) {
        if (i + 1 < data.length) {
          const durHex = base64ToHex(data[i + 1]);
          if (durHex.length <= 16 && /^[0-9a-fA-F]+$/.test(durHex)) isFreq = true;
        }
      }

      if (isFreq) {
        allowedFrequencies.push({
          frequency: str,
          duration: hexToDecimal(base64ToHex(data[i + 1]))
        });
        i += 2;
      } else if (hex.length === 64) {
        try {
          const bytes = Uint8Array.from(Buffer.from(hex, 'hex'));
          admins.push(new Address(bytes).toBech32());
        } catch {
          admins.push(hex);
        }
        i++;
      } else {
        i++; // Skip unknown
      }
    }

    const usdcDecimals = 1000000;
    const minAmountUsdc = parseFloat(minAmountRaw) / usdcDecimals;

    return {
      result: {
        address: addressBech32,
        dcaToken,
        minAmountPerSwap: minAmountUsdc > 0 ? minAmountUsdc.toFixed(2) : '0.00',
        strategyToken,
        profitFeePercentage,
        slippagePercentage,
        isPaused,
        admins,
        allowedFrequencies
      },
      nextOffset: i
    };
  };

  const queryGetDcaContracts = async (): Promise<DcaSetup[]> => {
    try {
      setLoading(true);
      setError(null);

      const queryUrl = `${getGatewayUrl()}/vm-values/query`;
      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: PARENT_CONTRACT_ADDRESS,
          funcName: 'getDcaContracts',
          args: []
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to query contract: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const responseData = data.data?.data;
      if (responseData && responseData.returnCode && responseData.returnCode !== 'ok') {
        const errorMsg = responseData.returnMessage || responseData.returnCode;
        throw new Error(`Contract query error: ${errorMsg}`);
      }

      const returnData = data.data?.data?.returnData;

      if (!returnData || returnData.length === 0) {
        return [];
      }

      const list: DcaSetup[] = [];
      let i = 0;
      while (i < returnData.length) {
        const { result, nextOffset } = parseDcaSetupInternal(returnData, i, true);
        if (result) list.push(result);
        i = nextOffset;
      }

      setSetups(list);
      if (list.length > 0) setSetup(list[0]);
      return list;
    } catch (err: any) {
      console.error('Error querying DCA contracts:', err);
      setError(err.message || 'Failed to fetch DCA contracts');
      setSetups([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const queryGetSetup = async (dcaContractAddress: string): Promise<DcaSetup | null> => {
    try {
      const queryUrl = `${getGatewayUrl()}/vm-values/query`;
      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: dcaContractAddress,
          funcName: 'getSetup',
          args: []
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to query contract: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const responseData = data.data?.data;
      if (responseData && responseData.returnCode && responseData.returnCode !== 'ok') {
        const errorMsg = responseData.returnMessage || responseData.returnCode;
        throw new Error(`Contract query error: ${errorMsg}`);
      }

      const returnData = data.data?.data?.returnData;
      if (!returnData) return null;

      const { result } = parseDcaSetupInternal(returnData, 0, false);
      return result;
    } catch (err) {
      console.error('Error querying DCA setup:', err);
      return null;
    }
  };

  const queryGetStrategyTokenAttributes = async (
    nonce: number,
    contractAddress: string
  ): Promise<StrategyTokenAttributes | null> => {
    try {
      const queryUrl = `${getGatewayUrl()}/vm-values/query`;
      const nonceArg = encodeU64(nonce);

      const requestBody = {
        scAddress: contractAddress,
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
      const amountPerSwap = hexToDecimal(base64ToHex(returnData[1]));
      const dcaFrequency = base64ToString(returnData[2]);
      const frequencyInMillis = hexToDecimal(base64ToHex(returnData[3]));
      const takeProfitPercentage = hexToDecimal(base64ToHex(returnData[4]));
      const usdcBalance = hexToDecimal(base64ToHex(returnData[5]));
      const tokenBalance = hexToDecimal(base64ToHex(returnData[6]));
      const lastExecutedTsMillis = hexToDecimal(base64ToHex(returnData[7]));
      const takeProfitConditionMet = base64ToHex(returnData[8]) === '01';

      const parseSwapList = (listBase64: string): Swap[] => {
        const swaps: Swap[] = [];
        if (!listBase64) return swaps;
        const bytes = Buffer.from(listBase64, 'base64');
        let offset = 0;
        while (offset + 4 <= bytes.length) {
          const usdcLen = bytes.readUInt32BE(offset); offset += 4;
          if (offset + usdcLen > bytes.length) break;
          const usdcHex = bytes.slice(offset, offset + usdcLen).toString('hex'); offset += usdcLen;

          if (offset + 4 > bytes.length) break;
          const tokenLen = bytes.readUInt32BE(offset); offset += 4;
          if (offset + tokenLen > bytes.length) break;
          const tokenHex = bytes.slice(offset, offset + tokenLen).toString('hex'); offset += tokenLen;

          if (offset + 8 > bytes.length) break;
          const ts = bytes.readBigUInt64BE(offset); offset += 8;
          swaps.push({
            usdcAmount: hexToDecimal(usdcHex || '0'),
            dcaTokenAmount: hexToDecimal(tokenHex || '0'),
            timestampMillis: ts.toString()
          });
        }
        return swaps;
      };

      return {
        amountPerSwap,
        dcaFrequency,
        frequencyInMillis,
        takeProfitPercentage,
        usdcBalance,
        tokenBalance,
        lastExecutedTsMillis,
        takeProfitConditionMet,
        buys: parseSwapList(returnData[9]),
        sells: parseSwapList(returnData[10])
      };
    } catch (err) {
      console.error('Error querying strategy attributes:', err);
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
    queryGetSetup,
    queryGetStrategyTokenAttributes,
    contractAddress: DCA_CONTRACT_ADDRESS
  };
};
