import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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

  const connect = useCallback(async () => {
    setError(null);
    if (!window.ethereum) {
      setError("No wallet found. Install MetaMask (or point it at your local Hardhat node).");
      return;
    }
    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const network = await browserProvider.getNetwork();
      const walletSigner = await browserProvider.getSigner();
      const addr = await walletSigner.getAddress();

      setProvider(browserProvider);
      setSigner(walletSigner);
      setAddress(addr);
      setChainId(Number(network.chainId));

      if (Number(network.chainId) === ARC_CONFIG.chainId) {
        refreshBalance(browserProvider, addr);
      }
    } catch (err) {
      setError(err?.message ?? "Failed to connect wallet");
    }
  }, [refreshBalance]);

  useEffect(() => {
    if (!window.ethereum) return;
    const handleAccountsChanged = () => connect();
    const handleChainChanged = () => connect();
    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [connect]);

  const value = useMemo(
    () => ({
      provider,
      signer,
      address,
      chainId,
      wrongChain,
      usdcBalance,
      error,
      connect,
      refreshBalance: () => refreshBalance(provider, address),
    }),
    [provider, signer, address, chainId, wrongChain, usdcBalance, error, connect, refreshBalance]
  );

  return <Web3Ctx.Provider value={value}>{children}</Web3Ctx.Provider>;
}

export function useWeb3() {
  const ctx = useContext(Web3Ctx);
  if (!ctx) throw new Error("useWeb3 must be used inside <Web3Provider>");
  return ctx;
}
