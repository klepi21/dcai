'use client';
import {
  useGetAccount,
  useGetNetworkConfig,
  Address,
  Transaction
} from '@/lib';

import { signAndSendTransactions } from '@/helpers/signAndSendTransactions';

import { USDC_TOKEN_ID } from '@/config';

const DEPOSIT_TRANSACTION_INFO = {
  processingMessage: 'Depositing USDC...',
  errorMessage: 'An error occurred while depositing USDC',
  successMessage: 'USDC deposited successfully'
};

// USDC token identifier
const USDC_TOKEN_IDENTIFIER = USDC_TOKEN_ID;

export const useDeposit = () => {
  const { network } = useGetNetworkConfig();
  const { address } = useGetAccount();


  const deposit = async (
    contractAddress: string, // DCA contract address (bech32)
    amount: number, // USDC amount (e.g., 100.5)
    strategyTokenIdentifier: string // Strategy token identifier (e.g., "DCAIASH-1f57cc-02")
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      // Convert USDC amount to smallest units (6 decimals)
      const usdcDecimals = 1000000; // 10^6
      const amountInSmallestUnits = BigInt(Math.floor(amount * usdcDecimals));

      // Parse strategy token identifier to extract collection and nonce
      // Format: "DCAIASH-1f57cc-02" -> collection: "DCAIASH-1f57cc", nonce: "02"
      const strategyTokenParts = strategyTokenIdentifier.split('-');
      const collection = strategyTokenParts.slice(0, -1).join('-'); // Everything except last part
      const nonceHex = strategyTokenParts[strategyTokenParts.length - 1]; // Last part is nonce in hex

      // Use MultiESDTNFTTransfer to send both USDC and MetaESDT in a single transaction
      // Format: MultiESDTNFTTransfer@receiver_hex@num_tokens@token1_hex@nonce1_hex@amount1_hex@token2_hex@nonce2_hex@amount2_hex@function_name_hex
      const contractAddressObj = new Address(contractAddress);
      const contractAddressHex = contractAddressObj.toHex();

      const usdcIdentifier = USDC_TOKEN_IDENTIFIER;
      const usdcTokenIdHex = Buffer.from(usdcIdentifier).toString('hex').toUpperCase();
      let usdcAmountHex = amountInSmallestUnits.toString(16).toUpperCase();
      if (usdcAmountHex.length % 2 !== 0) {
        usdcAmountHex = '0' + usdcAmountHex;
      }

      const collectionHex = Buffer.from(collection).toString('hex').toUpperCase();
      let nonceHexPadded = nonceHex.toUpperCase();
      if (nonceHexPadded.length % 2 !== 0) {
        nonceHexPadded = '0' + nonceHexPadded;
      }
      const metaEsdtAmountHex = '01'; // Send 1 MetaESDT token

      const functionNameHex = Buffer.from('deposit').toString('hex');

      // Build the MultiESDTNFTTransfer data field
      // @receiver@num_tokens@token1@nonce1@amount1@token2@nonce2@amount2@function
      const multiTransferData = `MultiESDTNFTTransfer@${contractAddressHex}@02@${usdcTokenIdHex}@00@${usdcAmountHex}@${collectionHex}@${nonceHexPadded}@${metaEsdtAmountHex}@${functionNameHex}`;

      const depositTransaction = new Transaction({
        sender: new Address(address),
        receiver: new Address(address), // For MultiESDTNFTTransfer, receiver is the sender (actual receiver is in data field)
        value: BigInt(0),
        gasLimit: BigInt(8000000), // 8 million gas
        chainID: network.chainId,
        data: new Uint8Array(Buffer.from(multiTransferData)),
        version: 1
      });

      const { sessionId } = await signAndSendTransactions({
        transactions: [depositTransaction],
        transactionsDisplayInfo: DEPOSIT_TRANSACTION_INFO
      });

      return { sessionId };
    } catch (error) {
      throw error;
    }
  };

  return {
    deposit
  };
};

