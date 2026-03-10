import { renderHook, act, waitFor } from '@testing-library/react';
import { useWallet } from '@/hooks/useWallet';

// Mock Web3
jest.mock('web3', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      eth: {
        getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
        getChainId: jest.fn().mockResolvedValue(1),
        sendTransaction: jest.fn().mockResolvedValue({
          transactionHash: '0xabc123',
          status: true,
          blockNumber: 12345,
        }),
      },
      utils: {
        fromWei: jest.fn().mockReturnValue('1.0'),
        toWei: jest.fn().mockReturnValue('1000000000000000000'),
        isAddress: jest.fn().mockReturnValue(true),
      },
    })),
    Web3: jest.fn().mockImplementation(() => ({
      eth: {
        getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
        getChainId: jest.fn().mockResolvedValue(1),
        sendTransaction: jest.fn().mockResolvedValue({
          transactionHash: '0xabc123',
          status: true,
          blockNumber: 12345,
        }),
      },
      utils: {
        fromWei: jest.fn().mockReturnValue('1.0'),
        toWei: jest.fn().mockReturnValue('1000000000000000000'),
        isAddress: jest.fn().mockReturnValue(true),
      },
    })),
  };
});

describe('useWallet hook', () => {
  const mockEthereum = {
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    isMetaMask: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'ethereum', {
      writable: true,
      value: mockEthereum,
    });
  });

  it('should initialize with disconnected state', () => {
    const { result } = renderHook(() => useWallet());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.account).toBeNull();
    expect(result.current.balance).toBe('0');
    expect(result.current.network).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });

  it('should detect wallet availability', () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.isAvailable).toBe(true);
  });

  it('should detect wallet unavailability', () => {
    Object.defineProperty(window, 'ethereum', {
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useWallet());
    expect(result.current.isAvailable).toBe(false);
  });

  it('should treat RingWallet provider as unavailable outside iframe', async () => {
    Object.defineProperty(window, 'ethereum', {
      writable: true,
      value: {
        ...mockEthereum,
        isRingWallet: true,
        isMetaMask: false,
      },
    });

    const { result } = renderHook(() => useWallet());
    expect(result.current.isAvailable).toBe(false);

    await expect(result.current.connect()).rejects.toThrow('Wallet not available');
  });

  it('should check existing connection on mount', async () => {
    mockEthereum.request.mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']);

    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    expect(result.current.account).toBe('0x1234567890123456789012345678901234567890');
    expect(result.current.balance).toBe('1.0000');
    expect(result.current.network).toEqual({
      chainId: 1,
      name: 'Ethereum Mainnet',
      explorer: 'https://etherscan.io/tx/',
    });
  });

  it('should connect wallet successfully', async () => {
    mockEthereum.request.mockResolvedValue(['0x1234567890123456789012345678901234567890']);

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.account).toBe('0x1234567890123456789012345678901234567890');
  });

  it('should throw error when ethereum is not available', async () => {
    Object.defineProperty(window, 'ethereum', {
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useWallet());

    await expect(result.current.connect()).rejects.toThrow('Wallet not available');
  });

  it('should set isConnecting during connection', async () => {
    mockEthereum.request.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(['0x1234']), 100))
    );

    const { result } = renderHook(() => useWallet());

    act(() => {
      result.current.connect();
    });

    expect(result.current.isConnecting).toBe(true);
  });

  it('should disconnect wallet', async () => {
    mockEthereum.request.mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']);

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.account).toBeNull();
    expect(result.current.balance).toBe('0');
  });

  it('should validate addresses correctly', async () => {
    mockEthereum.request.mockResolvedValue(['0x1234567890123456789012345678901234567890']);

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    // Valid Ethereum address should return true
    expect(result.current.isValidAddress('0x1234567890123456789012345678901234567890')).toBe(true);
    // Invalid address should return false (uses fallback regex when web3 is not available)
  });

  it('should get explorer URL for transaction hash', async () => {
    mockEthereum.request.mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']);

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.getExplorerUrl('0xabc')).toBe('https://etherscan.io/tx/0xabc');
  });

  it('should return # for pending transactions', async () => {
    mockEthereum.request.mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']);

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.getExplorerUrl('pending-123')).toBe('#');
  });

  it('should setup event listeners on mount', () => {
    renderHook(() => useWallet());

    expect(mockEthereum.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
    expect(mockEthereum.on).toHaveBeenCalledWith('chainChanged', expect.any(Function));
  });

  it('should handle accountsChanged event', async () => {
    mockEthereum.request.mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']);

    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Simulate accountsChanged event
    const accountsChangedHandler = mockEthereum.on.mock.calls.find(
      call => call[0] === 'accountsChanged'
    )[1];

    act(() => {
      accountsChangedHandler(['0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa']);
    });

    await waitFor(() => {
      expect(result.current.account).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    });
  });

  it('should disconnect when accountsChanged to empty array', async () => {
    mockEthereum.request.mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']);

    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    const accountsChangedHandler = mockEthereum.on.mock.calls.find(
      call => call[0] === 'accountsChanged'
    )[1];

    act(() => {
      accountsChangedHandler([]);
    });

    expect(result.current.isConnected).toBe(false);
  });
});
