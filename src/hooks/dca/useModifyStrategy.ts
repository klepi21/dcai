'use client';
import {
  useGetAccount,
  useGetNetworkConfig,
  Address,
  Transaction
} from '@/lib';

import { signAndSendTransactions } from '@/helpers/signAndSendTransactions';

const MODIFY_STRATEGY_TRANSACTION_INFO = {
  processingMessage: 'Modifying strategy...',
  errorMessage: 'An error occurred while modifying the strategy'
};

export const useModifyStrategy = () => {
  const { network } = useGetNetworkConfig();
  const { address } = useGetAccount();

  const modifyStrategy = async (
    contractAddress: string, // DCA contract address (bech32)
    amountPerSwap: number, // Amount per swap in USDC (e.g., 100.5)
    frequency: string, // Frequency as string (e.g., "Hourly", "Daily")
    takeProfitPercentage: number, // Take profit percentage (e.g., 20 for 20%)
    strategyTokenIdentifier: string // Strategy token identifier (e.g., "DCAIASH-1f57cc-02")
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      // Convert USDC amount to smallest units (6 decimals)
      const usdcDecimals = 1000000; // 10^6
      const amountPerSwapInSmallestUnits = BigInt(Math.floor(amountPerSwap * usdcDecimals));

      // Convert take profit percentage to basis points (multiply by 100, e.g., 20% = 2000)
      const takeProfitBasisPoints = BigInt(Math.floor(takeProfitPercentage * 100));

      // Capitalize frequency to match smart contract expectations (e.g., "hourly" -> "Hourly")
      const capitalizedFrequency = frequency.charAt(0).toUpperCase() + frequency.slice(1).toLowerCase();

      // Encode frequency as bytes (convert string to hex)
      const frequencyHex = Buffer.from(capitalizedFrequency).toString('hex').toUpperCase();

      // Parse strategy token identifier to extract collection and nonce
      // Format: "DCAIASH-1f57cc-02" -> collection: "DCAIASH-1f57cc", nonce: "02"
      const strategyTokenParts = strategyTokenIdentifier.split('-');
      const collection = strategyTokenParts.slice(0, -1).join('-'); // Everything except last part
      const nonceHex = strategyTokenParts[strategyTokenParts.length - 1]; // Last part is nonce in hex

      // Use MultiESDTNFTTransfer to send MetaESDT token and call modifyStrategy function
      // Format: MultiESDTNFTTransfer@receiver_hex@num_tokens@token_hex@nonce_hex@amount_hex@function_name_hex@arg1_hex@arg2_hex@arg3_hex
      const contractAddressObj = new Address(contractAddress);
      const contractAddressHex = contractAddressObj.toHex();

      const collectionHex = Buffer.from(collection).toString('hex').toUpperCase();
      let nonceHexPadded = nonceHex.toUpperCase();
      if (nonceHexPadded.length % 2 !== 0) {
        nonceHexPadded = '0' + nonceHexPadded;
      }
      const metaEsdtAmountHex = '01'; // Send 1 MetaESDT token

      // Encode function name
      const functionNameHex = Buffer.from('modifyStrategy').toString('hex');

      // Encode arguments
      // arg1: amount_per_swap (BigUint as hex)
      let amountPerSwapHex = amountPerSwapInSmallestUnits.toString(16).toUpperCase();
      if (amountPerSwapHex.length % 2 !== 0) {
        amountPerSwapHex = '0' + amountPerSwapHex;
      }

      // arg2: frequency (bytes as hex)
      const frequencyArgHex = frequencyHex;

      // arg3: take_profit_percentage (u64 as hex)
      let takeProfitHex = takeProfitBasisPoints.toString(16).toUpperCase();
      if (takeProfitHex.length % 2 !== 0) {
        takeProfitHex = '0' + takeProfitHex;
      }

      // Build the MultiESDTNFTTransfer data field
      // @receiver@num_tokens@token@nonce@amount@function@arg1@arg2@arg3
      const multiTransferData = `MultiESDTNFTTransfer@${contractAddressHex}@01@${collectionHex}@${nonceHexPadded}@${metaEsdtAmountHex}@${functionNameHex}@${amountPerSwapHex}@${frequencyArgHex}@${takeProfitHex}`;

      const modifyStrategyTransaction = new Transaction({
        sender: new Address(address),
        receiver: new Address(address), // For MultiESDTNFTTransfer, receiver is the sender (actual receiver is in data field)
        value: BigInt(0),
        gasLimit: BigInt(8000000), // 8 million gas
        chainID: network.chainId,
        data: new Uint8Array(Buffer.from(multiTransferData)),
        version: 1
      });

      const { sessionId } = await signAndSendTransactions({
        transactions: [modifyStrategyTransaction],
        transactionsDisplayInfo: MODIFY_STRATEGY_TRANSACTION_INFO
      });

      return { sessionId };
    } catch (error) {
      throw error;
    }
  };

  return {
    modifyStrategy
  };
};
