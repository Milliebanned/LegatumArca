import { useCallback, useEffect, useState } from "react";
import { Contract } from "ethers";
import { useWeb3 } from "../Web3Context.jsx";
import { ARC_CONFIG } from "../config.js";
import { VAULT_FACTORY_ABI } from "../abis/VaultFactory.js";
import { VAULT_ABI, VAULT_STATE, VAULT_ACTION } from "../abis/Vault.js";
import { formatDate, formatDuration, formatUsd } from "./app/format.js";

// Vaults that name the connected wallet. Payouts arrive in the wallet
// automatically when a vault's timer runs out, so there's nothing to claim;
// this shows what's coming, what arrived, and offers the two manual actions
// that exist: triggering a due payout early and retrying a held one.
export default function BeneficiaryVaults() {
  const { provider, signer, address, refreshBalance } = useWeb3();
  const [vaults, setVaults] = useState(null);
  const [busyVault, setBusyVault] = useState(null);
  const [status, setStatus] = useState(null);

  const load = useCallback(async () => {
    if (!provider || !address) return;
    const factory = new Contract(ARC_CONFIG.factoryAddress, VAULT_FACTORY_ABI, provider);
    const addrs = await factory.getVaultsByBeneficiary(address);

    const results = await Promise.all(
      addrs.map(async (vAddr) => {
        const vault = new Contract(vAddr, VAULT_ABI, provider);
        const [name, owner, state, share, value, owed, timeLeft, historyLength] = await Promise.all([
          vault.name(),
          vault.owner(),
          vault.getVaultState(),
          vault.shareOf(address),
          vault.shareValue(address),
          vault.owed(address),
          vault.timeUntilDeadline(),
          vault.historyLength(),
        ]);
        const history = await vault.getHistory(0, historyLength);
        const mine = history.filter(
          (e) => VAULT_ACTION[Number(e.action)] === "Payout" && e.actor.toLowerCase() === address.toLowerCase()
        );
        return {
          vAddr,
          name,
          owner,
          state: VAULT_STATE[Number(state)],
          bps: Number(share),
          value,
          owed,
          timeLeft: Number(timeLeft),
          received: mine.reduce((sum, e) => sum + e.amount, 0n),
          receivedAt: mine.length ? Number(mine.at(-1).timestamp) : null,
        };
      })
    );
    // The factory keeps listing vaults whose owner later removed this wallet;
    // only show ones that still name it, or that paid or owe it something.
    setVaults(results.filter((v) => v.bps > 0 || v.received > 0n || v.owed > 0n).reverse());
  }, [provider, address]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function act(vAddr, fn, done) {
    if (!signer) return;
    setBusyVault(vAddr);
    setStatus(null);
    try {
      const vault = new Contract(vAddr, VAULT_ABI, signer);
      await (await fn(vault)).wait();
      setStatus(done);
      await load();
      await refreshBalance();
    } catch (err) {
      setStatus(err?.reason ?? err?.shortMessage ?? err?.message ?? "Transaction failed");
    } finally {
      setBusyVault(null);
    }
  }

  return (
    <div className="card">
      <h2>Vaults Naming You</h2>
      {!vaults && <p className="muted">Loading...</p>}
      {vaults && vaults.length === 0 && <p className="muted">No vault lists this wallet as a beneficiary.</p>}
      {vaults?.map((v) => (
        <div key={v.vAddr} className="vault-row">
          <div style={{ minWidth: 0 }}>
            <p>
              <strong>{v.name || "Untitled vault"}</strong>{" "}
              <span className={`badge badge-${v.state.toLowerCase()}`}>{v.state}</span>
            </p>
            <p className="mono muted">Owner: {v.owner}</p>
            {v.state === "Active" && (
              <>
                <p>
                  Your share: {v.bps / 100}% · {formatUsd(v.value)} today
                </p>
                <p className="muted">
                  Sent to your wallet automatically in {formatDuration(v.timeLeft)} unless the owner checks in.
                </p>
              </>
            )}
            {v.state === "Due" && (
              <p>
                The timer has run out. Your {formatUsd(v.value)} ({v.bps / 100}%) is sent automatically within about a day,
                or press Pay Out Now to send every share immediately.
              </p>
            )}
            {v.received > 0n && (
              <p className="muted">
                {formatUsd(v.received)} sent to your wallet on {formatDate(v.receivedAt)}.
              </p>
            )}
            {v.owed > 0n && (
              <p className="error">
                Your {formatUsd(v.owed)} couldn't be sent to this address, so it's being held for you.
              </p>
            )}
          </div>
          {v.state === "Due" && (
            <button
              onClick={() => act(v.vAddr, (vault) => vault.distribute(), "Paid out to every beneficiary.")}
              disabled={busyVault === v.vAddr}
            >
              {busyVault === v.vAddr ? "Paying out..." : "Pay Out Now"}
            </button>
          )}
          {v.owed > 0n && (
            <button
              onClick={() => act(v.vAddr, (vault) => vault.withdrawOwed(), "Held payout sent to your wallet.")}
              disabled={busyVault === v.vAddr}
            >
              {busyVault === v.vAddr ? "Retrying..." : "Retry Payout"}
            </button>
          )}
        </div>
      ))}
      {status && <p className="muted">{status}</p>}
    </div>
  );
}
