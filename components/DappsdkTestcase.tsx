"use client";

import { useCallback, useMemo, useState } from "react";

const ZERO = "0x0000000000000000000000000000000000000000";

/** 通用 EIP-712（简单 Message），用于 `eth_signTypedData_v4`。 */
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
    verifyingContract: ZERO,
  },
  message: {
    content: "typed data smoke test",
  },
};

/** EIP-2612 Permit 形态（字段齐全，便于测钱包解析）；`verifyingContract` / `owner` 需按实际代币与账户修改。 */
function buildPermitTypedDataV4(signer: string) {
  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit" as const,
    domain: {
      name: "ExampleToken",
      version: "1",
      chainId: 11155111,
      verifyingContract: "0x0000000000000000000000000000000000000001",
    },
    message: {
      owner: signer,
      spender: ZERO,
      value: "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      nonce: "0",
      deadline: "2000000000",
    },
  };
}

/** MetaMask 等常用的 v3 形态（domain 与 message 分栏）。 */
function buildTypedDataV3(signer: string) {
  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Mail: [
        { name: "from", type: "Person" },
        { name: "to", type: "Person" },
        { name: "contents", type: "string" },
      ],
      Person: [
        { name: "name", type: "string" },
        { name: "wallet", type: "address" },
      ],
    },
    primaryType: "Mail" as const,
    domain: {
      name: "Ether Mail",
      version: "1",
      chainId: 1,
      verifyingContract: ZERO,
    },
    message: {
      from: { name: "Cow", wallet: signer },
      to: { name: "Bob", wallet: ZERO },
      contents: "Hello, Bob!",
    },
  };
}

/** `wallet_addEthereumChain` — Sepolia。 */
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

const APPROVE_TEST_ID = "erc20_approve_simulation";
const MAX_UINT256_DECIMAL =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

type ApproveForm = {
  tokenAddress: string;
  spenderAddress: string;
  amount: string;
};

const DEFAULT_APPROVE_FORM: ApproveForm = {
  tokenAddress: "0x2b95EB0A2461BBFCe6d65fe6DE259795D7662532",
  spenderAddress: "0x9A76e0d12832676d13C54B7F4dE659D9df875AB9",
  amount: MAX_UINT256_DECIMAL,
};

type SdkSection = "基础与链" | "只读 RPC" | "签名" | "广播";

type SdkRow = {
  id: string;
  method: string;
  section: SdkSection;
  /** 静态展示与默认执行参数（若存在 getParams 则 Run 时用 getParams 结果替换）。 */
  params: unknown[];
  note?: string;
  /** Run 前拉取 `eth_accounts`，用当前地址生成最终 params（签名/交易 from 等）。 */
  getParams?: (accounts: string[]) => unknown[];
};

const SDK_ROWS: SdkRow[] = [
  {
    id: "eth_chainId",
    method: "eth_chainId",
    section: "基础与链",
    params: [],
    note: "本地缓存（握手后）。",
  },
  {
    id: "eth_accounts",
    method: "eth_accounts",
    section: "基础与链",
    params: [],
    note: "本地缓存账户列表。",
  },
  {
    id: "net_version",
    method: "net_version",
    section: "基础与链",
    params: [],
    note: "本地由 chainId 推导十进制字符串。",
  },
  {
    id: "eth_requestAccounts",
    method: "eth_requestAccounts",
    section: "基础与链",
    params: [],
    note: "postMessage → ring_wallet_request。",
  },
  {
    id: "wallet_switchEthereumChain",
    method: "wallet_switchEthereumChain",
    section: "基础与链",
    params: [{ chainId: "0x1" }],
    note: "默认主网 0x1；可按需修改。",
  },
  {
    id: "wallet_addEthereumChain",
    method: "wallet_addEthereumChain",
    section: "基础与链",
    params: [DEFAULT_ADD_CHAIN],
    note: "默认 Sepolia。",
  },
  {
    id: "eth_getBalance",
    method: "eth_getBalance",
    section: "只读 RPC",
    params: [ZERO, "latest"],
    note: "可改为任意地址。",
  },
  {
    id: "eth_blockNumber",
    method: "eth_blockNumber",
    section: "只读 RPC",
    params: [],
  },
  {
    id: "eth_gasPrice",
    method: "eth_gasPrice",
    section: "只读 RPC",
    params: [],
  },
  {
    id: "eth_estimateGas",
    method: "eth_estimateGas",
    section: "只读 RPC",
    params: [
      {
        from: ZERO,
        to: ZERO,
        value: "0x0",
        data: "0x",
      },
    ],
    note: "估算 gas；Run 时会将 from 填为当前账户（若已连接）。",
    getParams: (accounts) => [
      {
        from: accounts[0] ?? ZERO,
        to: ZERO,
        value: "0x0",
        data: "0x",
      },
    ],
  },
  {
    id: "personal_sign_hex",
    method: "personal_sign",
    section: "签名",
    params: ["0x48656c6c6f2052696e67", ZERO],
    note: "EIP-191 personal_sign；消息为 UTF-8「Hello Ring」的 hex。Run 时第二项填当前账户。",
    getParams: (accounts) => [
      "0x48656c6c6f2052696e67",
      accounts[0] ?? ZERO,
    ],
  },
  {
    id: "personal_sign_plain",
    method: "personal_sign",
    section: "签名",
    params: ["Ring SDK testcase — plain UTF-8 string", ZERO],
    note: "部分钱包接受明文 string；未连接时第二项为零地址。",
    getParams: (accounts) => [
      "Ring SDK testcase — plain UTF-8 string",
      accounts[0] ?? ZERO,
    ],
  },
  {
    id: "eth_sign",
    method: "eth_sign",
    section: "签名",
    params: [ZERO, "0x" + "00".repeat(32)],
    note: "⚠️ 危险接口：签名任意 32 字节哈希。仅测试环境使用。Run 时第一项为当前账户。",
    getParams: (accounts) => [
      accounts[0] ?? ZERO,
      "0x" + "00".repeat(32),
    ],
  },
  {
    id: "eth_signTypedData_v3",
    method: "eth_signTypedData_v3",
    section: "签名",
    params: [ZERO, buildTypedDataV3(ZERO)],
    note: "EIP-712 v3（Mail/Person）。Run 时替换为当前 signer。",
    getParams: (accounts) => {
      const s = accounts[0] ?? ZERO;
      return [s, buildTypedDataV3(s)];
    },
  },
  {
    id: "eth_signTypedData_v4",
    method: "eth_signTypedData_v4",
    section: "签名",
    params: [ZERO, DEFAULT_TYPED_DATA_V4],
    note: "简单 Message 结构。Run 时地址填当前账户。",
    getParams: (accounts) => [accounts[0] ?? ZERO, DEFAULT_TYPED_DATA_V4],
  },
  {
    id: "eth_signTypedData_v4_permit",
    method: "eth_signTypedData_v4",
    section: "签名",
    params: [ZERO, buildPermitTypedDataV4(ZERO)],
    note: "EIP-2612 Permit 完整字段；domain.verifyingContract 请换成真实代币合约。",
    getParams: (accounts) => {
      const s = accounts[0] ?? ZERO;
      return [s, buildPermitTypedDataV4(s)];
    },
  },
  {
    id: "eth_sendTransaction_legacy",
    method: "eth_sendTransaction",
    section: "广播",
    params: [
      {
        from: ZERO,
        to: ZERO,
        value: "0x0",
        gas: "0x5208",
        gasPrice: "0x3b9aca00",
        data: "0x",
      },
    ],
    note: "Legacy gasPrice。0 value 空 data；from/to Run 时填当前账户（自转 0 ETH 模板，钱包仍会弹窗）。",
    getParams: (accounts) => {
      const a = accounts[0] ?? ZERO;
      return [
        {
          from: a,
          to: a,
          value: "0x0",
          gas: "0x5208",
          gasPrice: "0x3b9aca00",
          data: "0x",
        },
      ];
    },
  },
  {
    id: "eth_sendTransaction_eip1559",
    method: "eth_sendTransaction",
    section: "广播",
    params: [
      {
        from: ZERO,
        to: ZERO,
        value: "0x0",
        gas: "0x5208",
        maxFeePerGas: "0x2540be400",
        maxPriorityFeePerGas: "0x77359400",
        data: "0x",
      },
    ],
    note: "EIP-1559（maxFee / priority）。可按链调 gas；value 可改为 wei hex。",
    getParams: (accounts) => {
      const a = accounts[0] ?? ZERO;
      return [
        {
          from: a,
          to: a,
          value: "0x0",
          gas: "0x5208",
          maxFeePerGas: "0x2540be400",
          maxPriorityFeePerGas: "0x77359400",
          data: "0x",
        },
      ];
    },
  },
  {
    id: "eth_sendTransaction_contract_call",
    method: "eth_sendTransaction",
    section: "广播",
    params: [
      {
        from: ZERO,
        to: "0x0000000000000000000000000000000000000001",
        value: "0x0",
        gas: "0xf4240",
        maxFeePerGas: "0x2540be400",
        maxPriorityFeePerGas: "0x77359400",
        data:
          "0xa9059cbb00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000",
      },
    ],
    note: "ERC20 transfer(address,uint256) 编码示例：to=0x…02，amount=0（无效调用，仅展示 data 形态）。请改 `to` 为合约地址、`data` 为真实 calldata。",
    getParams: (accounts) => {
      const a = accounts[0] ?? ZERO;
      return [
        {
          from: a,
          to: "0x0000000000000000000000000000000000000001",
          value: "0x0",
          gas: "0xf4240",
          maxFeePerGas: "0x2540be400",
          maxPriorityFeePerGas: "0x77359400",
          data:
            "0xa9059cbb00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000",
        },
      ];
    },
  },
  {
    id: "eth_signTransaction",
    method: "eth_signTransaction",
    section: "广播",
    params: [
      {
        from: ZERO,
        to: ZERO,
        value: "0x0",
        gas: "0x5208",
        maxFeePerGas: "0x2540be400",
        maxPriorityFeePerGas: "0x77359400",
        data: "0x",
      },
    ],
    note: "仅签名不上链（部分钱包支持）。返回 raw 或 RLP 由钱包决定。",
    getParams: (accounts) => {
      const a = accounts[0] ?? ZERO;
      return [
        {
          from: a,
          to: a,
          value: "0x0",
          gas: "0x5208",
          maxFeePerGas: "0x2540be400",
          maxPriorityFeePerGas: "0x77359400",
          data: "0x",
        },
      ];
    },
  },
  {
    id: "eth_sendRawTransaction",
    method: "eth_sendRawTransaction",
    section: "广播",
    params: ["0xREPLACE_WITH_FULL_SIGNED_RAW_TX"],
    note: "提交已签名 RLP（type-2 以 0x02 开头，legacy 以 0xf8 开头）。占位无效；请换成 `eth_signTransaction` 或离线签名得到的完整 hex。",
  },
];

const SECTION_ORDER: SdkSection[] = [
  "基础与链",
  "只读 RPC",
  "签名",
  "广播",
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

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function parseUint256Input(value: string): bigint | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = BigInt(trimmed);
    if (parsed < BigInt(0)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function padToBytes(hex: string, bytes: number): string {
  return hex.padStart(bytes * 2, "0");
}

function encodeApproveCalldata(spenderAddress: string, amount: string): string | null {
  if (!isAddress(spenderAddress)) return null;
  const parsedAmount = parseUint256Input(amount);
  if (parsedAmount == null) return null;
  const spender = spenderAddress.trim().slice(2).toLowerCase();
  const amountHex = parsedAmount.toString(16);
  if (amountHex.length > 64) return null;
  return `0x095ea7b3${padToBytes(spender, 32)}${padToBytes(amountHex, 32)}`;
}

function buildApproveTransaction(
  from: string,
  form: ApproveForm
): { tx: Record<string, string>; calldata: string } | { error: string } {
  if (!isAddress(from)) {
    return { error: "当前账户地址无效，请先连接钱包。" };
  }
  if (!isAddress(form.tokenAddress)) {
    return { error: "Token 合约地址格式不正确。" };
  }
  if (!isAddress(form.spenderAddress)) {
    return { error: "Spender 地址格式不正确。" };
  }

  const calldata = encodeApproveCalldata(form.spenderAddress, form.amount);
  if (!calldata) {
    return { error: "Approve amount 仅支持非负十进制或 0x 开头的十六进制。" };
  }

  return {
    tx: {
      from,
      to: form.tokenAddress.trim(),
      value: "0x0",
      data: calldata,
    },
    calldata,
  };
}

async function resolveParamsWithAccounts(
  row: SdkRow,
  eth: NonNullable<Window["ethereum"]>
): Promise<unknown[]> {
  if (!row.getParams) return row.params;
  const accounts = (await eth.request({
    method: "eth_accounts",
  })) as string[];
  return row.getParams(Array.isArray(accounts) ? accounts : []);
}

type ParamPreview = { json: string; hint: string };

export function DappsdkTestcase() {
  const [results, setResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [paramPreviews, setParamPreviews] = useState<Record<string, ParamPreview>>(
    {}
  );
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [approveForm, setApproveForm] = useState<ApproveForm>(DEFAULT_APPROVE_FORM);
  const [approvePreview, setApprovePreview] = useState<ParamPreview | null>(null);

  const rowsBySection = useMemo(() => {
    const map = new Map<SdkSection, SdkRow[]>();
    for (const s of SECTION_ORDER) map.set(s, []);
    for (const row of SDK_ROWS) {
      const list = map.get(row.section) ?? [];
      list.push(row);
      map.set(row.section, list);
    }
    return map;
  }, []);

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
      const params = await resolveParamsWithAccounts(row, eth);

      const result = await eth.request({
        method: row.method,
        params,
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

  const previewInjectedParams = useCallback(async (row: SdkRow) => {
    if (!row.getParams) return;
    const eth = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!eth?.request) {
      setParamPreviews((prev) => ({
        ...prev,
        [row.id]: {
          json: "",
          hint: "无 provider，无法预览。",
        },
      }));
      return;
    }

    setPreviewLoadingId(row.id);
    try {
      const accounts = (await eth.request({
        method: "eth_accounts",
      })) as string[];
      const list = Array.isArray(accounts) ? accounts : [];
      const params = row.getParams(list);
      const hint =
        list[0] != null
          ? `eth_accounts[0]: ${list[0]}`
          : "未连接账户（数组为空），注入处仍为零地址占位。可先 Run「eth_requestAccounts」再预览。";
      setParamPreviews((prev) => ({
        ...prev,
        [row.id]: {
          json: JSON.stringify(params, null, 2),
          hint,
        },
      }));
    } catch (e) {
      setParamPreviews((prev) => ({
        ...prev,
        [row.id]: {
          json: "",
          hint: `预览失败: ${formatError(e)}`,
        },
      }));
    } finally {
      setPreviewLoadingId(null);
    }
  }, []);

  const updateApproveForm = useCallback(
    (field: keyof ApproveForm, value: string) => {
      setApproveForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const previewApprove = useCallback(async () => {
    const eth = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!eth?.request) {
      setApprovePreview({
        json: "",
        hint: "无 provider，无法预览 approve 交易。",
      });
      return;
    }

    setPreviewLoadingId(APPROVE_TEST_ID);
    try {
      const accounts = (await eth.request({
        method: "eth_accounts",
      })) as string[];
      const account = Array.isArray(accounts) ? (accounts[0] ?? ZERO) : ZERO;
      const built = buildApproveTransaction(account, approveForm);
      if ("error" in built) {
        setApprovePreview({
          json: "",
          hint: built.error,
        });
        return;
      }

      setApprovePreview({
        json: JSON.stringify([built.tx], null, 2),
        hint:
          account === ZERO
            ? "eth_accounts 为空，from 仍为零地址占位；可先 Run「eth_requestAccounts」后再预览。"
            : `eth_accounts[0]: ${account}`,
      });
    } catch (e) {
      setApprovePreview({
        json: "",
        hint: `预览失败: ${formatError(e)}`,
      });
    } finally {
      setPreviewLoadingId(null);
    }
  }, [approveForm]);

  const runApprove = useCallback(async () => {
    console.log("runApprove", window.ethereum);
    const eth = typeof window !== "undefined" ? window.ethereum : undefined;
    if (!eth?.request) {
      setResults((prev) => ({
        ...prev,
        [APPROVE_TEST_ID]:
          "No provider: window.ethereum.request is missing (load dappsdk in wallet iframe).",
      }));
      return;
    }

    setLoading(APPROVE_TEST_ID);
    try {
      const accounts = (await eth.request({
        method: "eth_accounts",
      })) as string[];
      const existingAccounts = Array.isArray(accounts) ? accounts : [];
      const resolvedAccounts =
        existingAccounts.length > 0
          ? existingAccounts
          : ((await eth.request({
              method: "eth_requestAccounts",
            })) as string[]);
      const account = Array.isArray(resolvedAccounts)
        ? resolvedAccounts[0] ?? ZERO
        : ZERO;
      const built = buildApproveTransaction(account, approveForm);
      if ("error" in built) {
        throw new Error(built.error);
      }

      setApprovePreview({
        json: JSON.stringify([built.tx], null, 2),
        hint: `eth_accounts[0]: ${account}`,
      });

      const result = await eth.request({
        method: "eth_sendTransaction",
        params: [built.tx],
      });

      setResults((prev) => ({
        ...prev,
        [APPROVE_TEST_ID]:
          typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2),
      }));
    } catch (e) {
      setResults((prev) => ({
        ...prev,
        [APPROVE_TEST_ID]: `Error: ${formatError(e)}`,
      }));
    } finally {
      setLoading(null);
    }
  }, [approveForm]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-card overflow-x-auto">
      <div className="text-sm font-semibold text-gray-700 mb-1">
        DApp SDK（签名 / 广播更完整）
      </div>
      <p className="text-xs text-gray-500 mb-4">
        基于 <code className="text-gray-700">public/dappsdk.js</code> 的{" "}
        <code className="text-gray-700">request</code>。带「预览注入后」的用例会先读{" "}
        <code className="text-gray-700">eth_accounts</code> 再生成下方 JSON；Run 时使用相同逻辑。
      </p>

      <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="text-sm font-semibold text-emerald-900">
          ERC20 approve 模拟
        </div>
        <p className="mt-1 text-xs text-emerald-800">
          可用真实的 token 合约、swap spender、授权数量来模拟 swap 前的 approve。
          点击 Run 后会发送一笔 <code>eth_sendTransaction</code>，data 为{" "}
          <code>approve(address,uint256)</code>。
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="block text-xs font-semibold text-gray-700">
            Token 合约地址
            <input
              aria-label="Token 合约地址"
              type="text"
              value={approveForm.tokenAddress}
              onChange={(event) =>
                updateApproveForm("tokenAddress", event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block text-xs font-semibold text-gray-700">
            Spender 地址
            <input
              aria-label="Spender 地址"
              type="text"
              value={approveForm.spenderAddress}
              onChange={(event) =>
                updateApproveForm("spenderAddress", event.target.value)
              }
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block text-xs font-semibold text-gray-700">
            Approve 数量
            <input
              aria-label="Approve 数量"
              type="text"
              value={approveForm.amount}
              onChange={(event) => updateApproveForm("amount", event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center border-2 border-emerald-600 text-emerald-700 text-xs py-1.5 px-3 rounded-lg font-semibold transition-all hover:bg-emerald-100 disabled:opacity-50"
            disabled={previewLoadingId === APPROVE_TEST_ID || loading === APPROVE_TEST_ID}
            onClick={() => void previewApprove()}
          >
            {previewLoadingId === APPROVE_TEST_ID ? "…" : "预览 approve"}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center bg-emerald-600 text-white text-xs py-1.5 px-3 rounded-lg font-semibold transition-all hover:opacity-95 disabled:opacity-50"
            disabled={loading === APPROVE_TEST_ID}
            onClick={() => void runApprove()}
          >
            {loading === APPROVE_TEST_ID ? "…" : "Run approve"}
          </button>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <div className="text-[10px] font-semibold text-emerald-700 mb-1">
              发送参数
            </div>
            {approvePreview ? (
              <>
                <p className="text-[10px] text-gray-600 mb-1 break-all">
                  {approvePreview.hint}
                </p>
                {approvePreview.json ? (
                  <pre className="font-mono text-xs text-gray-900 bg-white rounded-lg p-2 whitespace-pre-wrap break-all max-h-56 overflow-y-auto">
                    {approvePreview.json}
                  </pre>
                ) : null}
              </>
            ) : (
              <p className="text-[10px] text-amber-800">
                填入真实 token / spender / amount 后点击「预览 approve」。
              </p>
            )}
          </div>
          <div>
            <div className="text-[10px] font-semibold text-emerald-700 mb-1">
              approve 结果
            </div>
            <pre className="font-mono text-xs text-gray-800 bg-white rounded-lg p-2 min-h-[5rem] max-h-56 overflow-y-auto whitespace-pre-wrap break-all">
              {results[APPROVE_TEST_ID] ?? "—"}
            </pre>
          </div>
        </div>
      </div>

      <table className="w-full text-sm border-collapse min-w-[680px]">
        <thead>
          <tr className="border-b-2 border-gray-200 text-left text-gray-600">
            <th className="py-2 pr-3 font-semibold w-[24%]">函数名</th>
            <th className="py-2 pr-3 font-semibold w-[40%]">参数</th>
            <th className="py-2 font-semibold">结果</th>
          </tr>
        </thead>
        {SECTION_ORDER.map((section) => {
          const rows = rowsBySection.get(section) ?? [];
          if (rows.length === 0) return null;
          return (
            <tbody key={section}>
              <tr className="bg-gray-100">
                <td
                  colSpan={3}
                  className="py-2 px-2 text-xs font-bold text-gray-700 uppercase tracking-wide"
                >
                  {section}
                </td>
              </tr>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-gray-100 align-top"
                >
                  <td className="py-3 pr-3">
                    <div className="font-mono text-gray-900">{row.method}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                      {row.id}
                    </div>
                    {row.note ? (
                      <p className="text-xs text-gray-500 mt-1">{row.note}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center bg-primary text-white text-xs py-1.5 px-3 rounded-lg font-semibold transition-all hover:opacity-95 disabled:opacity-50"
                        disabled={loading === row.id}
                        onClick={() => void run(row)}
                      >
                        {loading === row.id ? "…" : "Run"}
                      </button>
                      {row.getParams ? (
                        <button
                          type="button"
                          className="inline-flex items-center justify-center border-2 border-primary text-primary text-xs py-1.5 px-3 rounded-lg font-semibold transition-all hover:bg-primary/5 disabled:opacity-50"
                          disabled={
                            previewLoadingId === row.id || loading === row.id
                          }
                          onClick={() => void previewInjectedParams(row)}
                        >
                          {previewLoadingId === row.id ? "…" : "预览注入后"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <div className="text-[10px] font-semibold text-gray-500 mb-1">
                      模板（源码中的 params）
                    </div>
                    <pre className="font-mono text-xs text-gray-800 bg-gray-50 rounded-lg p-2 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                      {JSON.stringify(row.params, null, 2)}
                    </pre>
                    {row.getParams && paramPreviews[row.id] ? (
                      <div className="mt-2">
                        <div className="text-[10px] font-semibold text-primary mb-1">
                          注入后（与 Run 一致）
                        </div>
                        <p className="text-[10px] text-gray-600 mb-1 break-all">
                          {paramPreviews[row.id].hint}
                        </p>
                        {paramPreviews[row.id].json ? (
                          <pre className="font-mono text-xs text-gray-900 bg-emerald-50 border border-emerald-200/80 rounded-lg p-2 whitespace-pre-wrap break-all max-h-56 overflow-y-auto">
                            {paramPreviews[row.id].json}
                          </pre>
                        ) : null}
                      </div>
                    ) : row.getParams ? (
                      <p className="text-[10px] text-amber-800 mt-1">
                        点击「预览注入后」查看替换地址后的 JSON。
                      </p>
                    ) : null}
                  </td>
                  <td className="py-3">
                    <pre className="font-mono text-xs text-gray-800 bg-gray-50 rounded-lg p-2 min-h-[2.5rem] max-h-56 overflow-y-auto whitespace-pre-wrap break-all">
                      {results[row.id] ?? "—"}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
