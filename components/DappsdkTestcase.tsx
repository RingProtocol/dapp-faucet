"use client";

import { useCallback, useState } from "react";

/** Minimal EIP-712 payload for `eth_signTypedData_v4` smoke test (edit domain/message as needed). */
const DEFAULT_TYPED_DATA_V4 = {
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    Message: [{ name: "content", type: "string" }],
  },
  primaryType: "Message" as const,
  domain: {
    name: "Ring SDK testcase",
    version: "1",
    chainId: 1,
    verifyingContract: "0x0000000000000000000000000000000000000000",
  },
  message: {
    content: "typed data smoke test",
  },
};

/** `wallet_addEthereumChain` example — Sepolia (EIP-3085). Replace rpcUrls with your RPC if needed. */
const DEFAULT_ADD_CHAIN = {
  chainId: "0xaa36a7",
  chainName: "Sepolia",
  nativeCurrency: {
    name: "Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

type SdkRow = {
  id: string;
  method: string;
  params: unknown[];
  note?: string;
};

/** Exercises Ring `dappsdk.js` (`RingWalletProvider`) — local shortcuts + postMessage RPC. */
const SDK_ROWS: SdkRow[] = [
  {
    id: "eth_chainId",
    method: "eth_chainId",
    params: [],
    note: "本地缓存（握手后）。",
  },
  {
    id: "eth_accounts",
    method: "eth_accounts",
    params: [],
    note: "本地缓存账户列表。",
  },
  {
    id: "net_version",
    method: "net_version",
    params: [],
    note: "本地由 chainId 推导十进制字符串。",
  },
  {
    id: "eth_requestAccounts",
    method: "eth_requestAccounts",
    params: [],
    note: "postMessage → ring_wallet_request。",
  },
  {
    id: "wallet_switchEthereumChain",
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x1" }],
    note: "默认切到 Ethereum 主网（0x1）；可按需改 chainId。",
  },
  {
    id: "wallet_addEthereumChain",
    method: "wallet_addEthereumChain",
    params: [DEFAULT_ADD_CHAIN],
    note: "默认添加 Sepolia；可改 chainId / rpcUrls。",
  },
  {
    id: "personal_sign",
    method: "personal_sign",
    params: [
      "0x48656c6c6f2052696e67",
      "0x0000000000000000000000000000000000000000",
    ],
    note: "UTF-8「Hello Ring」的 hex；第二项为占位地址，连接后请换成当前账户。",
  },
  {
    id: "eth_signTypedData_v4",
    method: "eth_signTypedData_v4",
    params: [
      "0x0000000000000000000000000000000000000000",
      DEFAULT_TYPED_DATA_V4,
    ],
    note: "占位 signer 地址；连接后请换成当前账户。第二项为 EIP-712 对象（见 DEFAULT_TYPED_DATA_V4）。",
  },
  {
    id: "eth_getBalance",
    method: "eth_getBalance",
    params: ["0x0000000000000000000000000000000000000000", "latest"],
    note: "零地址余额示例；可换成任意 checksummed 地址。",
  },
  {
    id: "eth_blockNumber",
    method: "eth_blockNumber",
    params: [],
    note: "通常由钱包 / 节点转发 JSON-RPC。",
  },
  {
    id: "eth_gasPrice",
    method: "eth_gasPrice",
    params: [],
    note: "通常由钱包 / 节点转发。",
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

  const run = useCallback(async (row: SdkRow) => {
    const eth = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!eth?.request) {
      setResults((prev) => ({
        ...prev,
        [row.id]:
          "No provider: window.ethereum.request is missing (load dappsdk in wallet iframe).",
      }));
      return;
    }

    setLoading(row.id);
    try {
      const result = await eth.request({
        method: row.method,
        params: row.params,
      });
      setResults((prev) => ({
        ...prev,
        [row.id]:
          typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2),
      }));
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [row.id]: `Error: ${formatError(e)}`,
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
        <code className="text-gray-700">RingWalletProvider.prototype.request</code>
        。带参数的用例已填默认 JSON，可在源码里改{" "}
        <code className="text-gray-700">SDK_ROWS</code>。
      </p>

      <table className="w-full text-sm border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b-2 border-gray-200 text-left text-gray-600">
            <th className="py-2 pr-3 font-semibold w-[26%]">函数名</th>
            <th className="py-2 pr-3 font-semibold w-[38%]">参数</th>
            <th className="py-2 font-semibold">结果</th>
          </tr>
        </thead>
        <tbody>
          {SDK_ROWS.map((row) => (
            <tr
              key={row.id}
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
                  disabled={loading === row.id}
                  onClick={() => void run(row)}
                >
                  {loading === row.id ? "…" : "Run"}
                </button>
              </td>
              <td className="py-3 pr-3">
                <pre className="font-mono text-xs text-gray-800 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                  {JSON.stringify(row.params, null, 2)}
                </pre>
              </td>
              <td className="py-3">
                <pre className="font-mono text-xs text-gray-800 bg-gray-50 rounded-lg p-2 min-h-[2.5rem] max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                  {results[row.id] ?? "—"}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
