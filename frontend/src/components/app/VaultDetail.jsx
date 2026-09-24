import { useState } from "react";
import { Contract, parseUnits } from "ethers";
import { useWeb3 } from "../../Web3Context.jsx";
import { ARC_CONFIG } from "../../config.js";
import { VAULT_ABI } from "../../abis/Vault.js";
import { ERC20_ABI } from "../../abis/ERC20.js";
import { StatusPill } from "./DashboardHome.jsx";
import { formatSpan, formatUsd, USDC_DECIMALS } from "./format.js";
import { checkInLine, liveState } from "./viewModel.js";

const shortAddr = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// Per beneficiary: USDC actually sent to them, and whether a failed transfer
// is still being held for them.
function payoutsByBeneficiary(history) {
  const out = new Map();
  for (const e of history) {
    const entry = out.get(e.actor) ?? { paid: 0n, held: false };
    if (e.action === "Payout") {
      entry.paid += e.amount;
      entry.held = false;
    } else if (e.action === "PayoutFailed") {
      entry.held = true;
    } else {
      continue;
    }
    out.set(e.actor, entry);
  }
  return out;
}

// Everything an owner can see and do with one vault.
export default function VaultDetail({ vault: v, now, reload, onEditBeneficiaries }) {
  const { signer, refreshBalance } = useWeb3();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  async function run(label, action) {
    if (!signer) return;
    setBusy(true);
    setStatus(label);
    try {
      const vault = new Contract(v.address, VAULT_ABI, signer);
      const done = await action(vault);
      await reload();
      await refreshBalance();
      setStatus(done);
    } catch (err) {
      setStatus(err?.reason ?? err?.shortMessage ?? err?.message ?? "Transaction failed");
    } finally {
      setBusy(false);
    }
  }

  const handleDeposit = () =>
    run("Approving USDC...", async (vault) => {
      const amount = parseUnits(depositAmount, USDC_DECIMALS);
      const usdc = new Contract(ARC_CONFIG.usdcAddress, ERC20_ABI, signer);
      await (await usdc.approve(v.address, amount)).wait();
      setStatus("Depositing USDC...");
      await (await vault.deposit(amount)).wait();
      setDepositAmount("");
      return "Deposit complete.";
    });

  const handleDistribute = () =>
    run("Paying out...", async (vault) => {
      await (await vault.distribute()).wait();
      return "Paid out to every beneficiary.";
    });

  const handleCheckIn = () =>
    run("Checking in...", async (vault) => {
      await (await vault.checkIn()).wait();
      return "Checked in. Timer reset.";
    });

  const handleWithdraw = () =>
    run("Withdrawing...", async (vault) => {
      await (await vault.withdraw(parseUnits(withdrawAmount, USDC_DECIMALS))).wait();
      setWithdrawAmount("");
      return "Withdrawal complete.";
    });

  const handleCancel = () => {
    if (!window.confirm("Cancel this vault and return all its USDC to you? This can't be undone.")) return;
    run("Cancelling...", async (vault) => {
      await (await vault.cancel()).wait();
      return "Vault cancelled. Funds returned to your wallet.";
    });
  };

  const state = liveState(v, now);
  const storedActive = v.storedState === "Active";
  const distributed = state === "Distributed";
  const canCheckIn = ["Active", "Due"].includes(v.storedState);
  const payouts = payoutsByBeneficiary(v.history);

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0 }}>{v.name || "Untitled vault"}</h2>
        <StatusPill status={state} />
      </div>
      <p className="mono muted" style={{ margin: "8px 0 6px" }}>
        {v.address}
      </p>

      <div className="stat-row">
        <span>Balance</span>
        <span>{formatUsd(v.balanceRaw)}</span>
      </div>
      <div className="stat-row">
        <span>Check-in every</span>
        <span>
          {formatSpan(v.interval)}
          {v.grace > 0 && ` + ${formatSpan(v.grace)} grace`}
        </span>
      </div>
      <div className="stat-row">
        <span>Status</span>
        <span>{checkInLine(v, now)}</span>
      </div>

      <table className="split-table">
        <thead>
          <tr>
            <th>Beneficiary</th>
            <th>Share</th>
            <th>{distributed ? "Received" : "Gets now"}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {v.beneficiaries.map((b) => (
            <tr key={b.address}>
              <td className="mono" title={b.address}>
                {shortAddr(b.address)}
              </td>
              <td>{b.bps / 100}%</td>
              <td>
                {distributed
                  ? formatUsd(payouts.get(b.address)?.paid ?? 0n)
                  : formatUsd((v.balanceRaw * BigInt(b.bps)) / 10000n)}
              </td>
              <td>
                {distributed &&
                  (payouts.get(b.address)?.held ? (
                    <span className="badge badge-due">Held</span>
                  ) : (
                    <span className="badge badge-distributed">Paid</span>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {state === "Due" && (
        <p className="muted" style={{ margin: "4px 0 10px" }}>
          The timer has run out. Shares are sent to every beneficiary automatically at the next daily payout run
          (within about a day), or anyone can pay out now. Checking in first cancels the payout and restarts the timer.
        </p>
      )}

      <div className="button-row">
        {state === "Due" && (
          <button onClick={handleDistribute} disabled={busy}>
            Pay Out Now
          </button>
        )}
        <button
          className={state === "Due" ? "secondary" : undefined}
          onClick={handleCheckIn}
          disabled={busy || !canCheckIn}
        >
          Check In Now
        </button>
        <button className="secondary" onClick={() => onEditBeneficiaries(v.address)} disabled={busy || !storedActive}>
          Edit Beneficiaries
        </button>
        <button className="danger" onClick={handleCancel} disabled={busy || !storedActive}>
          Cancel Vault
        </button>
      </div>

      <div className="withdraw-row">
        <input
          type="number"
          min="0"
          step="0.000001"
          placeholder="Amount to deposit"
          aria-label="Amount to deposit"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          disabled={busy || !storedActive}
        />
        <button onClick={handleDeposit} disabled={busy || !storedActive || !(Number(depositAmount) > 0)}>
          Deposit
        </button>
      </div>

      <div className="withdraw-row">
        <input
          type="number"
          min="0"
          step="0.000001"
          placeholder="Amount to withdraw"
          aria-label="Amount to withdraw"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          disabled={busy || !storedActive}
        />
        <button
          className="secondary"
          onClick={handleWithdraw}
          disabled={busy || !storedActive || !(Number(withdrawAmount) > 0)}
        >
          Withdraw
        </button>
      </div>

      {status && (
        <p className="muted" style={{ marginTop: 12 }}>
          {status}
        </p>
      )}
    </div>
  );
}
