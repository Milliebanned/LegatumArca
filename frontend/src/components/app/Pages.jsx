import { useEffect, useRef, useState } from "react";
import { useWeb3 } from "../../Web3Context.jsx";
import { ARC_CONFIG, IS_LOCAL_DEV } from "../../config.js";
import BeneficiaryVaults from "../BeneficiaryVaults.jsx";
import DevFaucet from "../DevFaucet.jsx";
import { ActivityRow, VaultSummaryCard } from "./DashboardHome.jsx";
import { MobileActivityRow, MobileVaultCard } from "./MobileDashboardHome.jsx";
import VaultDetail from "./VaultDetail.jsx";
import { Icon } from "./Sprites.jsx";
import { formatUsd } from "./format.js";
import { activityItems, liveState, sortVaults, vaultCard } from "./viewModel.js";

// The sidebar's other destinations. The design only draws the Dashboard, so
// these reuse its cards, type and colours.

export function VaultsPage({ mobile, vaults, now, selected, onSelect, focusSearch, reload, onEditBeneficiaries, onCreate }) {
  const Card = mobile ? MobileVaultCard : VaultSummaryCard;
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    if (focusSearch) searchRef.current?.focus();
  }, [focusSearch]);

  const q = query.trim().toLowerCase();
  const list = sortVaults(vaults, now).filter(
    (v) => !q || (v.name || "").toLowerCase().includes(q) || v.address.toLowerCase().includes(q)
  );
  const current = vaults.find((v) => v.address === selected) ?? list[0];

  return (
    <div className="db-page db-ui">
      <div className="db-page-row">
        <div className="db-col db-col-list">
          <label className="db-search" style={{ margin: 0 }}>
            <Icon name="search" size={16} />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search vaults by name or address"
              aria-label="Search vaults"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {list.map((v) => (
            <div
              key={v.address}
              style={{
                borderRadius: mobile ? 17 : 19,
                outline: current?.address === v.address ? "1.5px solid rgba(237,43,71,.55)" : "none",
              }}
            >
              <Card vault={vaultCard(v, now)} onOpen={onSelect} />
            </div>
          ))}
          {vaults.length === 0 && (
            <div className="db-card">
              <p className="muted" style={{ marginBottom: 14 }}>
                You don't have a vault yet.
              </p>
              <button onClick={onCreate}>Create New Vault</button>
            </div>
          )}
          {vaults.length > 0 && list.length === 0 && <p className="muted">No vault matches "{query}".</p>}
        </div>
        <div className="db-col">
          {current && (
            <VaultDetail
              key={current.address}
              vault={current}
              now={now}
              reload={reload}
              onEditBeneficiaries={onEditBeneficiaries}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function BeneficiariesPage({ vaults, now, onEditBeneficiaries }) {
  // Everyone named across your open vaults, with where and how much.
  const people = new Map();
  for (const v of vaults) {
    if (!["Active", "Due"].includes(liveState(v, now))) continue;
    for (const b of v.beneficiaries) {
      const entry = people.get(b.address) ?? { address: b.address, vaults: [] };
      entry.vaults.push({ vault: v, bps: b.bps, value: (v.balanceRaw * BigInt(b.bps)) / 10000n });
      people.set(b.address, entry);
    }
  }
  const named = [...people.values()];

  return (
    <div className="db-page db-ui">
      <div className="db-page-row">
        <div className="db-col">
          <div className="db-card">
            <h2>People you've named</h2>
            {named.length === 0 && <p className="muted">None of your open vaults names anyone yet.</p>}
            {named.map((p) => (
              <div key={p.address} className="vault-row" style={{ alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <p className="mono" style={{ color: "#F0EEEC" }}>
                    {p.address}
                  </p>
                  {p.vaults.map(({ vault, bps, value }) => (
                    <p key={vault.address} className="muted">
                      {bps / 100}% of {vault.name || "Untitled vault"} · {formatUsd(value)} today
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div>
            <button onClick={() => onEditBeneficiaries()}>Add or Edit Beneficiaries</button>
          </div>
        </div>
        <div className="db-col">
          <BeneficiaryVaults />
        </div>
      </div>
    </div>
  );
}

export function ActivityPage({ mobile, vaults }) {
  const items = activityItems(vaults);
  if (mobile) {
    return (
      <div className="db-page db-ui">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {items.length === 0 && <p className="muted">Nothing has happened in your vaults yet.</p>}
          {items.map((item) => (
            <MobileActivityRow
              key={item.key}
              item={item.sub === item.vault ? item : { ...item, sub: `${item.sub} · ${item.vault}` }}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="db-page db-ui">
      <div className="db-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.length === 0 && <p className="muted">Nothing has happened in your vaults yet.</p>}
        {items.map((item) => (
          <div key={item.key} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ActivityRow item={item} />
            </div>
            <div style={{ width: 220, fontSize: 12, color: "#87868a", textAlign: "right" }}>{item.vault}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const nameKey = (address) => `legatumarca:name:${address.toLowerCase()}`;

export function readDisplayName(address) {
  try {
    return localStorage.getItem(nameKey(address)) || "";
  } catch {
    return "";
  }
}

export function SettingsPage({ displayName, onDisplayName, onDisconnect }) {
  const { address, walletName, usdcBalance } = useWeb3();
  const [draft, setDraft] = useState(displayName);
  const explorer = ARC_CONFIG.blockExplorerUrl;

  return (
    <div className="db-page db-ui">
      <div className="db-page-row">
        <div className="db-col">
          <div className="db-card">
            <h2>Display name</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onDisplayName(draft.trim());
              }}
            >
              <label>
                Shown in the dashboard greeting. Saved in this browser only, never on-chain.
                <input type="text" maxLength={40} value={draft} onChange={(e) => setDraft(e.target.value)} />
              </label>
              <button type="submit">Save</button>
            </form>
          </div>
          {IS_LOCAL_DEV && <DevFaucet />}
        </div>
        <div className="db-col">
          <div className="db-card">
            <h2>Wallet &amp; network</h2>
            <div className="stat-row">
              <span>Wallet</span>
              <span>{walletName ?? "Browser wallet"}</span>
            </div>
            <div className="stat-row">
              <span>Address</span>
              <span className="mono">{address}</span>
            </div>
            <div className="stat-row">
              <span>Wallet balance</span>
              <span>{usdcBalance ?? "…"} USDC</span>
            </div>
            <div className="stat-row">
              <span>Network</span>
              <span>
                {ARC_CONFIG.label} · chain {ARC_CONFIG.chainId}
              </span>
            </div>
            <div className="stat-row">
              <span>Vault factory</span>
              {explorer ? (
                <a
                  className="mono"
                  href={`${explorer}/address/${ARC_CONFIG.factoryAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#ED2B47" }}
                >
                  {ARC_CONFIG.factoryAddress.slice(0, 10)}…
                </a>
              ) : (
                <span className="mono">{ARC_CONFIG.factoryAddress}</span>
              )}
            </div>
            <div className="button-row">
              <button className="danger" onClick={onDisconnect}>
                Disconnect
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
