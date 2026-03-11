"use client";

import { useState, useEffect, useCallback } from "react";
import { Web3 } from "web3";
import { ERC20_ABI, TokenStorage, type Token } from "@/config/constants";

interface TokenBalance {
  raw: string;
  formatted: string;
  symbol: string;
}

export function useTokens(account: string | null, web3: Web3 | null) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [balances, setBalances] = useState<Map<string, TokenBalance>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Load tokens from storage
  const loadTokens = useCallback(() => {
    const stored = TokenStorage.getAll();
    setTokens(stored);
  }, []);

  // Fetch balance for a single token
  const fetchBalance = useCallback(
    async (token: Token): Promise<string> => {
      if (!web3 || !account) return "-";

      try {
        const contract = new web3.eth.Contract(ERC20_ABI as any, token.address);
        const balance = await contract.methods.balanceOf(account).call();
        const balanceStr = balance != null ? String(balance) : "0";
        const formattedBalance = (
          Number(balanceStr) / Math.pow(10, token.decimals)
        ).toFixed(4);

        setBalances((prev) => {
          const newMap = new Map(prev);
          newMap.set(token.address.toLowerCase(), {
            raw: balanceStr,
            formatted: formattedBalance,
            symbol: token.symbol,
          });
          return newMap;
        });

        return formattedBalance;
      } catch (error) {
        console.error(`Error fetching balance for ${token.symbol}:`, error);
        setBalances((prev) => {
          const newMap = new Map(prev);
          newMap.set(token.address.toLowerCase(), {
            raw: "0",
            formatted: "Error",
            symbol: token.symbol,
          });
          return newMap;
        });
        return "Error";
      }
    },
    [web3, account]
  );

  // Fetch all balances
  const fetchAllBalances = useCallback(async () => {
    if (!web3 || !account || tokens.length === 0) return;

    for (const token of tokens) {
      await fetchBalance(token);
    }
  }, [web3, account, tokens, fetchBalance]);

  // Import a new token
  const importToken = useCallback(
    async (address: string) => {
      if (!web3 || !account) {
        throw new Error("Wallet not connected");
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new Error("Invalid token contract address");
      }

      if (TokenStorage.exists(address)) {
        throw new Error("Token already imported");
      }

      const contract = new web3.eth.Contract(ERC20_ABI as any, address);

      let tokenSymbol: string;
      try {
        tokenSymbol = await contract.methods.symbol().call();
      } catch {
        throw new Error("Could not fetch token symbol from contract");
      }

      let tokenDecimals: number;
      try {
        tokenDecimals = parseInt(await contract.methods.decimals().call());
      } catch {
        tokenDecimals = 18;
      }

      const token: Token = {
        address,
        symbol: tokenSymbol!,
        decimals: tokenDecimals,
      };

      TokenStorage.save(token);
      setTokens((prev) => [...prev, token]);

      // Fetch initial balance
      await fetchBalance(token);

      return token;
    },
    [web3, account, fetchBalance]
  );

  // Remove a token
  const removeToken = useCallback((address: string) => {
    TokenStorage.remove(address);
    setBalances((prev) => {
      const newMap = new Map(prev);
      newMap.delete(address.toLowerCase());
      return newMap;
    });
    setTokens((prev) =>
      prev.filter(
        (t) => t.address.toLowerCase() !== address.toLowerCase()
      )
    );
  }, []);

  // Get cached balance for a token
  const getBalance = useCallback(
    (address: string): TokenBalance | null => {
      return balances.get(address.toLowerCase()) || null;
    },
    [balances]
  );

  // Load tokens on mount
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  // Fetch balances when tokens or account changes
  useEffect(() => {
    if (account && web3 && tokens.length > 0) {
      fetchAllBalances();
    }
  }, [account, web3, tokens.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    tokens,
    balances,
    isLoading,
    importToken,
    removeToken,
    fetchBalance,
    fetchAllBalances,
    getBalance,
    refresh: loadTokens,
  };
}
