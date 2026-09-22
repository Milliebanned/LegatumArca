import { useCallback, useEffect, useState } from "react";
import { Contract, formatUnits } from "ethers";
import { useWeb3 } from "../Web3Context.jsx";
import { ARC_CONFIG } from "../config.js";
import { VAULT_FACTORY_ABI } from "../abis/VaultFactory.js";
import { VAULT_ABI, VAULT_STATE } from "../abis/Vault.js";
import { ERC20_ABI } from "../abis/ERC20.js";

export default function BeneficiaryClaim() {
  const { provider, signer, address, refreshBalance } = useWeb3();
  const [claimable, setClaimable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyVault, setBusyVault] = useState(null);
  const [status, setStatus] = useState(null);

  const load = useCallback(async () => {
    if (!provider || !address) return;
    setLoading(true);
    try {
      const factory = new Contract(ARC_CONFIG.factoryAddress, VAULT_FACTORY_ABI, provider);
      const usdc = new Contract(ARC_CONFIG.usdcAddress, ERC20_ABI, provider);
      const decimals = await usdc.decimals();
      const allVaults = await factory.getAllVaults();

      const results = await Promise.all(
        allVaults.map(async (vAddr) => {
          const vault = new Contract(vAddr, VAULT_ABI, provider);
          const [beneficiary, state, balance, owner] = await Promise.all([
            vault.beneficiary(),
            vault.getVaultState(),
            vault.balance(),
            vault.owner(),
          ]);
          return { vAddr, beneficiary, state: Number(state), balance, owner };
        })
      );

      const mine = results
        .filter((v) => v.beneficiary.toLowerCase() === address.toLowerCase())
        .filter((v) => VAULT_STATE[v.state] === "Claimable")
        .map((v) => ({ ...v, balanceFormatted: formatUnits(v.balance, decimals) }));

      setClaimable(mine);
    } finally {
      setLoading(false);
    }
  }, [provider, address]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleClaim(vAddr) {
    if (!signer) return;
    setBusyVault(vAddr);
    setStatus(null);
    try {
      const vault = new Contract(vAddr, VAULT_ABI, signer);
      const tx = await vault.claim();
      await tx.wait();
      setStatus(`Funds claimed from ${vAddr}.`);
      await load();
      await refreshBalance();
    } catch (err) {
      setStatus(err?.reason ?? err?.shortMessage ?? err?.message ?? "Claim failed");
    } finally {
      setBusyVault(null);
    }
  }

  return (
    <div className="card">
      <h2>Claim Funds</h2>
      {loading && <p className="muted">Loading...</p>}
      {!loading && claimable.length === 0 && <p className="muted">No claimable vaults found.</p>}
      {claimable.map((v) => (
        <div key={v.vAddr} className="vault-row">
          <div>
            <p className="mono">{v.vAddr}</p>
            <p className="muted">Owner: {v.owner}</p>
            <p>{v.balanceFormatted} USDC</p>
          </div>
          <button onClick={() => handleClaim(v.vAddr)} disabled={busyVault === v.vAddr}>
            {busyVault === v.vAddr ? "Claiming..." : "Claim"}
          </button>
        </div>
      ))}
      {status && <p className="muted">{status}</p>}
    </div>
  );
}
