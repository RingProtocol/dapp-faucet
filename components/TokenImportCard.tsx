"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface TokenImportCardProps {
  isConnected: boolean;
  isLoading: boolean;
  onImport: (address: string) => Promise<void>;
}

export function TokenImportCard({
  isConnected,
  isLoading,
  onImport,
}: TokenImportCardProps) {
  const [address, setAddress] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    await onImport(address);
    setAddress("");
  };

  return (
    <div className="bg-white rounded-2xl p-6 mb-5 shadow-card">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Import ERC20 Token</h2>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Token Contract Address (0x...)"
          className={cn(
            "w-full p-3 border-2 border-gray-200 rounded-lg mb-4",
            "text-sm font-sans",
            "focus:outline-none focus:border-primary",
            "placeholder:text-gray-400"
          )}
        />
        <button
          type="submit"
          disabled={!address || isLoading || !isConnected}
          className={cn(
            "w-full py-3.5 px-6 rounded-lg font-semibold transition-all",
            "bg-gray-100 text-gray-800",
            "hover:bg-gray-200",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? "Importing..." : "Import Token"}
        </button>
      </form>
    </div>
  );
}
