"use client";

import { useCallback, useState } from "react";

type SdkRow = {
  /** EIP-1193 `request({ method })` name */
  method: string;
  /** JSON-serializable params passed to `ethereum.request` */
  params: unknown[];
  note?: string;
};

/** Exercises Ring `dappsdk.js` (`RingWalletProvider`) EIP-1193 surface: local vs wallet-backed RPC. */
const SDK_ROWS: SdkRow[] = [
  {
    method: "eth_chainId",
    params: [],
    note: "Resolved locally after handshake (see dappsdk.js).",
  },
  {
    method: "eth_accounts",
    params: [],
    note: "Resolved locally from cached accounts.",
  },
  {
    method: "eth_requestAccounts",
    params: [],
    note: "Forwarded via postMessage (`ring_wallet_request`).",
  },
];

function formatError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: string }).message;
    const c = (err as { code?: number }).code;
    const parts = [c != null ? `code ${c}` : null, m].filter(Boolean);
    return parts.join(": ");
  }
  return String(err);
}

export function DappsdkTestcase() {
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);

  const run = useCallback(async (method: string, params: unknown[]) => {
    const eth = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!eth?.request) {
      setResults((prev) => ({
        ...prev,
        [method]: "No provider: window.ethereum.request is missing (load dappsdk in wallet iframe).",
      }));
      return;
    }

    setLoading(method);
    try {
      const result = await eth.request({ method, params });
      setResults((prev) => ({
        ...prev,
        [method]:
          typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2),
      }));
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [method]: `Error: ${formatError(e)}`,
      }));
    } finally {
      setLoading(null);
    }
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-card overflow-x-auto">
      <div className="text-sm font-semibold text-gray-700 mb-1">
        DApp SDK (EIP-1193)
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Calls mirror <code className="text-gray-700">public/dappsdk.js</code>{" "}
        <code className="text-gray-700">RingWalletProvider.prototype.request</code>.
      </p>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200 text-left text-gray-600">
            <th className="py-2 pr-3 font-semibold w-[28%]">函数名</th>
            <th className="py-2 pr-3 font-semibold w-[32%]">参数</th>
            <th className="py-2 font-semibold">结果</th>
          </tr>
        </thead>
        <tbody>
          {SDK_ROWS.map((row) => (
            <tr
              key={row.method}
              className="border-b border-gray-100 align-top"
            >
              <td className="py-3 pr-3">
                <div className="font-mono text-gray-900">{row.method}</div>
                {row.note ? (
                  <p className="text-xs text-gray-500 mt-1">{row.note}</p>
                ) : null}
                <button
                  type="button"
                  className="mt-2 inline-flex items-center justify-center bg-primary text-white text-xs py-1.5 px-3 rounded-lg font-semibold transition-all hover:opacity-95 disabled:opacity-50"
                  disabled={loading === row.method}
                  onClick={() => void run(row.method, row.params)}
                >
                  {loading === row.method ? "…" : "Run"}
                </button>
              </td>
              <td className="py-3 pr-3">
                <pre className="font-mono text-xs text-gray-800 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap break-all">
                  {JSON.stringify(row.params, null, 2)}
                </pre>
              </td>
              <td className="py-3">
                <pre className="font-mono text-xs text-gray-800 bg-gray-50 rounded-lg p-2 min-h-[2.5rem] whitespace-pre-wrap break-all">
                  {results[row.method] ?? "—"}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
