import { formatUnits } from "ethers";

// Formatting helpers that turn on-chain values into the strings the dashboard
// shows ("48,250", "62 of 90 days left", "5 Dec 2026", "0x7A3f…E21c").

export const USDC_DECIMALS = 6;
export const DAY = 86400;

// 48250000000n -> "48,250"; 500000n -> "0.5"
export function formatUsdc(raw) {
  return Number(formatUnits(raw, USDC_DECIMALS)).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Largest whole unit: 182 days, 5 hours, 3 minutes, 40 seconds.
export function formatSpan(seconds) {
  if (seconds >= DAY) return plural(Math.floor(seconds / DAY), "day");
  if (seconds >= 3600) return plural(Math.floor(seconds / 3600), "hour");
  if (seconds >= 60) return plural(Math.floor(seconds / 60), "minute");
  return plural(Math.max(0, Math.floor(seconds)), "second");
}

// 1796428800 -> "5 Dec 2026". Deadlines less than two days out carry the time.
export function formatDeadline(unixSeconds, now) {
  const date = new Date(unixSeconds * 1000);
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (unixSeconds - now >= 2 * DAY) return day;
  return `${day}, ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

// "28 days ago", "3 hours ago", "Just now"
export function formatAgo(unixSeconds, now) {
  const elapsed = now - unixSeconds;
  return elapsed < 60 ? "Just now" : `${formatSpan(elapsed)} ago`;
}

// "0x7A3f…E21c"
export function shortAddress(address) {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export const txError = (err, fallback) => err?.reason ?? err?.shortMessage ?? err?.message ?? fallback;
