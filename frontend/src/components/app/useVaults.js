import { useCallback, useEffect, useState } from "react";
import { Contract } from "ethers";
import { useWeb3 } from "../../Web3Context.jsx";
import { ARC_CONFIG } from "../../config.js";
import { VAULT_FACTORY_ABI } from "../../abis/VaultFactory.js";
import { VAULT_ABI, VAULT_STATE, VAULT_ACTION } from "../../abis/Vault.js";

// Everything the owner-side screens need about one vault, read in one pass.
export async function loadVault(address, provider) {
  const vault = new Contract(address, VAULT_ABI, provider);
  const [name, state, [beneficiaries, shares], balance, interval, grace, lastCheckIn, historyLength] =
    await Promise.all([
      vault.name(),
      vault.state(),
      vault.getBeneficiaries(),
      vault.balance(),
      vault.checkInInterval(),
      vault.gracePeriod(),
      vault.lastCheckInTime(),
      vault.historyLength(),
    ]);
  const history = await vault.getHistory(0, historyLength);
  return {
    address,
    name,
    storedState: VAULT_STATE[Number(state)],
    balanceRaw: balance,
    beneficiaries: beneficiaries.map((b, i) => ({ address: b, bps: Number(shares[i]) })),
    interval: Number(interval),
    grace: Number(grace),
    lastCheckIn: Number(lastCheckIn),
    history: history.map((e, index) => ({
      action: VAULT_ACTION[Number(e.action)],
      timestamp: Number(e.timestamp),
      actor: e.actor,
      amount: e.amount,
      index,
    })),
  };
}

// The connected wallet's vaults, oldest first, refreshed every 15 seconds.
export function useOwnerVaults() {
  const { provider, address } = useWeb3();
  const [vaults, setVaults] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!provider || !address) return;
    try {
      const factory = new Contract(ARC_CONFIG.factoryAddress, VAULT_FACTORY_ABI, provider);
      const addresses = await factory.getVaultsByOwner(address);
      setVaults(await Promise.all(addresses.map((a) => loadVault(a, provider))));
      setError(null);
    } catch (err) {
      setError(err?.shortMessage ?? err?.message ?? "Couldn't load vaults");
    }
  }, [provider, address]);

  useEffect(() => {
    setVaults(null);
    reload();
    const id = setInterval(reload, 15000);
    return () => clearInterval(id);
  }, [reload]);

  return { vaults, error, reload };
}

// Seconds since the epoch, ticking once a second, for live countdowns.
export function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}
