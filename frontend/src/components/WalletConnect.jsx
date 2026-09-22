import { useWeb3 } from "../Web3Context.jsx";
import { ARC_CONFIG } from "../config.js";

function short(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletConnect() {
  const { address, chainId, wrongChain, usdcBalance, error, connect } = useWeb3();

  if (!address) {
    return (
      <div className="card">
        <h2>Continuity</h2>
        <p className="muted">A non-custodial USDC vault on Arc mainnet.</p>
        <button onClick={connect}>Connect Wallet</button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (wrongChain) {
    return (
      <div className="card">
        <h2>Wrong network</h2>
        <p className="error">
          Please switch your wallet to Arc (chain ID {ARC_CONFIG.chainId}). Currently on chain{" "}
          {chainId}.
        </p>
      </div>
    );
  }

  return (
    <div className="wallet-bar">
      <span className="pill">Connected: {short(address)}</span>
      <span className="pill">Balance: {usdcBalance ?? "…"} USDC</span>
    </div>
  );
}
