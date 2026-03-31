"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

export type ChainFaucetInfo = {
  chainId: number;
  name: string;
  faucets: string[];
};

export function ChainFaucetPicker({ chains }: { chains: ChainFaucetInfo[] }) {
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
    options[0]?.chainId ?? 0
  );

  const didAutoSelectFromProvider = useRef(false);

  useEffect(() => {
    if (chains.length === 0) return;
    if (selectedChainId !== 0) return;
    if (!options[0]?.chainId) return;
    setSelectedChainId(options[0].chainId);
  }, [chains.length, options, selectedChainId]);

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

    const init = async () => {
      if (didAutoSelectFromProvider.current) return;
      try {
        const chainIdValue = await provider.request({ method: "eth_chainId" });
        const chainId = parseChainId(chainIdValue);
        if (chainId === null) return;
        applyChainIdIfSupported(chainId);
        didAutoSelectFromProvider.current = true;
      } catch {}
    };

    void init();

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

    const filtered = options.filter((o) => o.label.toLowerCase().includes(q));
    if (filtered.some((o) => o.chainId === selectedChainId)) return filtered;

    const selectedOption = options.find((o) => o.chainId === selectedChainId);
    return selectedOption ? [selectedOption, ...filtered] : filtered;
  }, [options, searchQuery, selectedChainId]);

  const faucets = selected?.faucets ?? [];

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
                {faucets.map((url) => (
                  <a
                    key={url}
                    href={url}
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
