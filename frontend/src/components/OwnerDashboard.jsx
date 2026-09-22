import { useCallback, useEffect, useState } from "react";
import { Contract, formatUnits, parseUnits } from "ethers";
import { useWeb3 } from "../Web3Context.jsx";
import { ARC_CONFIG } from "../config.js";
import { VAULT_FACTORY_ABI } from "../abis/VaultFactory.js";
import { VAULT_ABI, VAULT_STATE } from "../abis/Vault.js";
import { ERC20_ABI } from "../abis/ERC20.js";

function formatDuration(totalSeconds) {
  if (totalSeconds <= 0) return "Deadline passed";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function OwnerDashboard() {
  const { provider, signer, address, refreshBalance } = useWeb3();
  const [vaultAddress, setVaultAddress] = useState(null);
  const [info, setInfo] = useState(null);
  const [decimals, setDecimals] = useState(6);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const load = useCallback(async () => {
    if (!provider || !address) return;
    const factory = new Contract(ARC_CONFIG.factoryAddress, VAULT_FACTORY_ABI, provider);
    const vAddr = await factory.vaults(address);
    if (vAddr === "0x0000000000000000000000000000000000000000") {
      setVaultAddress(null);
      setInfo(null);
      return;
    }
    setVaultAddress(vAddr);

    const vault = new Contract(vAddr, VAULT_ABI, provider);
    const usdc = new Contract(ARC_CONFIG.usdcAddress, ERC20_ABI, provider);
    const [state, beneficiary, balance, timeLeft, dec, interval] = await Promise.all([
      vault.getVaultState(),
      vault.beneficiary(),
      vault.balance(),
      vault.timeUntilDeadline(),
      usdc.decimals(),
      vault.checkInInterval(),
    ]);
    setDecimals(dec);
    setInfo({
      state: Number(state),
      beneficiary,
      balance: formatUnits(balance, dec),
      timeLeft: Number(timeLeft),
      interval: Number(interval),
    });
  }, [provider, address]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  async function withVault(action) {
    if (!signer || !vaultAddress) return;
    setBusy(true);
    setStatus(null);
    try {
      const vault = new Contract(vaultAddress, VAULT_ABI, signer);
      await action(vault);
      await load();
      await refreshBalance();
    } catch (err) {
      setStatus(err?.reason ?? err?.shortMessage ?? err?.message ?? "Transaction failed");
    } finally {
      setBusy(false);
    }
  }

  const handleCheckIn = () =>
    withVault(async (vault) => {
      const tx = await vault.checkIn();
      await tx.wait();
      setStatus("Check-in successful. Deadline reset.");
    });

  const handleWithdraw = () =>
    withVault(async (vault) => {
      const tx = await vault.withdraw(parseUnits(withdrawAmount || "0", decimals));
      await tx.wait();
      setStatus("Withdrawal complete.");
      setWithdrawAmount("");
    });

  const handleCancel = () =>
    withVault(async (vault) => {
      const tx = await vault.cancel();
      await tx.wait();
      setStatus("Vault cancelled.");
    });

  if (!vaultAddress) {
    return (
      <div className="card">
        <h2>Your Vault</h2>
        <p className="muted">You don't have a vault yet. Create one to get started.</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="card">
        <h2>Your Vault</h2>
        <p className="muted">Loading...</p>
      </div>
    );
  }

  const stateName = VAULT_STATE[info.state] ?? "Unknown";
  const isActionable = stateName === "Active" || stateName === "Claimable";

  return (
    <div className="card">
      <h2>Your Vault</h2>
      <p className="mono muted">{vaultAddress}</p>

      <div className="stat-row">
        <span>Status:</span>
        <span className={`badge badge-${stateName.toLowerCase()}`}>{stateName}</span>
      </div>
      <div className="stat-row">
        <span>Balance:</span>
        <span>{info.balance} USDC</span>
      </div>
      <div className="stat-row">
        <span>Beneficiary:</span>
        <span className="mono">{info.beneficiary}</span>
      </div>
      <div className="stat-row">
        <span>Check-in Interval:</span>
        <span>{Math.round(info.interval / 86400)} days</span>
      </div>
      <div className="stat-row">
        <span>Time Until Deadline:</span>
        <span>{formatDuration(info.timeLeft)}</span>
      </div>

      <div className="button-row">
        <button onClick={handleCheckIn} disabled={busy || !isActionable}>
          Check In Now
        </button>
        <button onClick={handleCancel} disabled={busy || stateName !== "Active"}>
          Cancel Vault
        </button>
      </div>

      <div className="withdraw-row">
        <input
          type="number"
          min="0"
          step="0.000001"
          placeholder="Amount"
          value={withdrawAmount}
          onChange={(e) => setWithdrawAmount(e.target.value)}
          disabled={busy || stateName !== "Active"}
        />
        <button
          onClick={handleWithdraw}
          disabled={busy || stateName !== "Active" || !(Number(withdrawAmount) > 0)}
        >
          Withdraw
        </button>
      </div>

      {status && <p className="muted">{status}</p>}
    </div>
  );
}
