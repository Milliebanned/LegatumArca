import { useState } from "react";
import { Contract, parseUnits } from "ethers";
import { useWeb3 } from "../Web3Context.jsx";
import { ARC_CONFIG, IS_LOCAL_DEV, IS_TESTNET_BUILD } from "../config.js";
import { VAULT_FACTORY_ABI } from "../abis/VaultFactory.js";
import { VAULT_ABI } from "../abis/Vault.js";
import { ERC20_ABI } from "../abis/ERC20.js";
import SplitEditor, { emptyRow, validateSplit } from "./SplitEditor.jsx";

const DAY = 24 * 60 * 60;

// Minute-scale timers only exist in testnet/local builds, so a full
// deadline -> payout cycle can be exercised without waiting 30 days.
const TEST_PRESETS = IS_TESTNET_BUILD || IS_LOCAL_DEV
  ? [
      { label: "2 minutes (test)", seconds: 120 },
      { label: "10 minutes (test)", seconds: 600 },
    ]
  : [];

const INTERVAL_PRESETS = [
  ...TEST_PRESETS,
  { label: "30 days", seconds: 30 * DAY },
  { label: "90 days", seconds: 90 * DAY },
  { label: "180 days", seconds: 180 * DAY },
  { label: "365 days", seconds: 365 * DAY },
];

const GRACE_PRESETS = [
  { label: "None", seconds: 0 },
  { label: "1 day", seconds: DAY },
  { label: "7 days", seconds: 7 * DAY },
  { label: "30 days", seconds: 30 * DAY },
];

export default function CreateVault({ onCreated }) {
  const { signer, address, refreshBalance } = useWeb3();
  const [name, setName] = useState("");
  const [rows, setRows] = useState([emptyRow()]);
  const [intervalSeconds, setIntervalSeconds] = useState(INTERVAL_PRESETS[0].seconds);
  const [graceSeconds, setGraceSeconds] = useState(0);
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const split = validateSplit(rows, address);
  const nameBytes = new TextEncoder().encode(name).length;
  const canSubmit = split.valid && nameBytes <= 64 && confirmed && !busy;

  const changeRows = (next) => {
    setRows(next);
    setConfirmed(false);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || !signer) return;
    setBusy(true);
    try {
      // 1. Create the vault (its address isn't known until this confirms —
      // minimal-proxy clone addresses aren't cheaply predictable client-side).
      setStatus("Creating vault...");
      const factory = new Contract(ARC_CONFIG.factoryAddress, VAULT_FACTORY_ABI, signer);
      const createTx = await factory.createVault(name.trim(), split.addresses, split.shares, intervalSeconds, graceSeconds);
      const receipt = await createTx.wait();
      const event = receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e2) => e2 && e2.name === "VaultCreated");
      const vaultAddress = event.args.vault;

      // 2. Optional first deposit: approve that specific vault, then deposit.
      if (Number(amount) > 0) {
        setStatus("Approving USDC...");
        const usdc = new Contract(ARC_CONFIG.usdcAddress, ERC20_ABI, signer);
        const decimals = await usdc.decimals();
        const parsedAmount = parseUnits(amount, decimals);
        await (await usdc.approve(vaultAddress, parsedAmount)).wait();

        setStatus("Depositing USDC...");
        const vault = new Contract(vaultAddress, VAULT_ABI, signer);
        await (await vault.deposit(parsedAmount)).wait();
      }

      setStatus(`Vault created at ${vaultAddress}`);
      await refreshBalance();
      onCreated?.(vaultAddress);
    } catch (err) {
      setStatus(err?.reason ?? err?.shortMessage ?? err?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Create New Vault</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Vault Name
          <input
            type="text"
            placeholder="e.g. Family, Kids' education"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {nameBytes > 64 && <p className="error">Name is too long.</p>}

        <SplitEditor rows={rows} onChange={changeRows} ownerAddress={address} />

        <label>
          Check-in Interval
          <select value={intervalSeconds} onChange={(e) => setIntervalSeconds(Number(e.target.value))}>
            {INTERVAL_PRESETS.map((p) => (
              <option key={p.seconds} value={p.seconds}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Grace Period
          <select value={graceSeconds} onChange={(e) => setGraceSeconds(Number(e.target.value))}>
            {GRACE_PRESETS.map((p) => (
              <option key={p.seconds} value={p.seconds}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          First Deposit (USDC, optional)
          <input type="number" min="0" step="0.000001" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>

        <label className="checkbox">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          I've double-checked every beneficiary address. Funds sent to a wrong address can't be recovered.
        </label>

        <button type="submit" disabled={!canSubmit}>
          {busy ? "Working..." : "Create Vault"}
        </button>
      </form>
      {status && <p className="muted">{status}</p>}
    </div>
  );
}
