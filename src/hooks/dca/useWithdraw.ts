'use client';
import {
  useGetAccount,
  useGetNetworkConfig,
  Address,
  Transaction
} from '@/lib';

import { signAndSendTransactions } from '@/helpers/signAndSendTransactions';
import libAbi from '@/contracts/lib.abi.json';

const WITHDRAW_TRANSACTION_INFO = {
  processingMessage: 'Withdrawing...',
  errorMessage: 'An error occurred while withdrawing',
  successMessage: 'Withdrawal successful'
};

// Token withdrawn enum values (from ABI: TokenWithdrawn enum)
// Usdc has discriminant 1, DcaToken has discriminant 2
const TOKEN_WITHDRAWN_USDC = 1; // Usdc variant (discriminant: 1)
const TOKEN_WITHDRAWN_TOKEN = 2; // DcaToken variant (discriminant: 2)

export const useWithdraw = () => {
  const { network } = useGetNetworkConfig();
  const { address } = useGetAccount();

  const withdraw = async (
    contractAddress: string, // DCA contract address (bech32)
    amount: number, // Amount to withdraw
    tokenType: 'usdc' | 'token', // Type of token to withdraw
    strategyTokenIdentifier: string // Strategy token identifier (e.g., "DCAIASH-1f57cc-02")
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      // Convert amount to smallest units (6 decimals for USDC)
      const usdcDecimals = 1000000; // 10^6
      const amountInSmallestUnits = BigInt(Math.floor(amount * usdcDecimals));

      // Parse strategy token identifier to extract collection and nonce
      // Format: "DCAIASH-1f57cc-02" -> collection: "DCAIASH-1f57cc", nonce: "02"
      const strategyTokenParts = strategyTokenIdentifier.split('-');
      const collection = strategyTokenParts.slice(0, -1).join('-'); // Everything except last part
      const nonceHex = strategyTokenParts[strategyTokenParts.length - 1]; // Last part is nonce in hex

      // Determine token_withdrawn enum value
      const tokenWithdrawn = tokenType === 'usdc' ? TOKEN_WITHDRAWN_USDC : TOKEN_WITHDRAWN_TOKEN;

      // Use MultiESDTNFTTransfer to send MetaESDT token and call withdraw function
      // Format: MultiESDTNFTTransfer@receiver_hex@num_tokens@token_hex@nonce_hex@amount_hex@function_name_hex@arg1_hex@arg2_hex
      const contractAddressObj = new Address(contractAddress);
      const contractAddressHex = contractAddressObj.toHex();
      
      const collectionHex = Buffer.from(collection).toString('hex').toUpperCase();
      let nonceHexPadded = nonceHex.toUpperCase();
      if (nonceHexPadded.length % 2 !== 0) {
        nonceHexPadded = '0' + nonceHexPadded;
      }
      const metaEsdtAmountHex = '01'; // Send 1 MetaESDT token
      
      // Encode function name and arguments
      const functionNameHex = Buffer.from('withdraw').toString('hex');
      
      // Encode amount argument (BigUint as hex)
      let amountHex = amountInSmallestUnits.toString(16).toUpperCase();
      if (amountHex.length % 2 !== 0) {
        amountHex = '0' + amountHex;
      }
      
      // Encode token_withdrawn enum argument (u8/u16 as hex - minimal representation)
      const tokenWithdrawnHex = tokenWithdrawn.toString(16).padStart(2, '0').toUpperCase();
      
      // Build the MultiESDTNFTTransfer data field
      // @receiver@num_tokens@token@nonce@amount@function@arg1@arg2
      const multiTransferData = `MultiESDTNFTTransfer@${contractAddressHex}@01@${collectionHex}@${nonceHexPadded}@${metaEsdtAmountHex}@${functionNameHex}@${amountHex}@${tokenWithdrawnHex}`;

      const withdrawTransaction = new Transaction({
        sender: new Address(address),
        receiver: new Address(address), // For MultiESDTNFTTransfer, receiver is the sender (actual receiver is in data field)
        value: BigInt(0),
        gasLimit: BigInt(20000000), // 20 million gas
        chainID: network.chainId,
        data: new Uint8Array(Buffer.from(multiTransferData)),
        version: 1
      });

      const { sessionId } = await signAndSendTransactions({
        transactions: [withdrawTransaction],
        transactionsDisplayInfo: WITHDRAW_TRANSACTION_INFO
      });

      return { sessionId };
    } catch (error) {
      console.error('Error in withdraw function:', error);
      throw error;
    }
  };

  return {
    withdraw
  };
};
