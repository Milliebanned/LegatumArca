import { formatUnits } from "ethers";

// Formatting helpers that turn on-chain values into the strings the dashboard
// design uses ("$8,750.00", "Next check-in in 182 days", "Sep 14, 2026").

export const USDC_DECIMALS = 6;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// 8750000000n -> "$8,750.00"
export function formatUsd(raw) {
  return usd.format(Number(formatUnits(raw, USDC_DECIMALS)));
}

// 2000000000n -> "2,000"; 500000n -> "0.50"
export function formatAmount(raw) {
  const n = Number(formatUnits(raw, USDC_DECIMALS));
  return Number.isInteger(n) ? whole.format(n) : cents.format(n);
}

// 1789400000 -> "Sep 14, 2026"
export function formatDate(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// 1789400000 -> "Sep 14" (the mobile design's activity dates)
export function formatShortDate(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Largest whole unit: 182 days, 5 hours, 3 minutes, 40 seconds.
export function formatSpan(seconds) {
  if (seconds >= 86400) return plural(Math.floor(seconds / 86400), "day");
  if (seconds >= 3600) return plural(Math.floor(seconds / 3600), "hour");
  if (seconds >= 60) return plural(Math.floor(seconds / 60), "minute");
  return plural(Math.max(0, Math.floor(seconds)), "second");
}

// "0x3f...7aE2", the design's wallet-pill format.
export function shortAddress(address) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Countdown used by the beneficiary view: "182d 4h", "3h 12m", "4m 10s".
export function formatDuration(totalSeconds) {
  if (totalSeconds <= 0) return "Deadline passed";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${totalSeconds % 60}s`;
}
