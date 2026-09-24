import { useState } from "react";
import { Contract, parseUnits } from "ethers";
import { useWeb3 } from "../Web3Context.jsx";
import { ARC_CONFIG, IS_LOCAL_DEV } from "../config.js";
import { MOCK_ERC20_ABI } from "../abis/ERC20.js";

// Local-dev-only: mints MockUSDC to the connected wallet. Tree-shaken out of
// every non-local build — IS_LOCAL_DEV is a compile-time target flag,
// so this never ships to the testnet or mainnet builds. Never touches real USDC.
export default function DevFaucet() {
  const { signer, address, refreshBalance } = useWeb3();
  const [busy, setBusy] = useState(false);

  if (!IS_LOCAL_DEV || !address) return null;

  async function mint() {
    setBusy(true);
    try {
      const usdc = new Contract(ARC_CONFIG.usdcAddress, MOCK_ERC20_ABI, signer);
      const tx = await usdc.mint(address, parseUnits("1000", 6));
      await tx.wait();
      await refreshBalance();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card dev-faucet">
      <p className="muted">Local dev only — not part of the Arc mainnet build.</p>
      <button onClick={mint} disabled={busy}>
        {busy ? "Minting..." : "Mint 1,000 test USDC"}
      </button>
    </div>
  );
}
