import { useState } from "react";
import { DashSprite, Icon } from "./Sprites.jsx";
import { useDismiss } from "./useDismiss.js";

// The 390x844 "Dashboard (mobile)" artboard from the LegatumArca design
// canvas (DashboardMobile.dc.html): the scrolling column with header and
// greeting, and the bottom tab bar. The tab bar adds a Beneficiaries tab the
// artboard doesn't draw, in the desktop sidebar's order. The mobile design's sprite is the desktop
// one under other ids, so DashSprite serves both.

export const MOBILE_TABS = [
  { id: "dashboard", label: "Home", icon: "home" },
  { id: "vaults", label: "Vaults", icon: "wallet" },
  { id: "beneficiaries", label: "Beneficiaries", icon: "users" },
  { id: "activity", label: "Activity", icon: "clock" },
  { id: "settings", label: "Settings", icon: "gear" },
];

function Header({ attention, onNotifications, walletMenu }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useDismiss(menuOpen, () => setMenuOpen(false));

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <Icon name="hex" size={20} style={{ color: "#ED2B47" }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px" }}>
          <span style={{ color: "#F5F2EE" }}>LEGATUM</span>
          <span style={{ color: "#ED2B47" }}>ARCA</span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          aria-label="Notifications"
          onClick={onNotifications}
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#100C0C",
            border: "1px solid rgba(255,255,255,.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9c9c9f",
            position: "relative",
          }}
        >
          <Icon name="bell" size={14} />
          {attention && (
            <span
              style={{
                position: "absolute",
                top: 7,
                right: 8,
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#ED2B47",
              }}
            />
          )}
        </button>
        {/* The design's avatar circle; here it opens the wallet menu. */}
        <div ref={menuRef} style={{ position: "relative", display: "flex" }}>
          <button
            aria-label="Wallet"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            style={{ width: 32, height: 32, borderRadius: "50%", background: "#ED2B47" }}
          />
          {menuOpen && (
            <div className="db-menu" role="menu" onClick={() => setMenuOpen(false)}>
              {walletMenu}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Greeting({ kicker, title, subtitle }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 13, color: "#9c9c9f" }}>{kicker}</div>
      <div
        style={{
          fontFamily: "'Playfair Display',Georgia,serif",
          fontWeight: 700,
          fontSize: 26,
          color: "#F5F2EE",
          marginTop: 2,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12.5, color: "#8b8b8f", marginTop: 4 }}>{subtitle}</div>
    </div>
  );
}

function TabBar({ tab, onNavigate }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 66,
        background: "#020202",
        borderTop: "1px solid rgba(255,255,255,.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        paddingBottom: 6,
      }}
    >
      {MOBILE_TABS.map((t) => {
        const active = t.id === tab;
        const color = active ? "#ED2B47" : "#8b8b8f";
        return (
          <button
            key={t.id}
            onClick={() => onNavigate(t.id)}
            aria-current={active ? "page" : undefined}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}
          >
            <Icon name={t.icon} size={18} style={{ color }} />
            <span style={active ? { fontSize: 10, fontWeight: 700, color } : { fontSize: 10, color }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// `children` is everything below the greeting.
export function MobileAppBoard({ tab, onNavigate, top, overlay, children }) {
  return (
    <>
      <DashSprite />
      <div
        style={{
          width: 390,
          height: "100%",
          position: "relative",
          overflow: "hidden",
          background: "#060606",
          fontFamily: "'Inter',sans-serif",
          color: "#F2EFEC",
        }}
      >
        {/* scrollable content */}
        <div
          className="dbm-scroll"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 66,
            overflowY: "auto",
            padding: "18px 20px 20px",
          }}
        >
          {/* The artboard draws a phone status bar (clock, signal, battery)
              here. That's device chrome, not page content, so only the space
              it takes is kept. */}
          <div style={{ height: 16 }} />

          <Header
            attention={top.attention}
            onNotifications={top.onNotifications}
            walletMenu={top.walletMenu}
          />
          <Greeting kicker={top.kicker} title={top.title} subtitle={top.subtitle} />

          {children}
        </div>

        <TabBar tab={tab} onNavigate={onNavigate} />

        {overlay}
      </div>
    </>
  );
}
