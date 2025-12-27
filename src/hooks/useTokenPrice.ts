'use client';
import { useState, useEffect, useRef } from 'react';
import { useGetNetworkConfig } from '@/lib';

interface TokenPrice {
  price: number | null;
  loading: boolean;
  error: string | null;
}

// Cache for token prices to avoid multiple API calls
const priceCache = new Map<string, { price: number | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useTokenPrice(tokenIdentifier: string): TokenPrice {
  const { network } = useGetNetworkConfig();
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!tokenIdentifier) {
      setPrice(null);
      setLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = `${network.apiAddress || 'devnet'}-${tokenIdentifier}`;
    const cached = priceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setPrice(cached.price);
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches for the same token
    if (fetchingRef.current.has(cacheKey)) {
      return;
    }

    const fetchPrice = async () => {
      fetchingRef.current.add(cacheKey);
      setLoading(true);
      setError(null);

      try {
        // Determine API URL based on network
        let apiUrl = 'https://devnet-api.multiversx.com';
        if (network.apiAddress) {
          if (network.apiAddress.includes('devnet')) {
            apiUrl = 'https://devnet-api.multiversx.com';
          } else if (network.apiAddress.includes('testnet')) {
            apiUrl = 'https://testnet-api.multiversx.com';
          } else {
            apiUrl = 'https://api.multiversx.com';
          }
        }

        // Fetch tokens from MultiversX API
        const response = await fetch(`${apiUrl}/tokens?size=300`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tokens: ${response.status}`);
        }

        const data = await response.json();
        
        // Handle both array and object responses
        const tokens = Array.isArray(data) ? data : (data.data || []);
        
        // Debug: log token identifier and API response
        if (process.env.NODE_ENV === 'development') {
          console.log('Fetching price for token:', tokenIdentifier);
          console.log('API URL:', `${apiUrl}/tokens?size=300`);
          console.log('Total tokens fetched:', tokens.length);
        }
        
        // Search for the token by identifier (exact match first, then case-insensitive)
        const token = tokens.find((t: any) => 
          t.identifier === tokenIdentifier
        ) || tokens.find((t: any) => 
          t.identifier?.toLowerCase() === tokenIdentifier.toLowerCase()
        );

        if (process.env.NODE_ENV === 'development') {
          console.log('Token found:', token ? 'Yes' : 'No');
          if (token) {
            console.log('Token data:', { identifier: token.identifier, price: token.price, priceUsd: token.priceUsd, priceUSD: token.priceUSD });
          }
        }

        if (token) {
          // Check various possible price fields
          const priceValue = token.price || token.priceUsd || token.priceUSD;
          if (priceValue !== undefined && priceValue !== null) {
            const parsedPrice = parseFloat(priceValue);
            if (!isNaN(parsedPrice)) {
              setPrice(parsedPrice);
              // Cache the result
              priceCache.set(cacheKey, { price: parsedPrice, timestamp: Date.now() });
            } else {
              setPrice(null);
              setError('Invalid price format');
              priceCache.set(cacheKey, { price: null, timestamp: Date.now() });
            }
          } else {
            setPrice(null);
            setError('Price field not found in token data');
            priceCache.set(cacheKey, { price: null, timestamp: Date.now() });
          }
        } else {
          setPrice(null);
          setError(`Token ${tokenIdentifier} not found in API response`);
          priceCache.set(cacheKey, { price: null, timestamp: Date.now() });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch price');
        setPrice(null);
        priceCache.set(cacheKey, { price: null, timestamp: Date.now() });
      } finally {
        setLoading(false);
        fetchingRef.current.delete(cacheKey);
      }
    };

    fetchPrice();
  }, [tokenIdentifier, network.apiAddress]);

  return { price, loading, error };
}

