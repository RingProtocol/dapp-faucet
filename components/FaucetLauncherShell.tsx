"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChainFaucetPicker,
  type ChainFaucetInfo,
} from "@/components/ChainFaucetPicker";
import { DappsdkTestcase } from "@/components/DappsdkTestcase";

type View = "faucet" | "sdk-test";

function parseFirstEthAccount(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const first = value[0];
  if (typeof first !== "string") return null;
  const trimmed = first.trim();
  return trimmed ? trimmed : null;
}

function parseChainId(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = trimmed.startsWith("0x")
    ? parseInt(trimmed, 16)
    : /^\d+$/.test(trimmed)
      ? parseInt(trimmed, 10)
      : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function FaucetLauncherShell({ chains }: { chains: ChainFaucetInfo[] }) {
  const [view, setView] = useState<View>("faucet");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [walletStatus, setWalletStatus] = useState<
    "loading" | "no_provider" | "disconnected" | "connected"
  >("loading");
  const [chainStatus, setChainStatus] = useState<
    "loading" | "no_provider" | "ready"
  >("loading");
  const [connectBusy, setConnectBusy] = useState(false);

  const tabClass = (active: boolean) =>
    [
      "px-4 py-2 rounded-lg text-sm font-semibold transition-all border-2",
      active
        ? "bg-white text-primary border-primary shadow-sm"
        : "bg-white/10 text-white border-white/30 hover:bg-white/20",
    ].join(" ");

  useEffect(() => {
    const provider = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!provider?.request) {
      setWalletAddress(null);
      setChainId(null);
      setWalletStatus("no_provider");
      setChainStatus("no_provider");
      return;
    }

    const refresh = async () => {
      try {
        const [accounts, chainIdValue] = await Promise.all([
          provider.request({ method: "eth_accounts" }),
          provider.request({ method: "eth_chainId" }),
        ]);
        const address = parseFirstEthAccount(accounts);
        setWalletAddress(address);
        setWalletStatus(address ? "connected" : "disconnected");
        setChainId(parseChainId(chainIdValue));
        setChainStatus("ready");
      } catch {
        setWalletAddress(null);
        setChainId(null);
        setWalletStatus("disconnected");
        setChainStatus("ready");
      }
    };

    void refresh();

    const handleAccountsChanged = (accounts: unknown) => {
      const address = parseFirstEthAccount(accounts);
      setWalletAddress(address);
      setWalletStatus(address ? "connected" : "disconnected");
    };

    const handleChainChanged = (chainIdValue: unknown) => {
      setChainId(parseChainId(chainIdValue));
      setChainStatus("ready");
    };

    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

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

  const chainLabel = useMemo(() => {
    if (chainStatus === "loading") return "Loading…";
    if (chainStatus === "no_provider") return "No wallet detected";
    if (chainId == null) return "Unknown";
    const matched = chains.find((chain) => chain.chainId === chainId);
    return matched ? `${matched.name} (${chainId})` : `${chainId}`;
  }, [chainId, chainStatus, chains]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white shadow-card backdrop-blur-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid gap-3 md:grid-cols-2 lg:flex-1">
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                Current chain
              </div>
              <div className="mt-1 text-sm font-semibold break-all">
                {chainLabel}
              </div>
              <div className="mt-1 text-xs text-white/70">
                DApp may switch chain dynamically; wallet follows the chain the DApp requests.
              </div>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                Selected wallet
              </div>
              <div className="mt-1 text-sm font-semibold break-all">
                {walletStatus === "loading"
                  ? "Loading…"
                  : walletStatus === "no_provider"
                    ? "No wallet detected"
                    : walletAddress ?? "Disconnected"}
              </div>
              <div className="mt-1 text-xs text-white/70">
                Address is controlled by the wallet account currently selected in Ring Wallet.
              </div>
            </div>
          </div>
          {walletStatus === "disconnected" ? (
            <button
              type="button"
              onClick={() => void handleConnectWallet()}
              disabled={connectBusy}
              className="shrink-0 rounded-xl border-2 border-white/40 bg-white px-4 py-2 text-sm font-semibold text-primary transition-all hover:opacity-95 disabled:opacity-50"
            >
              {connectBusy ? "Connecting…" : "Connect wallet"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-start">
        <div className="flex-1 min-w-0 order-2 lg:order-1">
          {view === "faucet" ? (
            <ChainFaucetPicker chains={chains} />
          ) : (
            <DappsdkTestcase />
          )}
        </div>

        <div
          className="flex flex-row lg:flex-col gap-2 shrink-0 order-1 lg:order-2 justify-center lg:justify-start"
          role="tablist"
          aria-label="Main views"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "faucet"}
            className={tabClass(view === "faucet")}
            onClick={() => setView("faucet")}
          >
            Faucet
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "sdk-test"}
            className={tabClass(view === "sdk-test")}
            onClick={() => setView("sdk-test")}
          >
            test-sdk
          </button>
        </div>
      </div>
    </div>
  );
}
