import { useCallback, useEffect, useState } from "react";
import { Contract } from "ethers";
import { useWeb3 } from "../../Web3Context.jsx";
import { ARC_CONFIG } from "../../config.js";
import { VAULT_FACTORY_ABI } from "../../abis/VaultFactory.js";
import { VAULT_ABI, VAULT_STATE, VAULT_ACTION } from "../../abis/Vault.js";
import { formatSpan, formatUsdc, shortAddress, txError } from "./format.js";

// Vaults that name the connected wallet. Payouts arrive in the wallet
// automatically when a vault's timer runs out, so there's nothing to claim;
// this shows what's coming, what arrived, and offers the two manual actions
// that exist: triggering a due payout early and retrying a held one.

const MAX_LISTED = 100;

function useIncomingVaults() {
  const { provider, address } = useWeb3();
  const [vaults, setVaults] = useState(null);

  const load = useCallback(async () => {
    if (!provider || !address) return;
    const factory = new Contract(ARC_CONFIG.factoryAddress, VAULT_FACTORY_ABI, provider);
    const listed = await factory.getVaultsByBeneficiary(address);
    // Anyone can name this wallet in as many vaults as they like, so only the
    // newest are read. Payouts never depend on this list: they arrive in the
    // wallet whether or not a vault is shown here.
    const addrs = listed.slice(-MAX_LISTED);

    // Anyone can create a vault naming this wallet, so each one loads on its
    // own: a vault that fails to load (or was built to) just drops out.
    const settled = await Promise.allSettled(
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
        // Recent history is enough to find this wallet's payouts, and keeps a
        // vault with an enormous history from stalling the page.
        const from = historyLength > 50n ? historyLength - 50n : 0n;
        const history = await vault.getHistory(from, 50);
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
        };
      })
    );
    const results = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);
    // Only show vaults that hold something for this wallet or already paid
    // or owe it. That drops vaults whose owner later removed it (the factory
    // keeps listing those) and empty vaults anyone could create naming it,
    // so a stranger can't fill this list, or push a misleading vault name
    // at a beneficiary, without depositing real USDC.
    setVaults(results.filter((v) => (v.bps > 0 && v.value > 0n) || v.received > 0n || v.owed > 0n).reverse());
  }, [provider, address]);

  useEffect(() => {
    load().catch(() => {});
    const interval = setInterval(() => load().catch(() => {}), 30000);
    return () => clearInterval(interval);
  }, [load]);

  return [vaults, load];
}

const PILL = {
  Active: ["ok", "Armed"],
  Due: ["alert", "Payout due"],
  Distributed: ["ok", "Released"],
  Cancelled: ["off", "Closed"],
};

function line(v) {
  const share = `${v.bps / 100}%`;
  if (v.owed > 0n) return `${formatUsdc(v.owed)} USDC couldn't be sent to this address and is being held for you.`;
  if (v.state === "Active")
    return `Your share is ${share}, ${formatUsdc(v.value)} USDC today. Sent to you in ${formatSpan(v.timeLeft)} unless the owner checks in.`;
  if (v.state === "Due")
    return `The timer has run out. Your ${formatUsdc(v.value)} USDC (${share}) is sent within about a day, or pay out now.`;
  if (v.received > 0n) return `${formatUsdc(v.received)} USDC was sent to your wallet.`;
  return "Closed by its owner.";
}

// On the overview it renders nothing for a wallet no vault names; `always`
// (the Beneficiaries page) keeps the box and says so instead.
export default function Incoming({ onDone, onError, always }) {
  const { signer } = useWeb3();
  const [vaults, load] = useIncomingVaults();
  const [busy, setBusy] = useState(null);

  if (!vaults?.length && !always) return null;

  async function act(vAddr, call, message) {
    setBusy(vAddr);
    try {
      await (await call(new Contract(vAddr, VAULT_ABI, signer))).wait();
      await load();
      await onDone({ message });
    } catch (err) {
      onError(txError(err, "Transaction failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="box full" style={{ "--d": ".38s" }}>
      <header>
        <h2>Vaults naming you</h2>
        <span className="label">Paid to this wallet automatically</span>
      </header>
      {!vaults?.length && <p className="empty">{vaults ? "No vault names this wallet." : "Loading…"}</p>}
      <ul className="incoming">
        {(vaults ?? []).map((v) => (
          <li key={v.vAddr}>
            <span>
              <b style={{ fontWeight: 500 }}>{v.name || "Untitled vault"}</b>{" "}
              <span className="ad mono" title={v.owner}>
                from {shortAddress(v.owner)}
              </span>
              <br />
              <span style={{ color: "var(--mute)" }}>{line(v)}</span>
            </span>
            <span className={`pill ${PILL[v.state][0]}`}>{PILL[v.state][1]}</span>
            {v.state === "Due" && (
              <button
                className="btn"
                type="button"
                disabled={busy === v.vAddr}
                onClick={() => act(v.vAddr, (c) => c.distribute(), `${v.name || "Vault"} paid out to every beneficiary.`)}
              >
                {busy === v.vAddr ? "Paying out…" : "Pay out now"}
              </button>
            )}
            {v.owed > 0n && (
              <button
                className="btn"
                type="button"
                disabled={busy === v.vAddr}
                onClick={() => act(v.vAddr, (c) => c.withdrawOwed(), "Held payout sent to your wallet.")}
              >
                {busy === v.vAddr ? "Retrying…" : "Retry payout"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
