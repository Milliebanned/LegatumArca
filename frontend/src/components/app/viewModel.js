import { formatAmount, formatDate, formatShortDate, formatSpan, formatUsd } from "./format.js";

// Turns loaded vaults (see useVaults.js) into the exact props the dashboard
// artboard renders. Kept free of React and chain calls so the same props can
// come from fixtures when checking the page against the design.

// Stored state, advanced to Due once the deadline has passed (the same rule
// as Vault.getVaultState()).
export function liveState(v, now) {
  if (v.storedState === "Active" && now > v.lastCheckIn + v.interval + v.grace) return "Due";
  return v.storedState;
}

export function checkInLine(v, now) {
  const state = liveState(v, now);
  if (state === "Distributed") return "Paid out to beneficiaries";
  if (state === "Cancelled") return "Vault cancelled";
  if (state === "Due") return "Timer ended · payout within a day";
  const due = v.lastCheckIn + v.interval;
  if (now < due) return `Next check-in in ${formatSpan(due - now)}`;
  return `Check-in overdue · grace ends in ${formatSpan(v.lastCheckIn + v.interval + v.grace - now)}`;
}

// Share of the check-in interval still remaining, as a CSS width.
export function progressWidth(v, now) {
  if (liveState(v, now) !== "Active") return "0%";
  const left = v.lastCheckIn + v.interval - now;
  const pct = Math.max(0, Math.min(1, left / v.interval)) * 100;
  return `${Math.round(pct)}%`;
}

const isOpen = (v, now) => ["Active", "Due"].includes(liveState(v, now));

// Newest first, open vaults ahead of distributed/cancelled ones.
export function sortVaults(vaults, now) {
  return [...vaults].reverse().sort((a, b) => Number(isOpen(b, now)) - Number(isOpen(a, now)));
}

export function vaultCard(v, now) {
  return {
    address: v.address,
    name: v.name || "Untitled vault",
    status: liveState(v, now),
    balance: formatUsd(v.balanceRaw),
    checkIn: checkInLine(v, now),
    progress: progressWidth(v, now),
  };
}

const DAY = 86400;
const INFLOW = new Set(["Deposit"]);
const OUTFLOW = new Set(["Withdraw", "Payout", "Cancel"]);

// Change in total vault value over the last 30 days, from recorded flows.
// USDC doesn't earn anything in a vault, so this is deposits minus money out.
export function thirtyDayChange(vaults, now) {
  let total = 0n;
  let net = 0n;
  for (const v of vaults) {
    total += v.balanceRaw;
    for (const e of v.history) {
      if (e.timestamp < now - 30 * DAY) continue;
      if (INFLOW.has(e.action)) net += e.amount;
      if (OUTFLOW.has(e.action)) net -= e.amount;
    }
  }
  const before = total - net;
  if (before <= 0n) return { up: true, text: total > 0n ? "▲ New" : "▲ 0.0%" };
  const pct = (Number(net) / Number(before)) * 100;
  return { up: pct >= 0, text: `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%` };
}

const shortAddr = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "es"}`;

// One design activity row per history entry, across all vaults.
export function activityItems(vaults) {
  const items = [];
  for (const v of vaults) {
    const name = v.name || "Untitled vault";
    const firstBeneficiaries = v.history.find((e) => e.action === "BeneficiariesSet");
    for (const e of v.history) {
      const base = { key: `${v.address}-${e.index}`, timestamp: e.timestamp, index: e.index, date: formatDate(e.timestamp), shortDate: formatShortDate(e.timestamp), vault: name };
      switch (e.action) {
        case "Created":
          items.push({ ...base, icon: "hex", title: "Vault created", sub: name, tone: "muted" });
          break;
        case "BeneficiariesSet":
          items.push({
            ...base,
            icon: "users",
            title: e === firstBeneficiaries ? "Beneficiary added" : "Beneficiaries updated",
            sub: plural(Number(e.amount), "address"),
            tone: "muted",
          });
          break;
        case "Deposit":
          items.push({ ...base, icon: "receive", title: "Deposit received", sub: `+$${formatAmount(e.amount)} USDC`, tone: "up" });
          break;
        case "Withdraw":
          items.push({ ...base, icon: "deposit", title: "Withdrawal", sub: `−$${formatAmount(e.amount)} USDC`, tone: "muted" });
          break;
        case "CheckIn":
          items.push({ ...base, icon: "clock", title: "Checked in", sub: name, tone: "muted" });
          break;
        case "Payout":
          items.push({
            ...base,
            icon: "receive",
            title: "Paid to beneficiary",
            sub: `$${formatAmount(e.amount)} to ${shortAddr(e.actor)}`,
            tone: "muted",
          });
          break;
        case "PayoutFailed":
          items.push({
            ...base,
            icon: "users",
            title: "Payout held",
            sub: `$${formatAmount(e.amount)} for ${shortAddr(e.actor)}`,
            tone: "muted",
          });
          break;
        case "Cancel":
          items.push({ ...base, icon: "hex", title: "Vault cancelled", sub: name, tone: "muted" });
          break;
        default:
          break;
      }
    }
  }
  // Newest first; within one block, later entries first (so "Beneficiary
  // added" sits above the "Vault created" it was recorded with).
  return items.sort((a, b) => b.timestamp - a.timestamp || b.index - a.index);
}

// Does any open vault need the owner's attention (overdue or due)?
export function needsAttention(vaults, now) {
  return vaults.some((v) => {
    const state = liveState(v, now);
    return state === "Due" || (state === "Active" && now > v.lastCheckIn + v.interval);
  });
}

export function dashboardProps(vaults, now) {
  const change = thirtyDayChange(vaults, now);
  return {
    totalValue: formatUsd(vaults.reduce((sum, v) => sum + v.balanceRaw, 0n)),
    changeText: change.text,
    changeUp: change.up,
    activeCount: String(vaults.filter((v) => liveState(v, now) === "Active").length),
    vaults: sortVaults(vaults, now).slice(0, 2).map((v) => vaultCard(v, now)),
    activity: activityItems(vaults).slice(0, 3),
  };
}
