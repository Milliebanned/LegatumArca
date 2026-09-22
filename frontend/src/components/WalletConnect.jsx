import { useWeb3 } from "../Web3Context.jsx";
import { useEip6963Providers } from "../eip6963.js";
import { ARC_CONFIG } from "../config.js";

function short(addr) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletConnect() {
  const { address, chainId, wrongChain, usdcBalance, error, connect, addArcNetwork } = useWeb3();
  const wallets = useEip6963Providers();

  if (!address) {
    return (
      <div className="card">
        <h2>Legatumarca</h2>
        <p className="muted">A non-custodial USDC vault on Arc mainnet.</p>

        {wallets.length > 0 ? (
          <div className="wallet-list">
            {wallets.map((w) => (
              <button
                key={w.info.uuid}
                className="wallet-option"
                onClick={() => connect(w.provider, w.info.name)}
              >
                {w.info.icon && <img src={w.info.icon} alt="" width={20} height={20} />}
                {w.info.name}
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => connect()}>Connect Wallet</button>
        )}

        {wallets.length === 0 && (
          <p className="muted">
            No wallet extension detected via EIP-6963. If you have one installed but it isn't
            listed, "Connect Wallet" falls back to it directly.
          </p>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (wrongChain) {
    return (
      <div className="card">
        <h2>Wrong network</h2>
        <p className="error">
          Please switch your wallet to {ARC_CONFIG.label} (chain ID {ARC_CONFIG.chainId}).
          Currently on chain {chainId}.
        </p>
        <button onClick={addArcNetwork}>Add {ARC_CONFIG.label} to Wallet</button>
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
