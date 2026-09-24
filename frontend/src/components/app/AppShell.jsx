import { useLayoutEffect, useRef, useState } from "react";
import { DashSprite, Icon } from "./Sprites.jsx";
import { useDismiss } from "./useDismiss.js";
import "../../Dashboard.css";

// The LegatumArca design canvas draws the dashboard twice: a 1440x900 desktop
// artboard and a 390x844 phone artboard. Like the landing page, each is
// rendered at its native size and scaled as one piece, so every screen keeps
// the design's exact composition.
export const BOARD = { width: 1440, height: 900 };
export const MOBILE_BOARD = { width: 390, height: 844, maxScale: 1.15 };
export const MOBILE_QUERY = "(max-width: 899px)";

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useLayoutEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

// Desktop: the whole 1440x900 board fits inside the frame. Mobile: the board
// is scaled to the frame's width and made as tall as the screen, so the
// design's bottom tab bar sits at the bottom of the phone rather than
// wherever 844px happens to land.
function useBoardFit(mobile) {
  const frameRef = useRef(null);
  const [fit, setFit] = useState({ scale: 1, height: mobile ? MOBILE_BOARD.height : BOARD.height });

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const update = () => {
      const w = frame.clientWidth;
      const h = frame.clientHeight;
      if (mobile) {
        const scale = Math.min(w / MOBILE_BOARD.width, MOBILE_BOARD.maxScale);
        setFit({ scale, height: h / scale });
      } else {
        setFit({ scale: Math.min(w / BOARD.width, h / BOARD.height), height: BOARD.height });
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [mobile]);

  return [frameRef, fit];
}

// Fills whatever space the page gives it and centres the scaled board.
export function ScaledBoard({ banner, mobile, children }) {
  const [frameRef, { scale, height }] = useBoardFit(mobile);
  const width = mobile ? MOBILE_BOARD.width : BOARD.width;
  return (
    <div className={mobile ? "db-viewport db-viewport-mobile" : "db-viewport"}>
      {banner}
      <div className="db-frame" ref={frameRef}>
        <div className="db-stage" style={{ width: width * scale, height: height * scale }}>
          <div
            className={mobile ? "db-board db-board-mobile" : "db-board"}
            style={{ width, height, transform: `scale(${scale})` }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "home" },
  { id: "vaults", label: "Vaults", icon: "wallet" },
  { id: "beneficiaries", label: "Beneficiaries", icon: "users" },
  { id: "activity", label: "Activity", icon: "clock" },
  { id: "settings", label: "Settings", icon: "gear" },
];

const NAV_ACTIVE = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "13px 16px",
  borderRadius: 12,
  background: "rgba(237,43,71,.13)",
  color: "#ED2B47",
  fontSize: 14.5,
  fontWeight: 700,
};

const NAV_IDLE = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "13px 16px",
  borderRadius: 12,
  color: "#9c9c9f",
  fontSize: 14.5,
  fontWeight: 500,
};

function Sidebar({ page, onNavigate }) {
  const go = (id) => (event) => {
    event.preventDefault();
    onNavigate(id);
  };

  return (
    <div
      style={{
        width: 264,
        flexShrink: 0,
        height: 900,
        borderRight: "1px solid rgba(255,255,255,.07)",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        background: "#020202",
      }}
    >
      <a href="#" onClick={go("dashboard")} style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon name="hex" size={28} style={{ color: "#ED2B47", flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "1.8px" }}>
          <span style={{ color: "#F5F2EE" }}>LEGATUM</span>
          <span style={{ color: "#ED2B47" }}>ARCA</span>
        </span>
      </a>

      <nav style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 40 }}>
        {NAV.map((item) => (
          <a
            key={item.id}
            href="#"
            onClick={go(item.id)}
            aria-current={page === item.id ? "page" : undefined}
            style={page === item.id ? NAV_ACTIVE : NAV_IDLE}
          >
            <Icon name={item.icon} size={18} /> {item.label}
          </a>
        ))}
      </nav>

      <div
        style={{
          marginTop: "auto",
          position: "relative",
          background: "linear-gradient(160deg,#33060D,#0A0404)",
          border: "1px solid rgba(237,43,71,.25)",
          borderRadius: 16,
          padding: 20,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontFamily: "'Playfair Display',Georgia,serif",
            fontStyle: "italic",
            fontSize: 14.5,
            lineHeight: 1.45,
            color: "#E8E6E6",
            maxWidth: 130,
          }}
        >
          Your legacy is a process, not a moment.
        </div>
        <Icon name="hex" size={30} style={{ position: "absolute", right: 12, bottom: 12, color: "#ED2B47", opacity: 0.85 }} />
        <Icon name="sparkle" size={15} style={{ position: "absolute", right: 10, top: 12, color: "#FF4D68" }} />
      </div>
    </div>
  );
}

const ROUND_BUTTON = {
  width: 38,
  height: 38,
  borderRadius: "50%",
  background: "#100C0C",
  border: "1px solid rgba(255,255,255,.09)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#9c9c9f",
};

// The design's top row: greeting (or page title) on the left; search,
// notifications and the wallet pill on the right.
function TopRow({ kicker, title, subtitle, walletLabel, attention, onSearch, onNotifications, walletMenu }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useDismiss(menuOpen, () => setMenuOpen(false));

  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 14.5, color: "#9c9c9f" }}>{kicker}</div>
        <div
          style={{
            fontFamily: "'Playfair Display',Georgia,serif",
            fontWeight: 700,
            fontSize: 36,
            color: "#F5F2EE",
            marginTop: 2,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 14, color: "#8b8b8f", marginTop: 6 }}>{subtitle}</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button aria-label="Search" onClick={onSearch} style={ROUND_BUTTON}>
          <Icon name="search" size={16} />
        </button>
        <button aria-label="Notifications" onClick={onNotifications} style={{ ...ROUND_BUTTON, position: "relative" }}>
          <Icon name="bell" size={16} />
          {attention && (
            <span
              style={{
                position: "absolute",
                top: 9,
                right: 10,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#ED2B47",
              }}
            />
          )}
        </button>
        {/* A flex wrapper so the pill keeps the geometry it has as a direct
            flex child in the design; it only anchors the dropdown. */}
        <div ref={menuRef} style={{ position: "relative", display: "flex" }}>
          <button
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#100C0C",
              border: "1px solid rgba(255,255,255,.09)",
              borderRadius: 999,
              padding: "7px 14px 7px 7px",
            }}
          >
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#ED2B47" }} />
            <span style={{ fontSize: 13, color: "#D8D6D6" }}>{walletLabel}</span>
            <Icon name="chevron-down" size={12} style={{ color: "#8b8b8f" }} />
          </button>
          {menuOpen && walletMenu && (
            <div className="db-menu" role="menu" onClick={() => setMenuOpen(false)}>
              {walletMenu}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sidebar + main column. `children` is the main column's content row.
export function AppBoard({ page, onNavigate, top, overlay, children }) {
  return (
    <>
      <DashSprite />
      <div
        style={{
          width: 1440,
          height: 900,
          position: "relative",
          overflow: "hidden",
          background: "#060606",
          fontFamily: "'Inter',sans-serif",
          color: "#F2EFEC",
          display: "flex",
        }}
      >
        <Sidebar page={page} onNavigate={onNavigate} />

        <div
          style={{
            flex: 1,
            padding: "36px 44px",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: 26,
          }}
        >
          {/* decorative diamond */}
          <div style={{ position: "absolute", top: -20, right: 260, width: 220, height: 210, pointerEvents: "none" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle at 50% 45%,rgba(237,43,71,.45),transparent 65%)",
                filter: "blur(2px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 58,
                top: 36,
                width: 104,
                height: 104,
                border: "1.5px solid rgba(237,43,71,.7)",
                borderRadius: 16,
                transform: "rotate(45deg)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 82,
                top: 60,
                width: 56,
                height: 56,
                background: "linear-gradient(145deg,#FF6B7F,#C81B38)",
                borderRadius: 10,
                transform: "rotate(45deg)",
                boxShadow: "0 0 30px rgba(237,43,71,.6)",
              }}
            />
          </div>

          <TopRow {...top} />

          {children}
        </div>

        {overlay}
      </div>
    </>
  );
}
