import { useEffect, useState } from "react";

// EIP-6963: Multi Injected Provider Discovery. Lets a page discover every
// wallet extension installed in the browser (MetaMask, Rabby, Coinbase
// Wallet, Brave Wallet, OKX Wallet, etc.) instead of racing them all for
// `window.ethereum`, which only one extension can hold at a time. Each
// wallet announces itself with its own name/icon/uuid and its own
// standalone EIP-1193 provider instance.
export function useEip6963Providers() {
  const [wallets, setWallets] = useState([]);

  useEffect(() => {
    function onAnnounce(event) {
      const detail = event.detail;
      if (!detail?.info?.uuid || !detail?.provider) return;
      setWallets((prev) => {
        if (prev.some((w) => w.info.uuid === detail.info.uuid)) return prev;
        return [...prev, detail];
      });
    }

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    // Ask every already-loaded wallet extension to (re-)announce itself.
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
  }, []);

  return wallets;
}
