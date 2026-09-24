import { Icon } from "./Sprites.jsx";

// The dashboard artboard's content row (stat cards, "Your Vaults", Quick
// Actions, Recent Activity), transcribed from Dashboard.dc.html. It only
// renders props; viewModel.js turns chain data into them.

const CARD = { background: "#0A0808", border: "1px solid rgba(255,255,255,.07)", borderRadius: 18 };

// "Active" is the design's pill; the other states reuse its geometry.
const STATUS_PILL = {
  Active: { color: "#4ADE80", background: "#122A1C" },
  Due: { color: "#FBBF24", background: "#2E2410" },
  Distributed: { color: "#A8A7AB", background: "#1C1919" },
  Cancelled: { color: "#FF6B7F", background: "#2A1215" },
};

export function StatusPill({ status }) {
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        ...STATUS_PILL[status],
        padding: "4px 12px",
        borderRadius: 999,
      }}
    >
      {status}
    </span>
  );
}

// One "Your Vaults" card. Clicking it opens that vault.
export function VaultSummaryCard({ vault, onOpen }) {
  const open = () => onOpen?.(vault.address);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${vault.name}`}
      onClick={open}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open())}
      style={{ ...CARD, padding: 20, display: "flex", flexDirection: "column", gap: 12, cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "linear-gradient(150deg,#FF6B7F,#B01730)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(237,43,71,.35)",
            }}
          >
            <Icon name="hex" size={21} style={{ color: "#fff" }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#F5F2EE" }}>{vault.name}</span>
          <StatusPill status={vault.status} />
        </div>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            color: "#D8D6D6",
            background: "#100C0C",
            border: "1px solid rgba(255,255,255,.09)",
            borderRadius: 999,
            padding: "6px 14px",
            flexShrink: 0,
          }}
        >
          USDC
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: "#F5F2EE" }}>{vault.balance}</span>
        <Icon name="chevron-right" size={17} style={{ color: "#6b6b6e" }} />
      </div>
      <div style={{ fontSize: 13, color: "#87868a" }}>{vault.checkIn}</div>
      <div style={{ height: 6, borderRadius: 3, background: "#211A1B", overflow: "hidden" }}>
        <div style={{ width: vault.progress, height: "100%", background: "#22C55E", borderRadius: 3 }} />
      </div>
    </div>
  );
}

export function ActivityRow({ item }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: "#180708",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={item.icon} size={15} style={{ color: "#ED2B47" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#F0EEEC" }}>{item.title}</div>
        <div style={{ fontSize: 11.5, color: item.tone === "up" ? "#3FC97A" : "#87868a", marginTop: 2 }}>{item.sub}</div>
      </div>
      <div style={{ fontSize: 10.5, color: "#77767a", whiteSpace: "nowrap" }}>{item.date}</div>
    </div>
  );
}

const QUICK_PRIMARY = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "linear-gradient(135deg,#FF4D68,#DE1E3C)",
  borderRadius: 12,
  padding: "14px 16px",
  color: "#fff",
  fontSize: 14,
  fontWeight: 700,
  boxShadow: "0 8px 20px rgba(222,30,60,.3)",
};

const QUICK = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#100C0C",
  border: "1px solid rgba(255,255,255,.07)",
  borderRadius: 12,
  padding: "14px 16px",
  color: "#F0EEEC",
  fontSize: 14,
  fontWeight: 600,
};

export function QuickActions({ onCreate, onDeposit, onBeneficiaries, onActivity }) {
  return (
    <div style={{ ...CARD, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#F5F2EE", marginBottom: 2 }}>Quick Actions</div>
      <button onClick={onCreate} style={QUICK_PRIMARY}>
        <Icon name="plus-circle" size={17} /> Create New Vault
      </button>
      <button onClick={onDeposit} style={QUICK}>
        <Icon name="deposit" size={17} style={{ color: "#ED2B47" }} /> Deposit Funds
      </button>
      <button onClick={onBeneficiaries} style={QUICK}>
        <Icon name="users" size={17} style={{ color: "#ED2B47" }} /> Add Beneficiaries
      </button>
      <button onClick={onActivity} style={QUICK}>
        <Icon name="clock" size={17} style={{ color: "#ED2B47" }} /> View Activity
      </button>
    </div>
  );
}

function EmptyVaults({ onCreate }) {
  return (
    <div style={{ ...CARD, padding: 20, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#F5F2EE" }}>No vaults yet</div>
      <div style={{ fontSize: 13, color: "#87868a" }}>
        Create a vault, name the people who inherit it, and deposit USDC.
      </div>
      <button onClick={onCreate} style={QUICK_PRIMARY}>
        <Icon name="plus-circle" size={17} /> Create New Vault
      </button>
    </div>
  );
}

export default function DashboardHome({ data, actions }) {
  return (
    <div style={{ display: "flex", gap: 22, flex: 1, minHeight: 0 }}>
      {/* left col */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ width: 250, ...CARD, padding: 22, position: "relative" }}>
            <div style={{ fontSize: 13, color: "#9c9c9f" }}>Total Vault Value</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: "#F5F2EE", marginTop: 10 }}>{data.totalValue}</div>
            <div
              style={{ fontSize: 13, color: data.changeUp ? "#3FC97A" : "#FF6B7F", fontWeight: 700, marginTop: 8 }}
              title="Change over the last 30 days"
            >
              {data.changeText}
            </div>
            <Icon name="sparkle" size={18} style={{ position: "absolute", top: 20, right: 20, color: "#ED2B47" }} />
          </div>
          <div style={{ width: 180, ...CARD, padding: 22, position: "relative" }}>
            <div style={{ fontSize: 13, color: "#9c9c9f" }}>Active Vaults</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: "#F5F2EE", marginTop: 10 }}>{data.activeCount}</div>
            <Icon name="hex" size={18} style={{ position: "absolute", top: 20, right: 20, color: "#ED2B47" }} />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: "#F5F2EE" }}>Your Vaults</div>
          <a
            href="#"
            onClick={(e) => (e.preventDefault(), actions.onViewAll())}
            style={{ fontSize: 13.5, color: "#ED2B47", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}
          >
            View all <Icon name="arrow-right" size={13} />
          </a>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {data.vaults.length === 0 ? (
            <EmptyVaults onCreate={actions.onCreate} />
          ) : (
            data.vaults.map((v) => <VaultSummaryCard key={v.address} vault={v} onOpen={actions.onOpenVault} />)
          )}
        </div>
      </div>

      {/* right col */}
      <div style={{ width: 264, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        <QuickActions
          onCreate={actions.onCreate}
          onDeposit={actions.onDeposit}
          onBeneficiaries={actions.onBeneficiaries}
          onActivity={actions.onActivity}
        />

        <div style={{ ...CARD, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#F5F2EE" }}>Recent Activity</div>
          {data.activity.length === 0 ? (
            <div style={{ fontSize: 13, color: "#87868a" }}>Nothing yet.</div>
          ) : (
            data.activity.map((item) => <ActivityRow key={item.key} item={item} />)
          )}
        </div>
      </div>
    </div>
  );
}
