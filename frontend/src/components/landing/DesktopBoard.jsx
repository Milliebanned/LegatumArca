import heroBg from "../../assets/hero-bg.webp";
import { DesktopSprite, Icon } from "./Sprites.jsx";

// The 1536x1024 desktop artboard from the LegatumArca design canvas,
// transcribed element for element. Sizes and colours are inline for the same
// reason they are in the source: every value is positional, not a token.

const NAV_LINKS = ["Vaults", "Features", "About", "Docs"];

const SIDEBAR_LINKS = [
  { icon: "i-wallet", label: "Vaults" },
  { icon: "i-users", label: "Beneficiaries" },
  { icon: "i-clock", label: "Activity" },
  { icon: "i-gear", label: "Settings" },
];

const VAULTS = [
  { name: "Family Legacy Vault", amount: "$8,750.00", checkIn: "Next check-in in 182 days", progress: "50%" },
  { name: "Personal Growth Vault", amount: "$3,700.00", checkIn: "Next check-in in 96 days", progress: "26%" },
];

const QUICK_ACTIONS = [
  { icon: "i-deposit", label: "Deposit Funds" },
  { icon: "i-users", label: "Add Beneficiaries" },
  { icon: "i-clock", label: "View Activity" },
];

const ACTIVITY = [
  { icon: "i-receive", title: "Deposit received", sub: "+$2,000 USDC", subColor: "#3FC97A", date: "Sep 14, 2026" },
  { icon: "i-users", title: "Beneficiary added", sub: "2 addresses", subColor: "#87868a", date: "Sep 12, 2026" },
  { icon: "i-hex", title: "Vault created", sub: "Family Legacy Vault", subColor: "#87868a", date: "Sep 10, 2026" },
];

const STEPS = [
  { icon: "i-hex", num: "1.", title: "Create Your Vault", body: "Set up your vault and choose who you trust." },
  { icon: "i-wallet", num: "2.", title: "Deposit Assets", body: "Add your crypto and digital assets to your vault." },
  { icon: "i-clock", num: "3.", title: "Set Conditions", body: "Define the inactivity period and beneficiaries." },
  { icon: "i-users", num: "4.", title: "Legacy Continues", body: "If you're inactive, your assets are released to your loved ones." },
];

const cardStyle = {
  background: "#0A0808",
  border: "1px solid rgba(255,255,255,.07)",
  borderRadius: 14,
};

function Wordmark({ fontSize, letterSpacing }) {
  return (
    <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize, letterSpacing }}>
      <span style={{ color: "#F5F2EE" }}>LEGATUM</span>
      <span style={{ color: "#ED2B47" }}>ARCA</span>
    </span>
  );
}

export default function DesktopBoard({ onConnect }) {
  return (
    <div
      style={{
        width: 1536,
        height: 1024,
        position: "relative",
        overflow: "hidden",
        backgroundImage: `url(${heroBg})`,
        backgroundSize: "1536px 1024px",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "top left",
        backgroundColor: "#050302",
        fontFamily: "'Inter',sans-serif",
        color: "#F2EFEC",
      }}
    >
      <DesktopSprite />

      {/* ============ HEADER ============ */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1536,
          height: 96,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 96px",
        }}
      >
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon id="i-hex" size={34} color="#ED2B47" style={{ flexShrink: 0 }} />
          <Wordmark fontSize={19} letterSpacing="2.5px" />
        </a>

        <nav style={{ display: "flex", alignItems: "center", gap: 42 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
            <a href="#top" style={{ fontSize: 14.5, color: "#F5F2EE", fontWeight: 500 }}>
              Home
            </a>
            <div style={{ width: 26, height: 2, background: "#ED2B47", borderRadius: 2 }} />
          </div>
          {NAV_LINKS.map((label) => (
            <a key={label} href="#top" style={{ fontSize: 14.5, color: "#9c9c9f", fontWeight: 500 }}>
              {label}
            </a>
          ))}
        </nav>

        <a
          href="#"
          onClick={onConnect}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "linear-gradient(135deg,#FF4D68,#DE1E3C)",
            color: "#fff",
            padding: "13px 22px",
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 14,
            boxShadow: "0 8px 20px rgba(222,30,60,.35)",
          }}
        >
          Launch App
          <Icon id="i-external" size={14} />
        </a>
      </div>

      {/* ============ HERO ============ */}
      <div
        style={{
          position: "absolute",
          top: 96,
          left: 0,
          width: 1536,
          height: 614,
          display: "flex",
          alignItems: "flex-start",
          padding: "0 96px",
        }}
      >
        {/* hero left copy */}
        <div style={{ width: 420, flexShrink: 0, paddingTop: 64, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 11, letterSpacing: "4px", color: "#8b8b8f", fontWeight: 600 }}>
            {"INHERITANCE  /  SECURITY  /  FOREVER"}
          </div>

          <h1
            style={{
              margin: "22px 0 0",
              fontFamily: "'Playfair Display',Georgia,serif",
              fontWeight: 700,
              fontSize: 52,
              lineHeight: 1.1,
              color: "#F5F2EE",
            }}
          >
            Your wealth.
            <br />
            Their tomorrow.
            <br />
            <span style={{ fontStyle: "italic", fontWeight: 800, color: "#ED2B47" }}>Secured.</span>
          </h1>

          <p
            style={{
              margin: "26px 0 0",
              fontFamily: "'Lora',Georgia,serif",
              fontSize: 16.5,
              lineHeight: 1.65,
              color: "#B9B7B9",
              maxWidth: 380,
            }}
          >
            LegatumArca is a secure onchain vault that keeps your digital assets safe and ensures they reach your loved
            ones, even when you're no longer here.
          </p>

          <button
            type="button"
            onClick={onConnect}
            style={{
              marginTop: 32,
              display: "inline-flex",
              width: "fit-content",
              alignItems: "center",
              gap: 10,
              background: "linear-gradient(135deg,#FF4D68,#DE1E3C)",
              color: "#fff",
              padding: "16px 28px",
              borderRadius: 999,
              fontWeight: 600,
              fontSize: 15,
              boxShadow: "0 10px 24px rgba(222,30,60,.35)",
            }}
          >
            Create Your Vault
            <Icon id="i-arrow-right" size={16} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 52 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon id="i-shield" size={20} color="#D8D6D6" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#F0EEEC" }}>Onchain Security</div>
                <div style={{ fontSize: 11.5, color: "#87868a", marginTop: 2 }}>Powered by smart contracts</div>
              </div>
            </div>
            <div style={{ width: 1, height: 32, background: "rgba(255,255,255,.15)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon id="i-coin" size={20} color="#D8D6D6" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#F0EEEC" }}>USDC &amp; More</div>
                <div style={{ fontSize: 11.5, color: "#87868a", marginTop: 2 }}>Support for major assets</div>
              </div>
            </div>
          </div>
        </div>

        {/* hero right: app mockups — decorative, so kept out of the tab order */}
        <div style={{ position: "relative", flex: 1, height: 614 }} aria-hidden="true">
          {/* browser window */}
          <div
            style={{
              position: "absolute",
              top: 28,
              left: 0,
              width: 758,
              height: 548,
              background: "#0A0708",
              border: "1px solid rgba(255,255,255,.09)",
              borderRadius: 18,
              boxShadow: "0 40px 90px rgba(0,0,0,.55)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* title bar */}
            <div
              style={{
                height: 54,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                padding: "0 20px",
                borderBottom: "1px solid rgba(255,255,255,.06)",
              }}
            >
              <div style={{ display: "flex", gap: 8, width: 150 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF5F57" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFBD2E" }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28C840" }} />
              </div>
              <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#141010",
                    border: "1px solid rgba(255,255,255,.07)",
                    borderRadius: 8,
                    padding: "8px 20px",
                    fontSize: 12.5,
                    color: "#B7B5B6",
                  }}
                >
                  <Icon id="i-lock" size={12} />
                  app.legatumarca.com
                </div>
              </div>
              <div style={{ width: 150 }} />
            </div>

            {/* body */}
            <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
              {/* sidebar */}
              <div
                style={{
                  width: 168,
                  flexShrink: 0,
                  borderRight: "1px solid rgba(255,255,255,.06)",
                  padding: "20px 16px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon id="i-hex" size={20} color="#ED2B47" style={{ flexShrink: 0 }} />
                  <Wordmark fontSize={11.5} letterSpacing="1.3px" />
                </div>

                <nav style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 26 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(237,43,71,.13)",
                      color: "#ED2B47",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <Icon id="i-home" size={16} /> Dashboard
                  </div>
                  {SIDEBAR_LINKS.map((link) => (
                    <div
                      key={link.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 10,
                        color: "#9c9c9f",
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      <Icon id={link.icon} size={16} /> {link.label}
                    </div>
                  ))}
                </nav>

                <div
                  style={{
                    marginTop: "auto",
                    position: "relative",
                    background: "linear-gradient(160deg,#33060D,#0A0404)",
                    border: "1px solid rgba(237,43,71,.25)",
                    borderRadius: 14,
                    padding: 16,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Lora',Georgia,serif",
                      fontStyle: "italic",
                      fontSize: 12.5,
                      lineHeight: 1.45,
                      color: "#E8E6E6",
                      maxWidth: 110,
                    }}
                  >
                    Your legacy is a process, not a moment.
                  </div>
                  <Icon id="i-hex" size={26} color="#ED2B47" style={{ position: "absolute", right: 10, bottom: 10, opacity: 0.85 }} />
                  <Icon id="i-sparkle" size={13} color="#FF4D68" style={{ position: "absolute", right: 8, top: 10 }} />
                </div>
              </div>

              {/* main */}
              <div
                style={{
                  flex: 1,
                  padding: "22px 22px",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                }}
              >
                {/* decorative cube */}
                <div style={{ position: "absolute", top: -8, right: 150, width: 150, height: 140, pointerEvents: "none" }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "radial-gradient(circle at 58% 48%,rgba(237,43,71,.4),transparent 62%)",
                      filter: "blur(4px)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 38,
                      top: 22,
                      width: 66,
                      height: 66,
                      background: "linear-gradient(135deg,#3a0a12,#150407)",
                      border: "1px solid rgba(237,43,71,.45)",
                      borderRadius: 6,
                      transform: "rotate(45deg)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 54,
                      top: 42,
                      width: 32,
                      height: 32,
                      background: "linear-gradient(135deg,#ED2B47,#7A0E1F)",
                      borderRadius: 4,
                      transform: "rotate(45deg)",
                    }}
                  />
                </div>

                {/* greeting row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#9c9c9f" }}>Good morning,</div>
                    <div
                      style={{
                        fontFamily: "'Playfair Display',Georgia,serif",
                        fontWeight: 700,
                        fontSize: 29,
                        color: "#F5F2EE",
                        marginTop: 2,
                      }}
                    >
                      Sodiq
                    </div>
                    <div style={{ fontSize: 12.5, color: "#8b8b8f", marginTop: 4 }}>Your legacy is protected.</div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#100C0C",
                      border: "1px solid rgba(255,255,255,.09)",
                      borderRadius: 999,
                      padding: "6px 12px 6px 6px",
                    }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#ED2B47,#6B0F1E)" }} />
                    <span style={{ fontSize: 12, color: "#D8D6D6" }}>0x3f...7aE2</span>
                    <Icon id="i-chevron-down" size={11} color="#8b8b8f" />
                  </div>
                </div>

                {/* content row: left col + right col */}
                <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
                  {/* left col */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ ...cardStyle, width: 188, padding: 16, position: "relative" }}>
                        <div style={{ fontSize: 11.5, color: "#9c9c9f" }}>Total Vault Value</div>
                        <div style={{ fontSize: 23, fontWeight: 700, color: "#F5F2EE", marginTop: 8 }}>$12,450.00</div>
                        <div style={{ fontSize: 12, color: "#3FC97A", fontWeight: 600, marginTop: 6 }}>▲ 2.4%</div>
                        <Icon id="i-sparkle" size={16} color="#ED2B47" style={{ position: "absolute", top: 14, right: 14 }} />
                      </div>
                      <div style={{ ...cardStyle, width: 135, padding: 16, position: "relative" }}>
                        <div style={{ fontSize: 11.5, color: "#9c9c9f" }}>Active Vaults</div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: "#F5F2EE", marginTop: 8 }}>2</div>
                        <Icon id="i-hex" size={16} color="#ED2B47" style={{ position: "absolute", top: 14, right: 14 }} />
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#F5F2EE" }}>Your Vaults</div>
                      <span style={{ fontSize: 12, color: "#ED2B47", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        View all <Icon id="i-arrow-right" size={12} />
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {VAULTS.map((vault) => (
                        <div key={vault.name} style={{ ...cardStyle, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 9,
                                  background: "linear-gradient(135deg,#ED2B47,#4A0A16)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <Icon id="i-hex" size={16} color="#fff" />
                              </div>
                              <span style={{ fontSize: 13.5, fontWeight: 600, color: "#F5F2EE" }}>{vault.name}</span>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: "#3FC97A",
                                  background: "rgba(63,201,122,.15)",
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                }}
                              >
                                Active
                              </span>
                            </div>
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: 10.5,
                                color: "#B7B5B6",
                                background: "#100C0C",
                                border: "1px solid rgba(255,255,255,.08)",
                                borderRadius: 999,
                                padding: "4px 10px",
                                flexShrink: 0,
                              }}
                            >
                              USDC
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 19, fontWeight: 700, color: "#F5F2EE" }}>{vault.amount}</span>
                            <Icon id="i-chevron-right" size={15} color="#6b6b6e" />
                          </div>
                          <div style={{ fontSize: 11, color: "#87868a" }}>{vault.checkIn}</div>
                          <div style={{ height: 4, borderRadius: 2, background: "#211A1B", overflow: "hidden" }}>
                            <div style={{ width: vault.progress, height: "100%", background: "#3FC97A", borderRadius: 2 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* right col */}
                  <div style={{ width: 190, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ ...cardStyle, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F5F2EE", marginBottom: 2 }}>Quick Actions</div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          background: "linear-gradient(135deg,#FF4D68,#DE1E3C)",
                          borderRadius: 10,
                          padding: "10px 12px",
                          color: "#fff",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        <Icon id="i-plus-circle" size={15} /> Create New Vault
                      </div>
                      {QUICK_ACTIONS.map((action) => (
                        <div
                          key={action.label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            background: "#100C0C",
                            border: "1px solid rgba(255,255,255,.07)",
                            borderRadius: 10,
                            padding: "10px 12px",
                            color: "#F0EEEC",
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          <Icon id={action.icon} size={15} color="#ED2B47" /> {action.label}
                        </div>
                      ))}
                    </div>

                    <div style={{ ...cardStyle, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "#F5F2EE" }}>Recent Activity</div>

                      {ACTIVITY.map((item) => (
                        <div key={item.title} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              background: "#180708",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon id={item.icon} size={13} color="#ED2B47" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#F0EEEC" }}>{item.title}</div>
                            <div style={{ fontSize: 10, color: item.subColor, marginTop: 1 }}>{item.sub}</div>
                          </div>
                          <div style={{ fontSize: 9.5, color: "#77767a", whiteSpace: "nowrap" }}>{item.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* phone mockup */}
          <div
            style={{
              position: "absolute",
              top: 64,
              right: -96,
              width: 212,
              height: 452,
              background: "#000",
              border: "9px solid #0d0d0d",
              borderRadius: 38,
              boxShadow: "0 30px 70px rgba(0,0,0,.6)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                width: 66,
                height: 16,
                background: "#000",
                borderRadius: 9,
                zIndex: 2,
              }}
            />

            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                background: "#050303",
                padding: "28px 14px 12px",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 10,
                  color: "#F5F2EE",
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                <span>9:41</span>
                <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <svg width="12" height="9" viewBox="0 0 16 12">
                    <rect x="0" y="7" width="3" height="5" rx="0.5" fill="#F5F2EE" />
                    <rect x="4.5" y="5" width="3" height="7" rx="0.5" fill="#F5F2EE" />
                    <rect x="9" y="2.5" width="3" height="9.5" rx="0.5" fill="#F5F2EE" />
                    <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="#F5F2EE" />
                  </svg>
                  <svg width="15" height="10" viewBox="0 0 20 14">
                    <path d="M1 5.5C5 1.5 15 1.5 19 5.5M4 8.5C6.5 6 13.5 6 16 8.5M7.5 11.2C8.8 10 11.2 10 12.5 11.2" fill="none" stroke="#F5F2EE" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <svg width="20" height="10" viewBox="0 0 26 13">
                    <rect x="0.5" y="0.5" width="21" height="12" rx="2.5" fill="none" stroke="#F5F2EE" />
                    <rect x="2" y="2" width="18" height="9" rx="1.3" fill="#F5F2EE" />
                    <rect x="22.5" y="4" width="2" height="5" rx="1" fill="#F5F2EE" />
                  </svg>
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon id="i-hex" size={15} color="#ED2B47" />
                  <Wordmark fontSize={9} letterSpacing="1px" />
                </div>
                {/* The design wraps this glyph in a button, whose inherited
                    16px line box makes the row 20px tall — keep a wrapper so
                    the rows below it don't ride up 5px. */}
                <span style={{ color: "#9c9c9f" }}>
                  <Icon id="i-menu" size={15} />
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#F5F2EE" }}>Your Vaults</span>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: "1px solid #ED2B47",
                    color: "#ED2B47",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon id="i-plus-circle" size={12} />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {VAULTS.map((vault) => (
                  <div
                    key={vault.name}
                    style={{ background: "#0A0505", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, padding: 11 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 7,
                          background: "linear-gradient(135deg,#ED2B47,#4A0A16)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon id="i-hex" size={12} color="#fff" />
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: "#F5F2EE", flex: 1 }}>{vault.name}</span>
                      <span
                        style={{
                          fontSize: 8.5,
                          fontWeight: 700,
                          color: "#3FC97A",
                          background: "rgba(63,201,122,.15)",
                          padding: "2px 6px",
                          borderRadius: 999,
                        }}
                      >
                        Active
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 9 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#F5F2EE" }}>{vault.amount}</span>
                      <span style={{ fontSize: 9.5, color: "#87868a" }}>USDC</span>
                    </div>
                    <div style={{ fontSize: 8.5, color: "#87868a", marginTop: 5 }}>{vault.checkIn}</div>
                    <div style={{ height: 3, borderRadius: 2, background: "#211A1B", overflow: "hidden", marginTop: 5 }}>
                      <div style={{ width: vault.progress, height: "100%", background: "#ED2B47", borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: "#F5F2EE", margin: "14px 0 8px" }}>Quick Actions</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
                {[
                  { icon: "i-plus-circle", label: "Deposit" },
                  { icon: "i-users", label: "Beneficiaries" },
                  { icon: "i-hex", label: "New Vault" },
                  { icon: "i-clock", label: "Activity" },
                ].map((action) => (
                  <div
                    key={action.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#0A0505",
                      border: "1px solid rgba(255,255,255,.06)",
                      borderRadius: 10,
                      padding: "8px 9px",
                    }}
                  >
                    <Icon id={action.icon} size={12} color="#ED2B47" />
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: "#ED2B47" }}>{action.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1 }} />

              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 10 }}>
                {[
                  { icon: "i-home", label: "Home", active: true },
                  { icon: "i-wallet", label: "Vaults", active: false },
                  { icon: "i-clock", label: "Activity", active: false },
                  { icon: "i-gear", label: "Settings", active: false },
                ].map((tab) => (
                  <div key={tab.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <Icon id={tab.icon} size={15} color={tab.active ? "#ED2B47" : "#8b8b8f"} />
                    <span
                      style={{
                        fontSize: 8.5,
                        fontWeight: tab.active ? 700 : undefined,
                        color: tab.active ? "#ED2B47" : "#8b8b8f",
                      }}
                    >
                      {tab.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============ HOW IT WORKS ============ */}
      <div
        style={{
          position: "absolute",
          top: 710,
          left: 0,
          width: 1536,
          height: 314,
          padding: "48px 96px 36px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 56 }}>
          <div style={{ width: 360, flexShrink: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: "3.5px", color: "#9c9c9f", fontWeight: 600 }}>HOW IT WORKS</div>
            <h2
              style={{
                margin: "16px 0 0",
                fontFamily: "'Playfair Display',Georgia,serif",
                fontWeight: 700,
                fontSize: 38,
                lineHeight: 1.18,
                color: "#F5F2EE",
              }}
            >
              Simple steps.
              <br />
              <span style={{ fontStyle: "italic", fontWeight: 800, color: "#ED2B47" }}>Lasting impact.</span>
            </h2>
          </div>

          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(255,255,255,.14)", marginTop: 8 }} />

          <div style={{ flex: 1, display: "flex", justifyContent: "space-between", gap: 24, paddingTop: 2 }}>
            {STEPS.map((step) => (
              <div key={step.title} style={{ width: 210 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "rgba(237,43,71,.1)",
                    border: "1px solid rgba(237,43,71,.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon id={step.icon} size={20} color="#ED2B47" />
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 16 }}>
                  <span style={{ fontSize: 13, color: "#9c9c9f", fontWeight: 600 }}>{step.num}</span>
                  <span style={{ fontSize: 14.5, fontWeight: 700, color: "#F5F2EE" }}>{step.title}</span>
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "#8b8b8f" }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, width: "100%", maxWidth: 520 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.15)" }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "3px", color: "#ED2B47", whiteSpace: "nowrap" }}>
              LEGATUMARCA
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,.15)" }} />
          </div>
          <div style={{ fontSize: 10.5, letterSpacing: "2px", color: "#77767a" }}>BUILT FOR TODAY. DESIGNED FOR TOMORROW.</div>
        </div>
      </div>
    </div>
  );
}
