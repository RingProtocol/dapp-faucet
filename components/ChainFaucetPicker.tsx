"use client";

import { useMemo, useState, type ChangeEvent } from "react";

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

  const [selectedChainId, setSelectedChainId] = useState<number>(
    options[0]?.chainId ?? 0
  );

  const selected = useMemo(() => {
    return chains.find((c) => c.chainId === selectedChainId) || null;
  }, [chains, selectedChainId]);

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
            <select
              className="w-full p-3 border-2 border-gray-200 rounded-lg text-sm font-sans focus:outline-none focus:border-primary"
              value={selectedChainId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setSelectedChainId(parseInt(e.target.value, 10))
              }
            >
              {options.map((o) => (
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
