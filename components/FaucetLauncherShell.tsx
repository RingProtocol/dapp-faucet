"use client";

import { useState } from "react";
import {
  ChainFaucetPicker,
  type ChainFaucetInfo,
} from "@/components/ChainFaucetPicker";
import { DappsdkTestcase } from "@/components/DappsdkTestcase";

type View = "faucet" | "sdk-test";

export function FaucetLauncherShell({ chains }: { chains: ChainFaucetInfo[] }) {
  const [view, setView] = useState<View>("faucet");

  const tabClass = (active: boolean) =>
    [
      "px-4 py-2 rounded-lg text-sm font-semibold transition-all border-2",
      active
        ? "bg-white text-primary border-primary shadow-sm"
        : "bg-white/10 text-white border-white/30 hover:bg-white/20",
    ].join(" ");

  return (
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
  );
}
