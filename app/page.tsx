"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useTokens } from "@/hooks/useTokens";
import { useTransactions } from "@/hooks/useTransactions";
import { WalletCard } from "@/components/WalletCard";
import { SWITCHABLE_CHAINS } from "@/config/constants";
import { SendTransactionCard } from "@/components/SendTransactionCard";
import { TokenImportCard } from "@/components/TokenImportCard";
import { TokenListCard } from "@/components/TokenListCard";
import { TransactionHistoryCard } from "@/components/TransactionHistoryCard";
import type { Transaction } from "@/config/constants";

export default function Home() {
  const {
    account,
    balance,
    network,
    isConnected,
    isConnecting,
    isSwitchingChain,
    connect,
    switchChain,
    updateBalance,
    sendTransaction,
    getExplorerUrl,
    web3,
  } = useWallet();

  const { tokens, balances, importToken, removeToken, fetchAllBalances } =
    useTokens(account, web3);

  const { sendETH, getAppHistory, fetchEtherscanHistory, isLoading: txLoading } =
    useTransactions(account, web3);

  const [appTransactions, setAppTransactions] = useState<Transaction[]>([]);
  const [message, setMessage] = useState<{
    text: string;
    type: "error" | "success";
  } | null>(null);

  // Show message helper
  const showMessage = useCallback(
    (text: string, type: "error" | "success") => {
      setMessage({ text, type });
      setTimeout(() => setMessage(null), 5000);
    },
    []
  );

  // Handle connect
  const handleConnect = async () => {
    try {
      await connect();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      showMessage(message || "Failed to connect wallet", "error");
    }
  };

  // Handle switch chain
  const handleSwitchChain = async (chainId: number) => {
    try {
      await switchChain(chainId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      showMessage(message || "Failed to switch chain", "error");
    }
  };

  // Handle send ETH
  const handleSend = async (to: string, amount: string) => {
    try {
      await sendETH(to, amount, sendTransaction, network?.name || "");
      showMessage("Transaction sent successfully!", "success");
      await updateBalance();
      setAppTransactions(getAppHistory());
    } catch (error: any) {
      showMessage(error.message, "error");
      throw error;
    }
  };

  // Handle import token
  const handleImportToken = async (address: string) => {
    try {
      await importToken(address);
      showMessage(`Token imported successfully!`, "success");
    } catch (error: any) {
      showMessage(error.message, "error");
      throw error;
    }
  };

  // Handle fetch etherscan
  const handleFetchEtherscan = async (apiKey: string) => {
    if (!network?.chainId) {
      throw new Error("Network not available");
    }
    return await fetchEtherscanHistory(apiKey, network.chainId);
  };

  // Load transactions on mount and when account changes
  useEffect(() => {
    if (isConnected) {
      setAppTransactions(getAppHistory());
    }
  }, [isConnected, account, getAppHistory]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary to-primary-dark p-5">
      <div className="max-w-container mx-auto">
        {/* Header */}
        <h1 className="text-white text-center text-4xl font-bold mb-2">
          🚀 First DApp
        </h1>
        <p className="text-white/80 text-center mb-8">
          A simple decentralized application
        </p>

        {/* Message Toast */}
        {message && (
          <div
            className={
              message.type === "error"
                ? "bg-red-100 text-red-700 p-3 rounded-lg mb-5"
                : "bg-green-100 text-green-700 p-3 rounded-lg mb-5"
            }
          >
            {message.text}
          </div>
        )}

        {/* Wallet Section */}
        <WalletCard
          isConnected={isConnected}
          isConnecting={isConnecting}
          isSwitchingChain={isSwitchingChain}
          account={account}
          balance={balance}
          network={network}
          switchableChains={SWITCHABLE_CHAINS.map((c) => ({
            chainId: c.chainId,
            name: c.name,
          }))}
          onConnect={handleConnect}
          onSwitchChain={handleSwitchChain}
        />

        {/* Send Transaction Section */}
        <SendTransactionCard
          isConnected={isConnected}
          isLoading={txLoading}
          onSend={handleSend}
        />

        {/* Import Token Section */}
        <TokenImportCard
          isConnected={isConnected}
          isLoading={false}
          onImport={handleImportToken}
        />

        {/* Token List Section */}
        <TokenListCard
          tokens={tokens}
          balances={balances}
          isConnected={isConnected}
          onRemove={removeToken}
        />

        {/* Transaction History Section */}
        <TransactionHistoryCard
          transactions={appTransactions}
          networkName={network?.name || ""}
          explorerUrl={getExplorerUrl("")}
          isLoading={txLoading}
          onFetchEtherscan={handleFetchEtherscan}
        />
      </div>
    </main>
  );
}
