import { Icon } from "./Sprites.jsx";

// Everything below the greeting on the mobile dashboard artboard
// (DashboardMobile.dc.html): stat cards, "Your Vaults", Quick Actions and
// Recent Activity. Takes the same props as DashboardHome.

const CARD = { background: "#0A0A0A", border: "1px solid rgba(255,255,255,.07)", borderRadius: 16 };

const STATUS_PILL = {
  Active: { color: "#4ADE80", background: "#122A1C" },
  Due: { color: "#FBBF24", background: "#2E2410" },
  Distributed: { color: "#A8A7AB", background: "#1C1919" },
  Cancelled: { color: "#FF6B7F", background: "#2A1215" },
};

const SECTION = { fontSize: 15, fontWeight: 700, color: "#F5F2EE" };

export function MobileVaultCard({ vault, onOpen }) {
  const open = () => onOpen?.(vault.address);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${vault.name}`}
      onClick={open}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), open())}
      style={{ ...CARD, padding: 14, display: "flex", flexDirection: "column", gap: 8, cursor: "pointer" }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "linear-gradient(150deg,#FF6B7F,#B01730)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="hex" size={15} style={{ color: "#fff" }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#F5F2EE" }}>{vault.name}</span>
        </div>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            ...STATUS_PILL[vault.status],
            padding: "3px 9px",
            borderRadius: 999,
            flexShrink: 0,
          }}
        >
          {vault.status}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#F5F2EE" }}>{vault.balance}</span>
        <span style={{ fontSize: 10.5, color: "#87868a", fontWeight: 600 }}>USDC</span>
      </div>
      <div style={{ fontSize: 10.5, color: "#87868a" }}>{vault.checkIn}</div>
      <div style={{ height: 4, borderRadius: 2, background: "#211A1B", overflow: "hidden" }}>
        <div style={{ width: vault.progress, height: "100%", background: "#22C55E", borderRadius: 2 }} />
      </div>
    </div>
  );
}

export function MobileActivityRow({ item }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "#180708",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={item.icon} size={13} style={{ color: "#ED2B47" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#F0EEEC" }}>{item.title}</div>
        <div style={{ fontSize: 10.5, color: item.tone === "up" ? "#3FC97A" : "#87868a", marginTop: 1 }}>{item.sub}</div>
      </div>
      <div style={{ fontSize: 9.5, color: "#77767a", whiteSpace: "nowrap" }}>{item.shortDate}</div>
    </div>
  );
}

const QUICK = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "#0A0A0A",
  border: "1px solid rgba(255,255,255,.07)",
  borderRadius: 12,
  padding: "13px 14px",
  color: "#F0EEEC",
  fontSize: 12.5,
  fontWeight: 600,
};

export default function MobileDashboardHome({ data, actions }) {
  return (
    <>
      {/* stat cards */}
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <div style={{ flex: 1, ...CARD, padding: 16, position: "relative" }}>
          <div style={{ fontSize: 11, color: "#9c9c9f" }}>Total Vault Value</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#F5F2EE", marginTop: 8 }}>{data.totalValue}</div>
          <div
            style={{ fontSize: 11, color: data.changeUp ? "#3FC97A" : "#FF6B7F", fontWeight: 700, marginTop: 6 }}
            title="Change over the last 30 days"
          >
            {data.changeText}
          </div>
          <Icon name="sparkle" size={14} style={{ position: "absolute", top: 14, right: 14, color: "#ED2B47" }} />
        </div>
        <div style={{ width: 110, ...CARD, padding: 16, position: "relative" }}>
          <div style={{ fontSize: 11, color: "#9c9c9f" }}>Active</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#F5F2EE", marginTop: 8 }}>{data.activeCount}</div>
          <Icon name="hex" size={14} style={{ position: "absolute", top: 14, right: 14, color: "#ED2B47" }} />
        </div>
      </div>

      {/* your vaults */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
        <div style={SECTION}>Your Vaults</div>
        <a
          href="#"
          onClick={(e) => (e.preventDefault(), actions.onViewAll())}
          style={{ fontSize: 12, color: "#ED2B47", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}
        >
          View all <Icon name="arrow-right" size={11} />
        </a>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
        {data.vaults.length === 0 ? (
          <div style={{ ...CARD, padding: 14, fontSize: 12, color: "#87868a" }}>
            No vaults yet. Tap Create Vault to make your first one.
          </div>
        ) : (
          data.vaults.map((v) => <MobileVaultCard key={v.address} vault={v} onOpen={actions.onOpenVault} />)
        )}
      </div>

      {/* quick actions */}
      <div style={{ ...SECTION, marginTop: 24, marginBottom: 12 }}>Quick Actions</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
        <button
          onClick={actions.onCreate}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "linear-gradient(135deg,#FF4D68,#DE1E3C)",
            borderRadius: 12,
            padding: "13px 14px",
            color: "#fff",
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <Icon name="plus-circle" size={16} /> Create Vault
        </button>
        <button onClick={actions.onDeposit} style={QUICK}>
          <Icon name="deposit" size={16} style={{ color: "#ED2B47" }} /> Deposit
        </button>
        <button onClick={actions.onBeneficiaries} style={QUICK}>
          <Icon name="users" size={16} style={{ color: "#ED2B47" }} /> Beneficiaries
        </button>
        <button onClick={actions.onActivity} style={QUICK}>
          <Icon name="clock" size={16} style={{ color: "#ED2B47" }} /> Activity
        </button>
      </div>

      {/* recent activity */}
      <div style={{ ...SECTION, marginTop: 24, marginBottom: 12 }}>Recent Activity</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {data.activity.length === 0 ? (
          <div style={{ fontSize: 12, color: "#87868a" }}>Nothing yet.</div>
        ) : (
          data.activity.map((item) => <MobileActivityRow key={item.key} item={item} />)
        )}
      </div>
    </>
  );
}
