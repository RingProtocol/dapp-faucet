export const STORAGE_KEYS = {
  TOKENS: "firstdapp_tokens",
  TRANSACTIONS: "firstdapp_transactions",
} as const;

export type Token = {
  address: string;
  symbol: string;
  decimals: number;
  addedAt?: string;
};

export type TransactionStatus = "pending" | "confirmed" | "failed";
export type TransactionType = "sent" | "received";

export type Transaction = {
  hash: string;
  type: TransactionType;
  to?: string;
  from?: string;
  amount: string;
  status: TransactionStatus;
  timestamp: number;
  network?: string;
  blockNumber?: number;
};

export const ERC20_ABI = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
] as const;

export const UI_CONFIG = {
  ADDRESS_DISPLAY_LENGTH: 6,
  BALANCE_DECIMALS: 4,
  MAX_TRANSACTION_HISTORY: 50,
} as const;

export const GAS_CONFIG = {
  STANDARD_TRANSFER: 21000,
} as const;

export const NETWORKS: Record<number, { name: string; explorer: string }> = {
  1: { name: "Ethereum Mainnet", explorer: "https://etherscan.io/tx/" },
  5: { name: "Goerli", explorer: "https://goerli.etherscan.io/tx/" },
  11155111: { name: "Sepolia", explorer: "https://sepolia.etherscan.io/tx/" },
  137: { name: "Polygon", explorer: "https://polygonscan.com/tx/" },
};

export const ETHERSCAN_API_URLS: Record<number, string> = {
  1: "https://api.etherscan.io/api",
  5: "https://api-goerli.etherscan.io/api",
  11155111: "https://api-sepolia.etherscan.io/api",
  137: "https://api.polygonscan.com/api",
};

const RPC_URLS: Record<number, string[]> = {
  1: [
    "https://cloudflare-eth.com",
    "https://ethereum-rpc.publicnode.com",
  ],
  11155111: ["https://sepolia.gateway.tenderly.co", "https://sepolia.drpc.org"],
  137: ["https://polygon-rpc.com", "https://polygon-bor-rpc.publicnode.com"],
};

export function getRpcUrl(chainId: number): string | null {
  const urls = RPC_URLS[Number(chainId)];
  return Array.isArray(urls) && urls.length > 0 ? urls[0] : null;
}

export type SwitchableChain = {
  chainId: number;
  hexChainId: string;
  name: string;
  rpcUrl: string;
  explorer: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
};

export const SWITCHABLE_CHAINS: SwitchableChain[] = [
  {
    chainId: 1,
    hexChainId: "0x1",
    name: "Ethereum Mainnet",
    rpcUrl: getRpcUrl(1) || "https://cloudflare-eth.com",
    explorer: "https://etherscan.io",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
  {
    chainId: 11155111,
    hexChainId: "0xaa36a7",
    name: "Sepolia",
    rpcUrl: getRpcUrl(11155111) || "https://sepolia.drpc.org",
    explorer: "https://sepolia.etherscan.io",
    nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  },
  {
    chainId: 137,
    hexChainId: "0x89",
    name: "Polygon",
    rpcUrl: getRpcUrl(137) || "https://polygon-rpc.com",
    explorer: "https://polygonscan.com",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
  },
];

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const TokenStorage = {
  getAll(): Token[] {
    const storage = getLocalStorage();
    if (!storage) return [];
    const tokens = safeParseJson<Token[]>(storage.getItem(STORAGE_KEYS.TOKENS), []);
    return Array.isArray(tokens) ? tokens : [];
  },
  save(token: Token): void {
    const storage = getLocalStorage();
    if (!storage) return;
    const all = TokenStorage.getAll();
    const normalized = token.address.toLowerCase();
    const without = all.filter((t) => t.address.toLowerCase() !== normalized);
    const next: Token = {
      ...token,
      addedAt: token.addedAt || new Date().toISOString(),
    };
    storage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify([...without, next]));
  },
  exists(address: string): boolean {
    const normalized = address.toLowerCase();
    return TokenStorage.getAll().some((t) => t.address.toLowerCase() === normalized);
  },
  remove(address: string): void {
    const storage = getLocalStorage();
    if (!storage) return;
    const normalized = address.toLowerCase();
    const next = TokenStorage.getAll().filter((t) => t.address.toLowerCase() !== normalized);
    storage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(next));
  },
};

function txKey(account: string): string {
  return `${STORAGE_KEYS.TRANSACTIONS}_${account.toLowerCase()}`;
}

export const TransactionStorage = {
  getAll(account: string | null): Transaction[] {
    if (!account) return [];
    const storage = getLocalStorage();
    if (!storage) return [];
    const txs = safeParseJson<Transaction[]>(storage.getItem(txKey(account)), []);
    const list = Array.isArray(txs) ? txs : [];
    return list
      .slice()
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, UI_CONFIG.MAX_TRANSACTION_HISTORY);
  },
  add(account: string, tx: Transaction): void {
    const storage = getLocalStorage();
    if (!storage) return;
    const existing = TransactionStorage.getAll(account);
    const next = [tx, ...existing].slice(0, UI_CONFIG.MAX_TRANSACTION_HISTORY);
    storage.setItem(txKey(account), JSON.stringify(next));
  },
  update(account: string, hash: string, update: Partial<Transaction>): void {
    const storage = getLocalStorage();
    if (!storage) return;
    const existing = TransactionStorage.getAll(account);
    const next = existing.map((tx) => (tx.hash === hash ? { ...tx, ...update } : tx));
    storage.setItem(txKey(account), JSON.stringify(next));
  },
};

