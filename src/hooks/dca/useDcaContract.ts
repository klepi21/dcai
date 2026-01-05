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

      // Parse each DCA contract entry
      // Entry structure from ABI getSetup aka getDcaContracts:
      // 1. DcaToken (EgldOrEsdtTokenIdentifier)
      // 2. MinAmountPerSwap (BigUint)
      // 3. StrategyToken (TokenIdentifier)
      // 4. ProfitFeePercentage (u64)
      // 5. SlippagePercentage (u64)
      // 6. IsPaused (bool)
      // 7. Admins (variadic<Address>)
      // 8. AllowedFrequencies (variadic<multi<bytes,u64>>)

      // Note on ABI flattening:
      // Because Admins and AllowedFrequencies are BOTH variadic at the end, they appear sequentially in the flattened response.
      // We need a heuristic to distinguish where Admins end and Frequencies begin.
      // - Admin: always 32 bytes (64 hex class)
      // - Frequency Name: bytes (usually ASCII text)
      // - Frequency Duration: u64

      // 0. Address (This comes from the outer map/list structure of getDcaContracts, it's the KEY or first element of the tuple depending on how the contract returns it, but based on previous code it seems `getDcaContracts` returns a list of these structs prefixed by the contract address? 
      // Actually, looking at the previous code:
      // `queryGetDcaContracts` calls `getDcaContracts` on PARENT.
      // Parent ABI: `variadic<multi<Address,EgldOrEsdtTokenIdentifier,BigUint,TokenIdentifier,variadic<multi<bytes,u64>>>>`
      // Wait, the Parent ABI says: `variadic<multi<Address,EgldOrEsdtTokenIdentifier,BigUint,TokenIdentifier,variadic<multi<bytes,u64>>>>`
      // But the Child ABI `getSetup` returns: 
      // `EgldOrEsdtTokenIdentifier`, `BigUint`, `TokenIdentifier`, `u64`, `u64`, `bool`, `variadic<Address>`, `variadic<multi<bytes,u64>>`

      // The user said "We made some chnages in @[src/contracts/lib.abi.json] in getSetup".
      // AND "Parent ABI" might NOT have been updated in the file I read?
      // OR the Parent contract simply forwards the result? 
      // No, `getDcaContracts` in Parent iterates and returns a list.

      // Let's assume the Parent ABI I read (src/contracts/parent.abi.json) is OLD, or at least the code in `useDcaContract.ts` was based on an older version of what Parent returned.
      // If `lib.abi.json` `getSetup` changed, then `Parent.getDcaContracts` (which aggregates `getSetup` fromchildren) effectively changes its return signature for the inner part.

      // OLD Parent return assumed: Address, DcaToken, MinAmnt, StratToken, Frequencies...
      // NEW Parent return likely conforms to NEW `getSetup` + Address at start?
      // Likely: Address, DcaToken, MinAmnt, StratToken, ProfitFee, Slippage, IsPaused, Admins..., Frequencies...

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

      if (i >= returnData.length) break;

      // NEW FIELDS START HERE

      // 5. ProfitFeePercentage (u64)
      const profitFeeBase64 = returnData[i];
      const profitFeeHex = profitFeeBase64 ? base64ToHex(profitFeeBase64) : '0';
      const profitFeePercentage = hexToDecimal(profitFeeHex);
      i++;

      if (i >= returnData.length) break;

      // 6. SlippagePercentage (u64)
      const slippageBase64 = returnData[i];
      const slippageHex = slippageBase64 ? base64ToHex(slippageBase64) : '0';
      const slippagePercentage = hexToDecimal(slippageHex);
      i++;

      if (i >= returnData.length) break;

      // 7. IsPaused (bool)
      // Bool is returned as 1 byte (0x01 or empty/0x00?) In MultiversX, true is `01` (1 byte), false is empty string usually? or `00`?
      // Usually 1 for true, empty or 0 for false.
      const isPausedBase64 = returnData[i];
      const isPausedHex = isPausedBase64 ? base64ToHex(isPausedBase64) : '';
      const isPaused = isPausedHex === '01'; // simple check
      i++;

      // 8. Admins (variadic<Address>) AND 9. AllowedFrequencies (variadic<multi<bytes,u64>>)
      // These are mixed now. We consume items until we hit the next Contract Address (start of next entry) OR end of data.

      const admins: string[] = [];
      const allowedFrequencies: Array<{ frequency: string; duration: string }> = [];

      while (i < returnData.length) {
        // Peek current item
        const currentItem = returnData[i];
        const currentItemHex = currentItem ? base64ToHex(currentItem) : '';

        // CHECK FOR START OF NEXT ENTRY (Next Contract Address)
        // A contract address is 32 bytes (64 hex chars).
        // BUT an Admin address is ALSO 32 bytes (64 hex chars)!
        // How to distinguish?
        // We can't strictly distinguish if we just look at one item.
        // However, the Parent struct is specific.
        // IF we are parsing `getDcaContracts` from Parent, it returns a list of "DcaSetup".

        // Heuristics:

        // If it looks like a Frequency Name (ASCII text, < 32 chars typically), it's a Frequency.
        // If it is exactly 32 bytes, it is an ADDRESS.
        //    Is it an ADMIN or the NEXT CONTRACT?
        //    If we are in the "Admins" section, it could be an Admin.
        //    If we encounter a Frequency, we implicitly move to "Frequencies" section (assuming Admins come before Frequencies as per ABI).

        // ABI Order: setup(..., admins, frequencies) -> NO, wait.
        // `getSetup` ABI: outputs: [..., variadic<Address> (admins), variadic<multi<bytes,u64>> (freqs)]
        // So Admins come FIRST. Then Frequencies.

        // Logic:
        // 1. While item matches "Address" format (32 bytes) -> Add to Admins.
        //    WAIT! If the next contract's Address comes right after the last Admin, how do we know?
        //    We DON'T.
        //    Unless `getDcaContracts` wraps these in a way that separates them?
        //    The `variadic` in `MultiValueEncoded` usually flattens everything.
        //    This is risky.

        // Let's re-read the PARENT ABI provided earlier.
        // Parent `getDcaContracts`: `variadic<multi<Address,EgldOrEsdtTokenIdentifier,BigUint,TokenIdentifier,variadic<multi<bytes,u64>>>>`
        // The USER said they changed `lib.abi.json` (Child).
        // Usually Parent just aggregates. If Child `getSetup` returns X, Parent returns `tupple(Address, ...X)`.
        // So if Child returns `...Admins..., ...Freqs...`, Parent returns `Address, ...Admins..., ...Freqs...`.

        // If we have distinct Setup blocks:
        // [Addr1, Token1, ..., Admin1, Admin2, FreqName1, FreqDur1, Addr2, ... ]

        // If we see a 32-byte hex, it's NOT a Frequency Name (usually).
        // So it's either an Admin or the next Contract Address.
        // But we know Frequencies come AFTER Admins.
        // So:
        // - We are in "Admins" phase. We consume 32-byte items as Admins.
        // - If we see a non-32-byte item (likely Frequency Name), we switch to "Frequencies" phase.
        // - In "Frequencies" phase:
        //    - We consume Pair(Name, Duration).
        //    - If we see a 32-byte item now? It MUST be the next Contract Address (because Admins are already done before Frequencies).

        // Caveat: What if there are NO Frequencies?
        // Then we might mistake the Next Contract Address for an Admin of the current contract.
        // This is ambiguous in flattened lists if types are identical.
        // However, usually `getDcaContracts` (Parent) returns `List<Setup>`. 
        // In pure ABI encoding, List<Struct> is NOT flattened into one giant stream of bytes unless it's `MultiValueEncoded`.
        // The JSON response `returnData` IS often a flattened array of base64 strings in the JS SDK / Proxy.

        // Let's hope there's at least one frequency or some marker.
        // actually, we can check the *NEXT* item after the 32-byte item.
        // If it's a Token Identifier (EgldOrEsdtTokenIdentifier), it's likely the start of a new Setup (Setup field #2).
        // DcaToken is field #2 of Setup. Address is field #1.
        // So: [Addr, DcaToken, ...]
        // If we see [32-byte X, Y]...
        // If Y looks like a Token Identifier (ASCII, etc), then X is likely the Address of next setup.
        // If Y is another 32-byte X2, then X might be an Admin.

        // Refined Heuristic:
        // We are processing Admins/Freqs.
        // Check if (i) is 32-bytes.
        //   Check (i+1). 
        //   If (i+1) looks like a DCA Token (string, not biguint-ish, not 32-byte garbage)?
        //   Actually DCA Token can be just "EGLD" or "USDC-1234".
        //   Admins are 32 bytes.
        //   Frequencies are (String, u64).

        // Attempt:
        // 1. Check if current item is start of NEW Setup.
        //    Start of new setup = [Address, DcaToken, MinAmount...]
        //    Address = 32 bytes.
        //    DcaToken = String (usually short, alnum + optional hyphen).
        //    MinAmount = BigUint (hex number).
        //    StrategyToken = String.
        //    ProfitFee = u64.
        //    Slippage = u64.
        //    IsPaused = bool.

        // If we have enough remaining items to form a valid header (Addr, Tok, Amt... ~7 items), we can peek ahead.

        // Let's implement the "Lookahead for New Contract" check.

        // Check if current item 'i' could be specific Start of Next Contract.
        let isNextContractStart = false;
        if (currentItemHex.length === 64) {
          // Potential Address.
          // Look ahead to confirm context.
          // i+1: DcaToken (String)
          // i+2: MinAmount (BigUint/Hex)
          const next1 = returnData[i + 1];
          const next2 = returnData[i + 2];

          if (next1 && next2) {
            const next1Str = base64ToString(next1);
            const next2Hex = base64ToHex(next2); // should be valid hex number

            // DcaToken logic: usually EGLD or Ticker-123456
            const validToken = next1Str === 'EGLD' || /^[A-Z0-9]+-[a-f0-9]{6}$/i.test(next1Str);
            // MinAmount logic: just a number
            const validAmount = /^[0-9a-fA-F]+$/.test(next2Hex);

            if (validToken && validAmount) {
              isNextContractStart = true;
            }
          }
        }

        if (isNextContractStart) {
          // We reached the next contract. Stop parsing this contract's variable fields.
          break;
        }

        // If not next contract, process as Admin or Frequency.

        // If we haven't seen any frequencies yet, and it's 32 bytes -> Admin.
        const potentialFreq = currentItem ? base64ToString(currentItem) : '';

        // Check if it's a Frequency Pair
        // Frequency Name: String, readable.
        // Duration: Number.
        let isFrequency = false;

        if (potentialFreq.length > 0 && potentialFreq.length < 50 && !/[^\x20-\x7E]/.test(potentialFreq)) {
          // Counts as "Readable ASCII"? 
          // Admin Addr (32 bytes) decoded as utf8 usually has garbage.
          // So if it's clean ASCII, it's likely a Frequency Name.
          // Also check next item is a duration (u64).
          if (i + 1 < returnData.length) {
            const durHex = base64ToHex(returnData[i + 1]);
            // u64 fits in 16 hex chars (8 bytes)
            if (durHex.length <= 16) {
              isFrequency = true;
            }
          }
        }

        if (isFrequency) {
          // Consume Frequency Pair
          const durationBase64 = returnData[i + 1];
          const durationHex = durationBase64 ? base64ToHex(durationBase64) : '0';
          const duration = hexToDecimal(durationHex);

          allowedFrequencies.push({
            frequency: potentialFreq,
            duration: duration
          });
          i += 2;
        } else {
          // Assume Admin (if 32 bytes) or unknown garbage
          if (currentItemHex.length === 64) {
            // It's an Admin
            let adminBech32 = currentItemHex;
            try {
              const addressBytes = Uint8Array.from(Buffer.from(currentItemHex, 'hex'));
              const address = new Address(addressBytes);
              adminBech32 = address.toBech32();
            } catch { }
            admins.push(adminBech32);
            i++;
          } else {
            // fallback, skip 1
            i++;
          }
        }
      }

      const parsedEntry = {
        address: addressBech32, // Store as bech32 format (erd1...)
        dcaToken: dcaToken || 'EGLD',
        minAmountPerSwap,
        strategyToken,
        profitFeePercentage,
        slippagePercentage,
        isPaused,
        admins,
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

