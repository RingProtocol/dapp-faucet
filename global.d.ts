import { Eip1193Provider } from "web3";

declare global {
  type DAppEip1193Provider = Eip1193Provider & {
    isRingWallet?: boolean;
    isMetaMask?: boolean;
    on?: (eventName: string, listener: (...args: any[]) => void) => void;
    removeListener?: (eventName: string, listener: (...args: any[]) => void) => void;
  };

  interface Window {
    ethereum?: DAppEip1193Provider;
    ringWallet?: {
      provider: DAppEip1193Provider;
      version?: string;
    };
  }
}

export {};
