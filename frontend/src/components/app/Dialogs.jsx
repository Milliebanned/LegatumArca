import { useEffect, useId, useRef, useState } from "react";
import { Contract, parseUnits } from "ethers";
import { useWeb3 } from "../../Web3Context.jsx";
import { ARC_CONFIG } from "../../config.js";
import { VAULT_FACTORY_ABI } from "../../abis/VaultFactory.js";
import { VAULT_ABI } from "../../abis/Vault.js";
import { ERC20_ABI } from "../../abis/ERC20.js";
import DevFaucet from "../DevFaucet.jsx";
import SplitEditor, { emptyRow, rowsFrom, validateSplit } from "../SplitEditor.jsx";
import { DAY, formatUsdc, shortAddress, txError, USDC_DECIMALS } from "./format.js";
import { vaultName } from "./viewModel.js";

// The dashboard's dialogs. Each one signs its transactions, then hands a
// short message to `onDone`, which reloads the vaults and shows it as a toast.

function Modal({ title, blurb, wide, onClose, children }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!ref.current.open) ref.current.showModal();
  }, []);

  return (
    <dialog ref={ref} className={wide ? "wide" : undefined} aria-labelledby={titleId} onClose={onClose}>
      <h2 id={titleId}>{title}</h2>
      {blurb && <p style={{ color: "var(--mute)" }}>{blurb}</p>}
      {children}
    </dialog>
  );
}

// Runs one signing flow at a time and keeps its progress line.
function useTx(onDone) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function run(action, fallback) {
    setBusy(true);
    try {
      const result = await action(setStatus);
      await onDone(result);
    } catch (err) {
      setStatus(txError(err, fallback));
    } finally {
      setBusy(false);
    }
  }

  return { busy, status, run };
}

function Actions({ busy, disabled, submit, onClose, danger }) {
  return (
    <div className="acts2">
      <button className="btn" type="button" onClick={onClose}>
        Cancel
      </button>
      <button className={danger ? "btn danger" : "btn solid"} type="submit" disabled={busy || disabled}>
        {busy ? "Working…" : submit}
      </button>
    </div>
  );
}

// Web3Context hands the balance over as a decimal string, or null while loading.
const walletBalance = (balance) =>
  balance == null ? "…" : Number(balance).toLocaleString("en-US", { maximumFractionDigits: 2 });

const Status = ({ children }) => (children ? <p className="hint" role="status">{children}</p> : null);

// Approve, then deposit, reporting each step.
async function depositInto(vaultAddress, amount, signer, setStatus) {
  setStatus("Approving USDC…");
  const usdc = new Contract(ARC_CONFIG.usdcAddress, ERC20_ABI, signer);
  await (await usdc.approve(vaultAddress, amount)).wait();
  setStatus("Depositing USDC…");
  await (await new Contract(vaultAddress, VAULT_ABI, signer).deposit(amount)).wait();
}

// The contract refuses windows under a day (Vault.MIN_CHECK_IN_INTERVAL).
const WINDOWS = [
  { label: "30 days", seconds: 30 * DAY },
  { label: "90 days", seconds: 90 * DAY },
  { label: "180 days", seconds: 180 * DAY },
  { label: "1 year", seconds: 365 * DAY },
];

const GRACES = [
  { label: "None", seconds: 0 },
  { label: "1 day", seconds: DAY },
  { label: "7 days", seconds: 7 * DAY },
  { label: "30 days", seconds: 30 * DAY },
];

export function NewVaultDialog({ onClose, onDone, saveLabels }) {
  const { signer, address } = useWeb3();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [windowSeconds, setWindowSeconds] = useState(90 * DAY);
  const [graceSeconds, setGraceSeconds] = useState(7 * DAY);
  const [rows, setRows] = useState([emptyRow()]);
  const [confirmed, setConfirmed] = useState(false);
  const { busy, status, run } = useTx(onDone);

  const split = validateSplit(rows, address);
  const tooLong = new TextEncoder().encode(name).length > 64;

  const changeRows = (next) => {
    setRows(next);
    setConfirmed(false);
  };

  const submit = (e) => {
    e.preventDefault();
    run(async (setStatus) => {
      // The vault's address isn't known until this confirms: minimal-proxy
      // clone addresses aren't cheaply predictable client-side.
      setStatus("Creating vault…");
      const factory = new Contract(ARC_CONFIG.factoryAddress, VAULT_FACTORY_ABI, signer);
      const tx = await factory.createVault(name.trim(), split.addresses, split.shares, windowSeconds, graceSeconds);
      const receipt = await tx.wait();
      const created = receipt.logs
        .map((log) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((log) => log?.name === "VaultCreated");
      const vaultAddress = created.args.vault;
      saveLabels(rows);

      if (Number(amount) > 0) {
        const usdc = new Contract(ARC_CONFIG.usdcAddress, ERC20_ABI, signer);
        await depositInto(vaultAddress, parseUnits(amount, await usdc.decimals()), signer, setStatus);
      }
      return { message: `${name.trim()} is armed.`, select: vaultAddress };
    }, "Couldn't create the vault");
  };

  return (
    <Modal
      title="New vault"
      blurb="Deposit, choose a check-in window and name who receives it."
      wide={rows.length > 1}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="f">
          <label className="label" htmlFor="nvName">
            Vault name
          </label>
          <input
            id="nvName"
            required
            maxLength={28}
            placeholder="e.g. Emergency fund"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {tooLong && <p className="err">Name is too long.</p>}
        </div>
        <div className="two">
          <div className="f">
            <label className="label" htmlFor="nvAmt">
              Deposit (USDC)
            </label>
            <input
              id="nvAmt"
              type="number"
              min="0"
              step="any"
              placeholder="5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="f">
            <label className="label" htmlFor="nvWin">
              Check-in window
            </label>
            <select id="nvWin" value={windowSeconds} onChange={(e) => setWindowSeconds(Number(e.target.value))}>
              {WINDOWS.map((w) => (
                <option key={w.seconds} value={w.seconds}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <SplitEditor rows={rows} onChange={changeRows} ownerAddress={address} />
        <div className="f">
          <label className="label" htmlFor="nvGrace">
            Grace period
          </label>
          <select id="nvGrace" value={graceSeconds} onChange={(e) => setGraceSeconds(Number(e.target.value))}>
            {GRACES.map((g) => (
              <option key={g.seconds} value={g.seconds}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <p className="hint">
          Legatum Arca is unaudited software, and a vault is not a legal will. Start with an amount you could afford
          to lose.
        </p>
        <label className="check">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          I've double-checked every wallet address. Funds sent to a wrong address can't be recovered.
        </label>
        <Status>{status}</Status>
        <Actions busy={busy} disabled={!split.valid || tooLong || !confirmed} submit="Create vault" onClose={onClose} />
      </form>
    </Modal>
  );
}

function AmountField({ id, label, hint, value, onChange }) {
  return (
    <div className="f">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        min="0"
        step="any"
        required
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="hint">{hint}</span>
    </div>
  );
}

export function DepositDialog({ vault, onClose, onDone }) {
  const { signer, usdcBalance } = useWeb3();
  const [amount, setAmount] = useState("");
  const { busy, status, run } = useTx(onDone);

  const submit = (e) => {
    e.preventDefault();
    run(async (setStatus) => {
      await depositInto(vault.address, parseUnits(amount, USDC_DECIMALS), signer, setStatus);
      return { message: `Deposited ${amount} USDC into ${vaultName(vault)}.` };
    }, "Deposit failed");
  };

  return (
    <Modal title="Deposit" blurb={`Move USDC from your wallet into ${vaultName(vault)}.`} onClose={onClose}>
      <form onSubmit={submit}>
        <AmountField
          id="depAmt"
          label="Amount (USDC)"
          hint={`Wallet balance: ${walletBalance(usdcBalance)} USDC`}
          value={amount}
          onChange={setAmount}
        />
        <Status>{status}</Status>
        <Actions busy={busy} disabled={!(Number(amount) > 0)} submit="Deposit" onClose={onClose} />
      </form>
    </Modal>
  );
}

export function WithdrawDialog({ vault, onClose, onDone }) {
  const { signer } = useWeb3();
  const [amount, setAmount] = useState("");
  const { busy, status, run } = useTx(onDone);

  const submit = (e) => {
    e.preventDefault();
    run(async (setStatus) => {
      setStatus("Withdrawing…");
      const contract = new Contract(vault.address, VAULT_ABI, signer);
      await (await contract.withdraw(parseUnits(amount, USDC_DECIMALS))).wait();
      return { message: `Withdrew ${amount} USDC from ${vaultName(vault)}.` };
    }, "Withdrawal failed");
  };

  return (
    <Modal title="Withdraw" blurb={`Take USDC out of ${vaultName(vault)}, back to your wallet.`} onClose={onClose}>
      <form onSubmit={submit}>
        <AmountField
          id="wdAmt"
          label="Amount (USDC)"
          hint={`In the vault: ${formatUsdc(vault.balanceRaw)} USDC`}
          value={amount}
          onChange={setAmount}
        />
        <Status>{status}</Status>
        <Actions busy={busy} disabled={!(Number(amount) > 0)} submit="Withdraw" onClose={onClose} />
      </form>
    </Modal>
  );
}

export function BeneficiariesDialog({ vault, labels, saveLabels, onClose, onDone }) {
  const { signer, address } = useWeb3();
  const [rows, setRows] = useState(() => rowsFrom(vault.beneficiaries, labels));
  const { busy, status, run } = useTx(onDone);

  const split = validateSplit(rows, address);
  // Names live in this browser; only a change to who or how much is signed.
  const unchanged =
    rows.length === vault.beneficiaries.length &&
    vault.beneficiaries.every(
      (b, i) => b.address.toLowerCase() === rows[i].address.toLowerCase() && b.bps === split.shares[i]
    );

  const submit = (e) => {
    e.preventDefault();
    run(async (setStatus) => {
      if (!unchanged) {
        setStatus("Saving beneficiaries…");
        const contract = new Contract(vault.address, VAULT_ABI, signer);
        await (await contract.setBeneficiaries(split.addresses, split.shares)).wait();
      }
      saveLabels(rows);
      return { message: `Beneficiaries of ${vaultName(vault)} saved.` };
    }, "Couldn't save beneficiaries");
  };

  return (
    <Modal
      title="Beneficiaries"
      blurb={`Add, remove or re-weight the people who receive ${vaultName(vault)}. Shares must total 100%.`}
      wide={rows.length > 1}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <SplitEditor rows={rows} onChange={setRows} ownerAddress={address} />
        <Status>{status}</Status>
        <Actions busy={busy} disabled={!split.valid} submit="Save" onClose={onClose} />
      </form>
    </Modal>
  );
}

export function CloseVaultDialog({ vault, onClose, onDone }) {
  const { signer } = useWeb3();
  const { busy, status, run } = useTx(onDone);

  const submit = (e) => {
    e.preventDefault();
    run(async (setStatus) => {
      setStatus("Closing vault…");
      await (await new Contract(vault.address, VAULT_ABI, signer).cancel()).wait();
      return { message: `${vaultName(vault)} is closed. Its funds are back in your wallet.` };
    }, "Couldn't close the vault");
  };

  return (
    <Modal
      title="Close this vault?"
      blurb={`${vaultName(vault)} stops for good and its ${formatUsdc(vault.balanceRaw)} USDC returns to your wallet. This can't be undone.`}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <Status>{status}</Status>
        <Actions busy={busy} submit="Close vault" onClose={onClose} danger />
      </form>
    </Modal>
  );
}

export function AccountDialog({ displayName, onDisplayName, onDisconnect, onClose }) {
  const { address, walletName, usdcBalance } = useWeb3();
  const [draft, setDraft] = useState(displayName);
  const [copied, setCopied] = useState(false);
  const explorer = ARC_CONFIG.blockExplorerUrl;

  const submit = (e) => {
    e.preventDefault();
    onDisplayName(draft.trim());
    onClose();
  };

  const copy = async () => {
    await navigator.clipboard?.writeText(address);
    setCopied(true);
  };

  return (
    <Modal title="Account" blurb="Your wallet, network and the name this dashboard greets you by." onClose={onClose}>
      <form onSubmit={submit}>
        <div className="f">
          <label className="label" htmlFor="acName">
            Display name
          </label>
          <input id="acName" maxLength={40} placeholder="e.g. Ade" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <span className="hint">Saved in this browser only, never on-chain.</span>
        </div>
        <div>
          <div className="kv">
            <span className="label">Wallet</span>
            <span>{walletName ?? "Browser wallet"}</span>
          </div>
          <div className="kv">
            <span className="label">Address</span>
            <button type="button" className="link mono" onClick={copy} title={address}>
              {copied ? "Copied" : shortAddress(address)}
            </button>
          </div>
          <div className="kv">
            <span className="label">Balance</span>
            <span className="mono">{walletBalance(usdcBalance)} USDC</span>
          </div>
          <div className="kv">
            <span className="label">Network</span>
            <span>
              {ARC_CONFIG.label} · chain {ARC_CONFIG.chainId}
            </span>
          </div>
          <div className="kv">
            <span className="label">Vault factory</span>
            {explorer ? (
              <a
                className="link mono"
                href={`${explorer}/address/${ARC_CONFIG.factoryAddress}`}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddress(ARC_CONFIG.factoryAddress)}
              </a>
            ) : (
              <span className="mono">{shortAddress(ARC_CONFIG.factoryAddress)}</span>
            )}
          </div>
          <DevFaucet />
        </div>
        <div className="acts2">
          <button className="btn danger" type="button" onClick={onDisconnect} style={{ marginRight: "auto" }}>
            Disconnect
          </button>
          <button className="btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn solid" type="submit">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
