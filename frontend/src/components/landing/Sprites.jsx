// Icon sprites, transcribed exactly from the LegatumArca design canvas.
// The desktop artboard uses the `i-*` set, the mobile artboard the `m-*` set
// (its hex is drawn a hair thinner: 1.5/1.2 stroke instead of 1.6/1.3).

export function Icon({ id, size, color, style }) {
  return (
    <svg width={size} height={size} style={{ color, ...style }} aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}

export function DesktopSprite() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
      <defs>
        <symbol id="i-hex" viewBox="0 0 24 24">
          <polygon points="12,2.5 20.5,7.25 20.5,16.75 12,21.5 3.5,16.75 3.5,7.25" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M12 2.5 L12 12 L20.5 7.25 M12 12 L3.5 7.25 M12 12 L12 21.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-shield" viewBox="0 0 24 24">
          <path d="M12 2.5 L19.5 5.5 V11.2 C19.5 16 16 19.8 12 21.5 C8 19.8 4.5 16 4.5 11.2 V5.5 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8.3 12 L10.8 14.5 L15.7 9.3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-coin" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8.8 8.8 L15.2 15.2 M15.2 8.8 L8.8 15.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-wallet" viewBox="0 0 24 24">
          <path d="M4 8a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="3" y="8" width="18" height="12" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="16.3" cy="14" r="1.3" fill="currentColor" stroke="none" />
        </symbol>
        <symbol id="i-users" viewBox="0 0 24 24">
          <circle cx="9.2" cy="8.3" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M3.3 20c0-3.4 2.6-6.1 5.9-6.1s5.9 2.7 5.9 6.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="17" cy="9" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M15.6 13.9c2.7.3 4.9 2.6 5.1 5.7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </symbol>
        <symbol id="i-clock" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 7.3 V12.3 L15.6 14.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-gear" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="12" y1="3" x2="12" y2="5.3" />
            <line x1="12" y1="18.7" x2="12" y2="21" />
            <line x1="3" y1="12" x2="5.3" y2="12" />
            <line x1="18.7" y1="12" x2="21" y2="12" />
            <line x1="5.6" y1="5.6" x2="7.2" y2="7.2" />
            <line x1="16.8" y1="16.8" x2="18.4" y2="18.4" />
            <line x1="18.4" y1="5.6" x2="16.8" y2="7.2" />
            <line x1="7.2" y1="16.8" x2="5.6" y2="18.4" />
          </g>
        </symbol>
        <symbol id="i-home" viewBox="0 0 24 24">
          <path d="M4 11.5 L12 4.3 L20 11.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 10.2 V19 a1 1 0 0 0 1 1 h4 v-5.2 h2 V20 h4 a1 1 0 0 0 1-1 V10.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-plus-circle" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 8.3 V15.7 M8.3 12 H15.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-deposit" viewBox="0 0 24 24">
          <path d="M12 3.5 V14.5 M8.2 11 L12 14.8 L15.8 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.5 15.5 V18.5 A2 2 0 0 0 6.5 20.5 H17.5 A2 2 0 0 0 19.5 18.5 V15.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-chevron-right" viewBox="0 0 24 24">
          <path d="M9 5.5 L16 12 L9 18.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-arrow-right" viewBox="0 0 24 24">
          <path d="M4 12 H19.5 M14 6.5 L19.5 12 L14 17.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-external" viewBox="0 0 24 24">
          <path d="M7 17 L17 7 M9.5 7 H17 V14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-sparkle" viewBox="0 0 24 24">
          <path d="M12 3 L13.4 9.8 L20 12 L13.4 14.2 L12 21 L10.6 14.2 L4 12 L10.6 9.8 Z" fill="currentColor" stroke="none" />
        </symbol>
        <symbol id="i-receive" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M12 7.8 V15 M8.6 11.6 L12 15 L15.4 11.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
        <symbol id="i-menu" viewBox="0 0 24 24">
          <path d="M4 6.5 H20 M4 12 H20 M4 17.5 H20" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </symbol>
        <symbol id="i-lock" viewBox="0 0 24 24">
          <rect x="5.5" y="10.5" width="13" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8.3 10.5 V7.8 A3.7 3.7 0 0 1 15.7 7.8 V10.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </symbol>
        <symbol id="i-chevron-down" viewBox="0 0 24 24">
          <path d="M5.5 9 L12 15.5 L18.5 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
      </defs>
    </svg>
  );
}

export function MobileSprite() {
  return (
    <svg style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }} aria-hidden="true">
      <defs>
        <symbol id="m-hex" viewBox="0 0 24 24">
          <polygon points="12,2.5 20.5,7.25 20.5,16.75 12,21.5 3.5,16.75 3.5,7.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 2.5 L12 12 L20.5 7.25 M12 12 L3.5 7.25 M12 12 L12 21.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        </symbol>
        <symbol id="m-arrow-right" viewBox="0 0 24 24">
          <path d="M4 12 H19.5 M14 6.5 L19.5 12 L14 17.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </symbol>
      </defs>
    </svg>
  );
}
