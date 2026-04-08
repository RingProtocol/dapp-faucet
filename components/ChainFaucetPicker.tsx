"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";

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
  console.log("parseFirstEthAccount:value=", value)
  if (!Array.isArray(value)) return null;
  const first = value[0];
  if (typeof first !== "string") return null;
  const trimmed = first.trim();
  return trimmed ? trimmed : null;
}

function openFaucetButtonLabel(resolvedUrl: string): string {
  try {
    const host = new URL(resolvedUrl).host;
    return `Open faucet: ${host}`;
  } catch {
    return "Open faucet";
  }
}

export function ChainFaucetPicker({ chains }: { chains: ChainFaucetInfo[] }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

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
      console.log("provider==null.")
      setWalletAddress(null);
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      console.log("handleMsg: event=", event)
      const data = event.data;
      if (data && typeof data === "object" && data.type === "ring_wallet_handshake_ack") {
        const address = parseFirstEthAccount(data.accounts);
        setWalletAddress(address);
      }
    };

    window.addEventListener("message", handleMessage);

    const refresh = async () => {
      try {
        const accounts = await provider.request({ method: "eth_accounts" });
        const address = parseFirstEthAccount(accounts);
        setWalletAddress(address);
      } catch {
        setWalletAddress(null);
      }
    };

    void refresh();

    const handleAccountsChanged = (accounts: unknown) => {
      const address = parseFirstEthAccount(accounts);
      setWalletAddress(address);
    };

    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("chainChanged", handleAccountsChanged);

    console.log("provider=", provider);
    console.log("provider.on", provider.on);

    return () => {
      window.removeEventListener("message", handleMessage);
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleAccountsChanged);
    };
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

  const selected = useMemo(() => {
    return chains.find((c) => c.chainId === selectedChainId) || null;
  }, [chains, selectedChainId]);

  const displayedOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchQuery]);

  // When the filter excludes the current selection, move selection to the first visible chain
  // so the <select> shows a Hyper* chain after typing "hyper", not the previous Sepolia default.
  useEffect(() => {
    if (displayedOptions.length === 0) return;
    if (displayedOptions.some((o) => o.chainId === selectedChainId)) return;
    setSelectedChainId(displayedOptions[0].chainId);
  }, [displayedOptions, selectedChainId]);

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
            <div className="rounded-lg border-2 border-gray-200 overflow-hidden transition-colors focus-within:border-primary">
              <input
                type="search"
                aria-label="Filter chains"
                className="w-full px-3 py-2.5 text-sm font-sans border-0 border-b-2 border-gray-200 bg-white placeholder:text-gray-400 focus:outline-none focus:bg-gray-50/80"
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setSearchQuery(e.target.value)
                }
                placeholder="Search chains..."
              />
              {displayedOptions.length === 0 && searchQuery.trim() ? (
                <div className="px-3 py-2.5 text-sm text-gray-500 bg-gray-50/80">
                  No chains match this filter.
                </div>
              ) : (
                <select
                  className="w-full p-3 border-0 rounded-none text-sm font-sans bg-white focus:outline-none focus:ring-0"
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
                {resolvedFaucetUrls.map((url, index) => (
                  <a
                    key={`${index}-${url}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-primary text-white py-2.5 px-4 rounded-lg font-semibold text-center transition-all hover:opacity-95 break-all"
                  >
                    {openFaucetButtonLabel(url)}
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
