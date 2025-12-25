'use client';
import {
  useGetAccount,
  useGetNetworkConfig,
  Address,
  Transaction
} from '@/lib';

import { signAndSendTransactions } from '@/helpers/signAndSendTransactions';

const DELETE_STRATEGY_TRANSACTION_INFO = {
  processingMessage: 'Deleting strategy...',
  errorMessage: 'An error occurred while deleting the strategy',
  successMessage: 'Strategy deleted successfully'
};

export const useDeleteStrategy = () => {
  const { network } = useGetNetworkConfig();
  const { address } = useGetAccount();

  const deleteStrategy = async (
    contractAddress: string, // DCA contract address (bech32)
    strategyTokenIdentifier: string // Strategy token identifier (e.g., "DCAIASH-1f57cc-02")
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      // Parse strategy token identifier to extract collection and nonce
      // Format: "DCAIASH-1f57cc-02" -> collection: "DCAIASH-1f57cc", nonce: "02"
      const strategyTokenParts = strategyTokenIdentifier.split('-');
      const collection = strategyTokenParts.slice(0, -1).join('-'); // Everything except last part
      const nonceHex = strategyTokenParts[strategyTokenParts.length - 1]; // Last part is nonce in hex

      // Use MultiESDTNFTTransfer to send MetaESDT token and call deleteStrategy function
      // Format: MultiESDTNFTTransfer@receiver_hex@num_tokens@token_hex@nonce_hex@amount_hex@function_name_hex
      const contractAddressObj = new Address(contractAddress);
      const contractAddressHex = contractAddressObj.toHex();
      
      const collectionHex = Buffer.from(collection).toString('hex').toUpperCase();
      let nonceHexPadded = nonceHex.toUpperCase();
      if (nonceHexPadded.length % 2 !== 0) {
        nonceHexPadded = '0' + nonceHexPadded;
      }
      const metaEsdtAmountHex = '01'; // Send 1 MetaESDT token
      
      // Encode function name
      const functionNameHex = Buffer.from('deleteStrategy').toString('hex');
      
      // Build the MultiESDTNFTTransfer data field
      // @receiver@num_tokens@token@nonce@amount@function
      const multiTransferData = `MultiESDTNFTTransfer@${contractAddressHex}@01@${collectionHex}@${nonceHexPadded}@${metaEsdtAmountHex}@${functionNameHex}`;

      const deleteStrategyTransaction = new Transaction({
        sender: new Address(address),
        receiver: new Address(address), // For MultiESDTNFTTransfer, receiver is the sender (actual receiver is in data field)
        value: BigInt(0),
        gasLimit: BigInt(20000000), // 20 million gas
        chainID: network.chainId,
        data: new Uint8Array(Buffer.from(multiTransferData)),
        version: 1
      });

      const sessionId = await signAndSendTransactions({
        transactions: [deleteStrategyTransaction],
        transactionsDisplayInfo: DELETE_STRATEGY_TRANSACTION_INFO
      });

      return sessionId;
    } catch (error) {
      console.error('Error in deleteStrategy function:', error);
      throw error;
    }
  };

  return {
    deleteStrategy
  };
};
