import { useGetNetworkConfig } from '@/lib';

type NetworkConfig = ReturnType<typeof useGetNetworkConfig>['network'];

export function getNetworkPath(network: NetworkConfig): string {
  if (network.apiAddress) {
    if (network.apiAddress.includes('devnet')) {
      return 'devnet';
    } else if (network.apiAddress.includes('testnet')) {
      return 'testnet';
    } else {
      return 'mainnet';
    }
  }
  return 'mainnet'; // Default to mainnet
}

export function getApiUrl(network: NetworkConfig): string {
  if (network.apiAddress) {
    if (network.apiAddress.includes('devnet')) {
      return 'https://devnet-api.multiversx.com';
    } else if (network.apiAddress.includes('testnet')) {
      return 'https://testnet-api.multiversx.com';
    } else {
      return 'https://api.multiversx.com';
    }
  }
  return 'https://api.multiversx.com'; // Default to mainnet
}

