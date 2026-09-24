import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import DesktopBoard from "./landing/DesktopBoard.jsx";
import MobileBoard from "./landing/MobileBoard.jsx";
import "../Landing.css";

// Both artboards are fixed-size canvases (1536x1024 desktop, 390x844 mobile),
// exactly as drawn in the design. Rather than re-flow them — which would mean
// redrawing the design — each is rendered at its native size and scaled to the
// viewport width, so the composition stays pixel-proportional at every width.
const DESKTOP = { width: 1536, height: 1024, maxScale: Infinity };
// Capped so the phone canvas doesn't become a billboard on tablet widths.
const MOBILE = { width: 390, height: 844, maxScale: 1.15 };

const MOBILE_QUERY = "(max-width: 899px)";

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// Scales the artboard to the frame's width. Measured off the frame element
// rather than 100vw so the scrollbar's width doesn't push the canvas wide.
function useFitScale(board) {
  const frameRef = useRef(null);
  const [scale, setScale] = useState(() => Math.min(window.innerWidth / board.width, board.maxScale));

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const update = () => setScale(Math.min(frame.clientWidth / board.width, board.maxScale));
    update();

    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [board]);

  return [frameRef, scale];
}

export default function Landing({ onLaunch }) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const board = isMobile ? MOBILE : DESKTOP;
  const [frameRef, scale] = useFitScale(board);

  // The design's CTAs are anchors and buttons with fixed geometry, so they keep
  // their element types; only the handler differs.
  const onConnect = useCallback(
    (event) => {
      event?.preventDefault?.();
      onLaunch?.();
    },
    [onLaunch]
  );

  const Board = isMobile ? MobileBoard : DesktopBoard;

  return (
    <div className="landing" id="top">
      <div className="la-frame" ref={frameRef}>
        <div className="la-stage" style={{ width: board.width * scale, height: board.height * scale }}>
          <div className="la-board" style={{ width: board.width, height: board.height, transform: `scale(${scale})` }}>
            <Board onConnect={onConnect} />
          </div>
        </div>
      </div>
    </div>
  );
}
