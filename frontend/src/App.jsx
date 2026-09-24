import { useEffect, useState } from "react";
import { Web3Provider, useWeb3 } from "./Web3Context.jsx";
import Landing from "./components/Landing.jsx";
import ConnectModal from "./components/ConnectModal.jsx";
import { MOBILE_QUERY, ScaledBoard, useMediaQuery } from "./components/app/AppShell.jsx";
import AppScreen from "./components/app/AppScreen.jsx";
import { ARC_CONFIG, IS_LOCAL_DEV, IS_TESTNET_BUILD } from "./config.js";
import "./App.css";

const TESTNET_BANNER = (
  <div className="testnet-banner">
    TESTNET STAGING — pointed at Arc Testnet, not the mainnet submission. No real funds are involved.
  </div>
);

// Chain 5042 is Arc mainnet's ID and the local Hardhat node reuses it, so the
// wallet's network picker cannot tell them apart. Say which one this build
// expects, in the open.
const LOCAL_BANNER = (
  <div className="testnet-banner">
    LOCAL DEV — expects a Hardhat node at {ARC_CONFIG.rpcUrl} on chain {ARC_CONFIG.chainId}. That chain ID is also Arc
    mainnet's: check your wallet's RPC before signing.
  </div>
);

const BANNER = IS_TESTNET_BUILD ? TESTNET_BANNER : IS_LOCAL_DEV ? LOCAL_BANNER : null;

function Shell() {
  const { address, wrongChain, contractsMissing, disconnect } = useWeb3();
  const mobile = useMediaQuery(MOBILE_QUERY);
  const [connectOpen, setConnectOpen] = useState(false);

  const blocked = Boolean(address) && (wrongChain || contractsMissing);

  // Dismiss the dialog as soon as there's a session that can actually transact.
  useEffect(() => {
    if (address && !blocked) setConnectOpen(false);
  }, [address, blocked]);

  if (!address) {
    return (
      <>
        {BANNER}
        <Landing onLaunch={() => setConnectOpen(true)} />
        {connectOpen && <ConnectModal onClose={() => setConnectOpen(false)} />}
      </>
    );
  }

  return (
    <>
      <ScaledBoard banner={BANNER} mobile={mobile}>
        {!blocked && <AppScreen key={address} mobile={mobile} onDisconnect={disconnect} />}
      </ScaledBoard>
      {/* Wrong network, or no factory at the configured address: nothing can
          be signed, so the dialog stays up until that's fixed or the wallet
          is disconnected. */}
      {blocked && <ConnectModal onClose={disconnect} />}
    </>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <Shell />
    </Web3Provider>
  );
}
