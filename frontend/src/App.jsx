import { useState } from "react";
import { Web3Provider, useWeb3 } from "./Web3Context.jsx";
import WalletConnect from "./components/WalletConnect.jsx";
import CreateVault from "./components/CreateVault.jsx";
import OwnerDashboard from "./components/OwnerDashboard.jsx";
import BeneficiaryClaim from "./components/BeneficiaryClaim.jsx";
import DevFaucet from "./components/DevFaucet.jsx";
import { ARC_CONFIG, IS_TESTNET_BUILD } from "./config.js";
import "./App.css";

const TABS = ["Dashboard", "Create Vault", "Claim"];

function Shell() {
  const { address, wrongChain } = useWeb3();
  const [tab, setTab] = useState("Dashboard");

  return (
    <div className="app">
      {IS_TESTNET_BUILD && (
        <div className="testnet-banner">
          TESTNET STAGING — pointed at Arc Testnet, not the mainnet submission. No real funds are involved.
        </div>
      )}

      <header>
        <h1>Legatumarca</h1>
        <WalletConnect />
      </header>

      {address && !wrongChain && (
        <>
          <nav>
            {TABS.map((t) => (
              <button
                key={t}
                className={t === tab ? "tab active" : "tab"}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </nav>

          <main>
            <DevFaucet />
            {tab === "Dashboard" && <OwnerDashboard />}
            {tab === "Create Vault" && <CreateVault onCreated={() => setTab("Dashboard")} />}
            {tab === "Claim" && <BeneficiaryClaim />}
          </main>
        </>
      )}

      <footer>
        <p className="muted">
          {ARC_CONFIG.label} only. Non-custodial. No admin backdoor.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Web3Provider>
      <Shell />
    </Web3Provider>
  );
}
