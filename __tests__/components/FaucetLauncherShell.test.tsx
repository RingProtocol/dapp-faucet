import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FaucetLauncherShell } from "@/components/FaucetLauncherShell";

const CHAINS = [
  { chainId: 1, name: "Ethereum", faucets: ["https://eth.example"] },
  { chainId: 11155111, name: "Sepolia", faucets: ["https://sepolia.example"] },
];

function createProvider({
  accounts = [],
  chainId = "0x1",
}: {
  accounts?: string[];
  chainId?: string;
}) {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const request = jest.fn(async ({ method }: { method: string }) => {
    if (method === "eth_accounts") return accounts;
    if (method === "eth_chainId") return chainId;
    if (method === "eth_requestAccounts") return accounts;
    return null;
  });
  const on = jest.fn((eventName: string, listener: (...args: unknown[]) => void) => {
    listeners.set(eventName, listener);
  });
  const removeListener = jest.fn((eventName: string) => {
    listeners.delete(eventName);
  });

  window.ethereum = {
    request,
    on,
    removeListener,
  } as DAppEip1193Provider;

  return { request, on, removeListener, listeners };
}

describe("FaucetLauncherShell", () => {
  afterEach(() => {
    delete window.ethereum;
    jest.clearAllMocks();
  });

  it("shows current chain and wallet address on top across tab switches", async () => {
    createProvider({
      accounts: ["0x1111111111111111111111111111111111111111"],
      chainId: "0xaa36a7",
    });

    render(<FaucetLauncherShell chains={CHAINS} />);

    await waitFor(() => {
      expect(screen.getAllByText("Sepolia (11155111)").length).toBeGreaterThan(0);
      expect(
        screen.getAllByText("0x1111111111111111111111111111111111111111").length
      ).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("tab", { name: "test-sdk" }));

    expect(screen.getAllByText("Sepolia (11155111)").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("0x1111111111111111111111111111111111111111").length
    ).toBeGreaterThan(0);
  });

  it("updates displayed chain and address when wallet events fire", async () => {
    const provider = createProvider({
      accounts: [],
      chainId: "0x1",
    });

    render(<FaucetLauncherShell chains={CHAINS} />);

    await waitFor(() => {
      expect(screen.getAllByText("Ethereum (1)").length).toBeGreaterThan(0);
      expect(screen.getByText("Disconnected")).not.toBeNull();
    });

    act(() => {
      provider.listeners.get("accountsChanged")?.([
        "0x2222222222222222222222222222222222222222",
      ]);
      provider.listeners.get("chainChanged")?.("0xaa36a7");
    });

    expect(screen.getAllByText("Sepolia (11155111)").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("0x2222222222222222222222222222222222222222").length
    ).toBeGreaterThan(0);
  });
});
