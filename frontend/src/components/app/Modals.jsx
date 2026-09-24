import { useEffect, useRef, useState } from "react";
import { Contract, parseUnits } from "ethers";
import { useWeb3 } from "../../Web3Context.jsx";
import { ARC_CONFIG } from "../../config.js";
import { VAULT_ABI } from "../../abis/Vault.js";
import { ERC20_ABI } from "../../abis/ERC20.js";
import SplitEditor, { rowsFrom, validateSplit } from "../SplitEditor.jsx";
import { formatUsd, USDC_DECIMALS } from "./format.js";

// Dialogs opened from Quick Actions. They render inside the scaled board so
// they scale with it.

function Dialog({ title, blurb, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="db-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="db-dialog db-ui" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <button type="button" className="db-dialog-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <div className="db-dialog-title">{title}</div>
        <p className="muted" style={{ margin: "0 0 20px" }}>
          {blurb}
        </p>
        {children}
      </div>
    </div>
  );
}

// Vaults that can still take deposits / beneficiary changes.
const editable = (vaults) => vaults.filter((v) => v.storedState === "Active");

function VaultSelect({ vaults, value, onChange }) {
  return (
    <label>
      Vault
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {vaults.map((v) => (
          <option key={v.address} value={v.address}>
            {v.name || "Untitled vault"} · {formatUsd(v.balanceRaw)}
          </option>
        ))}
      </select>
    </label>
  );
}

function NoVaults({ onCreate }) {
  return (
    <>
      <p className="muted" style={{ marginBottom: 16 }}>
        You don't have an active vault. Create one first.
      </p>
      <button onClick={onCreate}>Create New Vault</button>
    </>
  );
}

export function DepositDialog({ vaults, initialVault, onClose, onCreate, reload }) {
  const { signer, usdcBalance, refreshBalance } = useWeb3();
  const options = editable(vaults);
  const [vaultAddress, setVaultAddress] = useState(initialVault ?? options[0]?.address ?? "");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const parsed = parseUnits(amount, USDC_DECIMALS);
      setStatus("Approving USDC...");
      const usdc = new Contract(ARC_CONFIG.usdcAddress, ERC20_ABI, signer);
      await (await usdc.approve(vaultAddress, parsed)).wait();
      setStatus("Depositing USDC...");
      await (await new Contract(vaultAddress, VAULT_ABI, signer).deposit(parsed)).wait();
      await Promise.all([reload(), refreshBalance()]);
      onClose();
    } catch (err) {
      setStatus(err?.reason ?? err?.shortMessage ?? err?.message ?? "Deposit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Deposit Funds" blurb="Move USDC from your wallet into one of your vaults." onClose={onClose}>
      {options.length === 0 ? (
        <NoVaults onCreate={onCreate} />
      ) : (
        <form onSubmit={submit}>
          <VaultSelect vaults={options} value={vaultAddress} onChange={setVaultAddress} />
          <label>
            Amount (USDC) · wallet balance {usdcBalance ?? "…"}
            <input type="number" min="0" step="0.000001" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <button type="submit" disabled={busy || !(Number(amount) > 0)}>
            {busy ? "Working..." : "Deposit"}
          </button>
          {status && (
            <p className="muted" style={{ marginTop: 12 }}>
              {status}
            </p>
          )}
        </form>
      )}
    </Dialog>
  );
}

export function BeneficiariesDialog({ vaults, initialVault, onClose, onCreate, reload }) {
  const { signer, address } = useWeb3();
  const options = editable(vaults);
  const [vaultAddress, setVaultAddress] = useState(initialVault ?? options[0]?.address ?? "");
  const current = options.find((v) => v.address === vaultAddress);
  const [rows, setRows] = useState(() => (current ? rowsFrom(current.beneficiaries) : []));
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const pick = (next) => {
    setVaultAddress(next);
    setRows(rowsFrom(options.find((v) => v.address === next).beneficiaries));
  };

  const split = validateSplit(rows, address);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      setStatus("Saving beneficiaries...");
      const vault = new Contract(vaultAddress, VAULT_ABI, signer);
      await (await vault.setBeneficiaries(split.addresses, split.shares)).wait();
      await reload();
      onClose();
    } catch (err) {
      setStatus(err?.reason ?? err?.shortMessage ?? err?.message ?? "Couldn't save beneficiaries");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Beneficiaries"
      blurb="Add, remove or re-weight the people who inherit a vault. Shares must total 100%."
      onClose={onClose}
    >
      {options.length === 0 ? (
        <NoVaults onCreate={onCreate} />
      ) : (
        <form onSubmit={submit}>
          <VaultSelect vaults={options} value={vaultAddress} onChange={pick} />
          <SplitEditor rows={rows} onChange={setRows} ownerAddress={address} />
          <button type="submit" disabled={busy || !split.valid}>
            {busy ? "Working..." : "Save Beneficiaries"}
          </button>
          {status && (
            <p className="muted" style={{ marginTop: 12 }}>
              {status}
            </p>
          )}
        </form>
      )}
    </Dialog>
  );
}
