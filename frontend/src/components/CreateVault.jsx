import { useState } from "react";
import { Contract, isAddress, parseUnits } from "ethers";
import { useWeb3 } from "../Web3Context.jsx";
import { ARC_CONFIG } from "../config.js";
import { VAULT_FACTORY_ABI } from "../abis/VaultFactory.js";
import { VAULT_ABI } from "../abis/Vault.js";
import { ERC20_ABI } from "../abis/ERC20.js";

const INTERVAL_PRESETS = [
  { label: "30 days", seconds: 30 * 24 * 60 * 60 },
  { label: "90 days", seconds: 90 * 24 * 60 * 60 },
  { label: "180 days", seconds: 180 * 24 * 60 * 60 },
];

export default function CreateVault({ onCreated }) {
  const { signer, address, refreshBalance } = useWeb3();
  const [beneficiary, setBeneficiary] = useState("");
  const [beneficiaryConfirm, setBeneficiaryConfirm] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(INTERVAL_PRESETS[1].seconds);
  const [graceDays, setGraceDays] = useState("7");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const beneficiaryValid = isAddress(beneficiary);
  const beneficiaryMismatch = beneficiaryConfirm.length > 0 && beneficiary !== beneficiaryConfirm;
  const isSelf = beneficiaryValid && address && beneficiary.toLowerCase() === address.toLowerCase();
  const canSubmit =
    beneficiaryValid &&
    !beneficiaryMismatch &&
    !isSelf &&
    beneficiaryConfirm.length > 0 &&
    Number(amount) > 0 &&
    !busy;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || !signer) return;
    setBusy(true);
    try {
      // 1. Create the vault (its address isn't known until this confirms —
      // minimal-proxy clone addresses aren't cheaply predictable client-side).
      setStatus("Creating vault...");
      const factory = new Contract(ARC_CONFIG.factoryAddress, VAULT_FACTORY_ABI, signer);
      const graceSeconds = Number(graceDays) * 24 * 60 * 60;
      const createTx = await factory.createVault(beneficiary, intervalSeconds, graceSeconds);
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

      // 2. Approve that specific vault to pull the deposit amount.
      setStatus("Approving USDC...");
      const usdc = new Contract(ARC_CONFIG.usdcAddress, ERC20_ABI, signer);
      const decimals = await usdc.decimals();
      const parsedAmount = parseUnits(amount, decimals);
      const approveTx = await usdc.approve(vaultAddress, parsedAmount);
      await approveTx.wait();

      // 3. Deposit into the vault.
      setStatus("Depositing USDC...");
      const vault = new Contract(vaultAddress, VAULT_ABI, signer);
      const depositTx = await vault.deposit(parsedAmount);
      await depositTx.wait();

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
          Beneficiary Address
          <input
            type="text"
            placeholder="0x..."
            value={beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
          />
        </label>
        <label>
          Confirm Beneficiary Address
          <input
            type="text"
            placeholder="0x..."
            value={beneficiaryConfirm}
            onChange={(e) => setBeneficiaryConfirm(e.target.value)}
          />
        </label>
        {beneficiary && !beneficiaryValid && <p className="error">Not a valid address.</p>}
        {beneficiaryMismatch && <p className="error">Addresses don't match.</p>}
        {isSelf && <p className="error">Beneficiary cannot be your own address.</p>}

        <label>
          Check-in Interval
          <select
            value={intervalSeconds}
            onChange={(e) => setIntervalSeconds(Number(e.target.value))}
          >
            {INTERVAL_PRESETS.map((p) => (
              <option key={p.seconds} value={p.seconds}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Grace Period (days)
          <input
            type="number"
            min="0"
            value={graceDays}
            onChange={(e) => setGraceDays(e.target.value)}
          />
        </label>

        <label>
          Amount (USDC)
          <input
            type="number"
            min="0"
            step="0.000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <button type="submit" disabled={!canSubmit}>
          {busy ? "Working..." : "Create Vault"}
        </button>
      </form>
      {status && <p className="muted">{status}</p>}
    </div>
  );
}
