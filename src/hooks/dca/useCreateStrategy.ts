'use client';
import {
  useGetAccount,
  useGetNetworkConfig,
  AbiRegistry,
  Address,
  SmartContractTransactionsFactory,
  TransactionsFactoryConfig
} from '@/lib';

import { signAndSendTransactions } from '@/helpers/signAndSendTransactions';
import libAbi from '@/contracts/lib.abi.json';

// Helper function to convert hex address to bech32
// Note: This is not used in this file, but kept for reference
// Address conversion is done in useDcaContract.ts

const CREATE_STRATEGY_TRANSACTION_INFO = {
  processingMessage: 'Creating DCA strategy...',
  errorMessage: 'An error occurred while creating the strategy',
  successMessage: 'Strategy created successfully'
};

export const useCreateStrategy = () => {
  const { network } = useGetNetworkConfig();
  const { address } = useGetAccount();

  const getSmartContractFactory = async () => {
    const abi = AbiRegistry.create(libAbi);
    const scFactory = new SmartContractTransactionsFactory({
      config: new TransactionsFactoryConfig({
        chainID: network.chainId
      }),
      abi
    });

    return scFactory;
  };

  const createStrategy = async (
    contractAddress: string, // DCA contract address (bech32)
    amountPerSwap: number, // USDC amount (e.g., 0.1)
    frequency: string, // Frequency name (e.g., "Hourly")
    takeProfitPercentage?: number // Optional take profit percentage (e.g., 15 for 15%)
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    const scFactory = await getSmartContractFactory();

    // Convert USDC amount to smallest units (6 decimals)
    const usdcDecimals = 1000000; // 10^6
    const amountPerSwapInSmallestUnits = BigInt(Math.floor(amountPerSwap * usdcDecimals));

    // Prepare arguments
    // frequency is bytes type, so pass as string (SDK will encode it)
    const args: any[] = [
      amountPerSwapInSmallestUnits, // BigUint: amount_per_swap
      frequency // bytes: frequency (string, SDK will encode to bytes)
    ];

    // Add optional take profit percentage if provided
    if (takeProfitPercentage !== undefined && takeProfitPercentage > 0) {
      // Convert percentage to basis points (multiply by 1000)
      // e.g., 15% -> 15000 basis points
      const takeProfitBasisPoints = BigInt(Math.floor(takeProfitPercentage * 1000));
      args.push(takeProfitBasisPoints); // optional<u64>: opt_take_profit_percentage
    }

    // Create transaction with function arguments
    // The SDK expects arguments to be passed as 'arguments' parameter
    const createStrategyTransaction = await scFactory.createTransactionForExecute(
      new Address(address),
      {
        gasLimit: BigInt(100000000),
        function: 'createStrategy',
        contract: new Address(contractAddress),
        arguments: args
      }
    );

    const sessionId = await signAndSendTransactions({
      transactions: [createStrategyTransaction],
      transactionsDisplayInfo: CREATE_STRATEGY_TRANSACTION_INFO
    });

    return sessionId;
  };

  return {
    createStrategy
  };
};

