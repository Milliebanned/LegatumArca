import heroBg from "../../assets/hero-bg.webp";
import { Icon, MobileSprite } from "./Sprites.jsx";

// The 390x844 mobile artboard from the LegatumArca design canvas.

export default function MobileBoard({ onConnect }) {
  return (
    <div
      style={{
        width: 390,
        height: 844,
        position: "relative",
        overflow: "hidden",
        backgroundImage: `url(${heroBg})`,
        backgroundSize: "auto 620px",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center bottom",
        backgroundColor: "#050302",
        fontFamily: "'Inter',sans-serif",
        color: "#F2EFEC",
      }}
    >
      <MobileSprite />

      {/* subtle top-to-mid darken so the beams don't fight the logo/headline */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg,#050302 0%,#050302 30%,rgba(5,3,2,0) 55%)",
        }}
      />

      {/* Top spacer where the mockup draws the phone's status bar (clock, signal,
          battery). That's device chrome, not page content, so it isn't
          rendered; the space is kept so the rest of the composition stays put. */}
      <div style={{ height: 37 }} />

      {/* logo + wordmark */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 76,
        }}
      >
        <Icon id="m-hex" size={62} color="#ED2B47" />
        <div style={{ marginTop: 18, fontSize: 15, fontWeight: 700, letterSpacing: "3px" }}>
          <span style={{ color: "#F5F2EE" }}>LEGATUM</span>
          <span style={{ color: "#ED2B47" }}>ARCA</span>
        </div>
      </div>

      {/* headline */}
      <div style={{ position: "relative", padding: "0 28px", marginTop: 40 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "'Playfair Display',Georgia,serif",
            fontWeight: 700,
            fontSize: 34,
            lineHeight: 1.14,
            color: "#F5F2EE",
          }}
        >
          Your wealth.
          <br />
          Their tomorrow.
          <br />
          <span style={{ fontStyle: "italic", fontWeight: 800, color: "#ED2B47" }}>Secured.</span>
        </h1>
      </div>

      {/* CTA */}
      <div style={{ position: "absolute", left: 28, right: 28, bottom: 56 }}>
        <button
          type="button"
          onClick={onConnect}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: "linear-gradient(135deg,#FF4D68,#DE1E3C)",
            color: "#fff",
            padding: "16px 24px",
            borderRadius: 999,
            fontWeight: 600,
            fontSize: 15,
            boxShadow: "0 10px 24px rgba(222,30,60,.35)",
          }}
        >
          Get Started
          <Icon id="m-arrow-right" size={16} />
        </button>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <a href="#" onClick={onConnect} style={{ fontSize: 13.5, fontWeight: 600, color: "#ED2B47" }}>
            Sign In
          </a>
        </div>
      </div>
    </div>
  );
}
