"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";

export type ChainFaucetInfo = {
  chainId: number;
  name: string;
  faucets: string[];
};

const DEFAULT_CHAIN_ID = 11155111;

function getDefaultSelectedChainId(chains: ChainFaucetInfo[]): number {
  return (
    chains.find((chain) => chain.chainId === DEFAULT_CHAIN_ID)?.chainId ??
    chains.slice().sort((a, b) => a.name.localeCompare(b.name))[0]?.chainId ??
    0
  );
}

function parseFirstEthAccount(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const first = value[0];
  if (typeof first !== "string") return null;
  const trimmed = first.trim();
  return trimmed ? trimmed : null;
}

export function ChainFaucetPicker({ chains }: { chains: ChainFaucetInfo[] }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletStatus, setWalletStatus] = useState<
    "loading" | "no_provider" | "disconnected" | "connected"
  >("loading");
  const [connectBusy, setConnectBusy] = useState(false);

  const options = useMemo(() => {
    return chains
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({
        chainId: c.chainId,
        label: `${c.name} (${c.chainId})`,
      }));
  }, [chains]);

  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedChainId, setSelectedChainId] = useState<number>(
    getDefaultSelectedChainId(chains)
  );

  useEffect(() => {
    const provider = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!provider?.request) {
      setWalletAddress(null);
      setWalletStatus("no_provider");
      return;
    }

    const refresh = async () => {
      try {
        const accounts = await provider.request({ method: "eth_accounts" });
        const address = parseFirstEthAccount(accounts);
        setWalletAddress(address);
        setWalletStatus(address ? "connected" : "disconnected");
      } catch {
        setWalletAddress(null);
        setWalletStatus("disconnected");
      }
    };

    void refresh();

    const handleAccountsChanged = (accounts: unknown) => {
      const address = parseFirstEthAccount(accounts);
      setWalletAddress(address);
      setWalletStatus(address ? "connected" : "disconnected");
    };

    provider.on?.("accountsChanged", handleAccountsChanged);
    return () =>
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
  }, []);

  useEffect(() => {
    if (chains.length === 0) return;
    if (options.some((option) => option.chainId === selectedChainId)) return;
    setSelectedChainId(getDefaultSelectedChainId(chains));
  }, [chains, options, selectedChainId]);

  useEffect(() => {
    if (chains.length === 0) return;

    const provider = window.ethereum;
    if (!provider?.request) return;

    const parseChainId = (value: unknown): number | null => {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      if (!trimmed) return null;

      const parsed = trimmed.startsWith("0x")
        ? parseInt(trimmed, 16)
        : /^\d+$/.test(trimmed)
          ? parseInt(trimmed, 10)
          : NaN;

      return Number.isFinite(parsed) ? parsed : null;
    };

    const applyChainIdIfSupported = (chainId: number) => {
      if (!options.some((o) => o.chainId === chainId)) return;
      setSelectedChainId(chainId);
    };

    const handleChainChanged = (chainIdValue: unknown) => {
      const chainId = parseChainId(chainIdValue);
      if (chainId === null) return;
      applyChainIdIfSupported(chainId);
    };

    provider.on?.("chainChanged", handleChainChanged);
    return () => provider.removeListener?.("chainChanged", handleChainChanged);
  }, [chains.length, options]);

  const handleConnectWallet = useCallback(async () => {
    const provider = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!provider?.request) return;

    setConnectBusy(true);
    try {
      const accounts = await provider.request({
        method: "eth_requestAccounts",
      });
      const address = parseFirstEthAccount(accounts);
      setWalletAddress(address);
      setWalletStatus(address ? "connected" : "disconnected");
    } catch {
      setWalletAddress(null);
      setWalletStatus("disconnected");
    } finally {
      setConnectBusy(false);
    }
  }, []);

  const selected = useMemo(() => {
    return chains.find((c) => c.chainId === selectedChainId) || null;
  }, [chains, selectedChainId]);

  const displayedOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;

    const filtered = options.filter((o) => o.label.toLowerCase().includes(q));
    if (filtered.some((o) => o.chainId === selectedChainId)) return filtered;

    const selectedOption = options.find((o) => o.chainId === selectedChainId);
    return selectedOption ? [selectedOption, ...filtered] : filtered;
  }, [options, searchQuery, selectedChainId]);

  const faucets = useMemo(() => selected?.faucets ?? [], [selected]);
  const resolvedFaucetUrls = useMemo(() => {
    return faucets.map((url) =>
      walletAddress ? url.replace(/\$\{ADDRESS\}/g, encodeURIComponent(walletAddress)) : url
    );
  }, [faucets, walletAddress]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-card">
      {chains.length === 0 ? (
        <>
          <div className="text-sm font-semibold text-gray-700 mb-1">Faucet</div>
          <div className="text-sm text-gray-500">
            No faucet entries found in chains.yaml
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">
              Choose chain
            </label>
            <input
              className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm font-sans focus:outline-none focus:border-primary"
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              placeholder="Search chains..."
            />
            <select
              className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm font-sans focus:outline-none focus:border-primary"
              value={selectedChainId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setSelectedChainId(parseInt(e.target.value, 10))
              }
            >
              {displayedOptions.map((o) => (
                <option key={o.chainId} value={o.chainId}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-600">
              <span className="font-semibold text-gray-700">已连接地址：</span>
              {walletStatus === "loading" ? (
                <span className="text-gray-500">读取中…</span>
              ) : walletStatus === "no_provider" ? (
                <span className="text-gray-500">未检测到钱包</span>
              ) : walletAddress ? (
                <span className="font-mono text-gray-900 break-all">
                  {walletAddress}
                </span>
              ) : (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className="text-gray-500">
                    未连接（eth_accounts 为空）
                  </span>
                  <button
                    type="button"
                    disabled={connectBusy}
                    onClick={() => void handleConnectWallet()}
                    className="shrink-0 rounded-lg border-2 border-primary bg-primary px-3 py-1 text-xs font-semibold text-white transition-all hover:opacity-95 disabled:opacity-50"
                  >
                    {connectBusy ? "连接中…" : "连接钱包"}
                  </button>
                </span>
              )}
            </div>
          </div>

          <div className="mt-5">
            <div className="text-sm font-semibold text-gray-700 mb-2">
              Faucet links
            </div>

            {faucets.length === 0 ? (
              <div className="text-sm text-gray-500">
                No faucet configured for this chain
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {resolvedFaucetUrls.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-primary text-white py-2.5 px-4 rounded-lg font-semibold transition-all hover:opacity-95"
                  >
                    Open faucet
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
