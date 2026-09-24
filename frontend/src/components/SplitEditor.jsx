import { isAddress } from "ethers";
import { TOTAL_SHARES, MAX_BENEFICIARIES } from "../abis/Vault.js";

// Beneficiary rows (address + percentage) with the contract's rules checked
// client-side. Used when creating a vault and when editing its beneficiaries.

export const emptyRow = () => ({ address: "", percent: "" });

// Rows pre-filled from a vault's current beneficiaries.
export const rowsFrom = (beneficiaries) =>
  beneficiaries.map((b) => ({ address: b.address, percent: String(b.bps / 100) }));

// "33.33" -> 3333 basis points. NaN for anything that isn't a positive
// number with at most two decimals.
export function toBps(percent) {
  if (!/^\d+(\.\d{1,2})?$/.test(percent.trim())) return NaN;
  return Math.round(Number(percent) * 100);
}

export function validateSplit(rows, ownerAddress) {
  const errors = rows.map((r, i) => {
    if (!r.address) return null;
    if (!isAddress(r.address)) return "Not a valid address.";
    if (ownerAddress && r.address.toLowerCase() === ownerAddress.toLowerCase()) return "Can't be your own address.";
    if (rows.findIndex((o) => o.address.toLowerCase() === r.address.toLowerCase()) !== i) return "Listed twice.";
    if (r.percent && !(toBps(r.percent) > 0)) return "Percentage must be above 0, max two decimals.";
    return null;
  });
  const totalBps = rows.reduce((sum, r) => sum + (toBps(r.percent) || 0), 0);
  const complete = rows.length > 0 && rows.every((r) => r.address && r.percent);
  return {
    errors,
    totalBps,
    valid: complete && errors.every((e) => !e) && totalBps === TOTAL_SHARES,
    addresses: rows.map((r) => r.address),
    shares: rows.map((r) => toBps(r.percent)),
  };
}

export default function SplitEditor({ rows, onChange, ownerAddress }) {
  const { errors, totalBps } = validateSplit(rows, ownerAddress);

  const update = (i, field, value) => onChange(rows.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  const splitEvenly = () => {
    const n = rows.length;
    const base = Math.floor(TOTAL_SHARES / n);
    // Remainder goes to the first row so the total is exactly 100%.
    onChange(rows.map((r, i) => ({ ...r, percent: String((i === 0 ? base + (TOTAL_SHARES - base * n) : base) / 100) })));
  };

  return (
    <>
      <div className="split-header">
        <span>Beneficiaries</span>
        {rows.length > 1 && (
          <button type="button" className="link-button" onClick={splitEvenly}>
            Split evenly
          </button>
        )}
      </div>
      {rows.map((r, i) => (
        <div key={i} className="split-row-wrap">
          <div className="split-row">
            <input
              type="text"
              aria-label={`Beneficiary ${i + 1} address`}
              placeholder="0x... beneficiary address"
              value={r.address}
              onChange={(e) => update(i, "address", e.target.value.trim())}
            />
            <div className="percent-input">
              <input
                type="text"
                inputMode="decimal"
                aria-label={`Beneficiary ${i + 1} share in percent`}
                placeholder="0"
                value={r.percent}
                onChange={(e) => update(i, "percent", e.target.value)}
              />
              <span>%</span>
            </div>
            {rows.length > 1 && (
              <button
                type="button"
                className="ghost"
                onClick={() => onChange(rows.filter((_, j) => j !== i))}
                aria-label={`Remove beneficiary ${i + 1}`}
              >
                ✕
              </button>
            )}
          </div>
          {errors[i] && <p className="error">{errors[i]}</p>}
        </div>
      ))}
      <div className="split-footer">
        {rows.length < MAX_BENEFICIARIES ? (
          <button type="button" className="link-button" onClick={() => onChange([...rows, emptyRow()])}>
            + Add beneficiary
          </button>
        ) : (
          <span className="muted">Maximum of {MAX_BENEFICIARIES} beneficiaries.</span>
        )}
        <span className={totalBps === TOTAL_SHARES ? "total-ok" : "error"}>
          Total: {(totalBps / 100).toFixed(2).replace(/\.00$/, "")}%
        </span>
      </div>
    </>
  );
}
