import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, formatUnits } from "ethers";
import { ARC_CONFIG } from "./config.js";
import { ERC20_ABI } from "./abis/ERC20.js";

const Web3Ctx = createContext(null);

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState(null);
  const [error, setError] = useState(null);
  const [walletName, setWalletName] = useState(null);

  // The raw EIP-1193 provider currently in use (an EIP-6963 wallet's own
  // `provider`, or window.ethereum as a legacy fallback) — kept outside
  // React state since it's only used imperatively, for attaching/removing
  // its event listeners.
  const rawProviderRef = useRef(null);

  const wrongChain = chainId !== null && chainId !== ARC_CONFIG.chainId;

  const refreshBalance = useCallback(async (prov, addr) => {
    if (!prov || !addr) return;
    try {
      const usdc = new Contract(ARC_CONFIG.usdcAddress, ERC20_ABI, prov);
      const [raw, decimals] = await Promise.all([usdc.balanceOf(addr), usdc.decimals()]);
      setUsdcBalance(formatUnits(raw, decimals));
    } catch {
      setUsdcBalance(null);
    }
  }, []);

  const detachRawListeners = useCallback(() => {
    const raw = rawProviderRef.current;
    if (!raw) return;
    raw.removeListener?.("accountsChanged", raw.__onAccountsChanged);
    raw.removeListener?.("chainChanged", raw.__onChainChanged);
  }, []);

  // `rawEip1193Provider` is a specific wallet's own provider object, as
  // handed to us by EIP-6963 (see eip6963.js), or window.ethereum as a
  // fallback for a wallet that hasn't adopted EIP-6963 yet.
  const connect = useCallback(
    async (rawEip1193Provider, name) => {
      setError(null);
      const raw = rawEip1193Provider ?? window.ethereum;
      if (!raw) {
        setError("No wallet found. Install a browser wallet extension (or point one at your local Hardhat node).");
        return;
      }
      try {
        const browserProvider = new BrowserProvider(raw);
        await browserProvider.send("eth_requestAccounts", []);
        const network = await browserProvider.getNetwork();
        const walletSigner = await browserProvider.getSigner();
        const addr = await walletSigner.getAddress();

        detachRawListeners();
        const onAccountsChanged = () => connect(raw, name);
        const onChainChanged = () => connect(raw, name);
        raw.__onAccountsChanged = onAccountsChanged;
        raw.__onChainChanged = onChainChanged;
        raw.on?.("accountsChanged", onAccountsChanged);
        raw.on?.("chainChanged", onChainChanged);
        rawProviderRef.current = raw;

        setProvider(browserProvider);
        setSigner(walletSigner);
        setAddress(addr);
        setChainId(Number(network.chainId));
        setWalletName(name ?? null);

        if (Number(network.chainId) === ARC_CONFIG.chainId) {
          refreshBalance(browserProvider, addr);
        }
      } catch (err) {
        setError(err?.message ?? "Failed to connect wallet");
      }
    },
    [refreshBalance, detachRawListeners]
  );

  // Prompts the connected wallet to add Arc as a network (EIP-3085). Useful
  // since most wallets besides MetaMask won't have Arc pre-configured.
  const addArcNetwork = useCallback(async () => {
    const raw = rawProviderRef.current;
    if (!raw) return;
    try {
      await raw.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x" + ARC_CONFIG.chainId.toString(16),
            chainName: ARC_CONFIG.label,
            nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
            rpcUrls: [ARC_CONFIG.rpcUrl],
            blockExplorerUrls: [ARC_CONFIG.blockExplorerUrl],
          },
        ],
      });
    } catch (err) {
      setError(err?.message ?? "Failed to add network");
    }
  }, []);

  useEffect(() => detachRawListeners, [detachRawListeners]);

  const value = useMemo(
    () => ({
      provider,
      signer,
      address,
      chainId,
      wrongChain,
      usdcBalance,
      error,
      walletName,
      connect,
      addArcNetwork,
      refreshBalance: () => refreshBalance(provider, address),
    }),
    [provider, signer, address, chainId, wrongChain, usdcBalance, error, walletName, connect, addArcNetwork, refreshBalance]
  );

  return <Web3Ctx.Provider value={value}>{children}</Web3Ctx.Provider>;
}

export function useWeb3() {
  const ctx = useContext(Web3Ctx);
  if (!ctx) throw new Error("useWeb3 must be used inside <Web3Provider>");
  return ctx;
}
