import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';

export interface ScribbleLowerThirdProps {
  name: string;
  title?: string;
  scribbleStyle?: 'underline' | 'circle' | 'bracket';
  primaryColor?: string;
  textColor?: string;
}

export const ScribbleLowerThird: React.FC<ScribbleLowerThirdProps> = ({
  name,
  title = '',
  scribbleStyle = 'underline',
  primaryColor = '#D4AF37',
  textColor = '#ffffff',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // ── Enter / Exit (same overdamped spring as DocLowerThird) ──

  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const exitProgress = spring({
    frame: Math.max(0, frame - (durationInFrames - Math.round(fps * 0.8))),
    fps,
    config: { damping: 200 },
  });

  const progress = frame < durationInFrames - Math.round(fps * 0.8)
    ? enterProgress
    : 1 - exitProgress;

  // ── Scribble draw-on animation ──

  const scribbleDelay = Math.round(fps * 0.35);
  const drawProgress = interpolate(
    frame - scribbleDelay,
    [0, Math.round(fps * 0.7)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) },
  );
  const drawFinal = frame < durationInFrames - Math.round(fps * 0.8)
    ? drawProgress
    : drawProgress * progress;

  // ── Subtle wobble — hand-drawn organic feel ──

  const wobble = Math.sin(frame * 0.08) * 0.3;

  // ── Slide + Fade ──

  const slideX = interpolate(progress, [0, 1], [-200, 0]);
  const opacity = interpolate(progress, [0, 0.4, 1], [0, 1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── SVG Scribble Paths ──
  // Approximate widths per char to size our scribble decorations
  const nameWidth = name.length * 22 + 40;

  const renderScribble = () => {
    if (scribbleStyle === 'underline') {
      // Irregular hand-drawn underline
      const pathLength = nameWidth + 60;
      const d = `M 0 8 C ${pathLength * 0.15} 2, ${pathLength * 0.3} 14, ${pathLength * 0.5} 6 S ${pathLength * 0.75} 12, ${pathLength} 7`;
      return (
        <svg
          width={pathLength}
          height={20}
          viewBox={`0 0 ${pathLength} 20`}
          style={{ marginTop: 4, marginLeft: -4 }}
        >
          <path
            d={d}
            fill="none"
            stroke={primaryColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={pathLength * 2}
            strokeDashoffset={pathLength * 2 * (1 - drawFinal)}
          />
        </svg>
      );
    }

    if (scribbleStyle === 'circle') {
      // Hand-drawn circle around the name
      const w = nameWidth + 50;
      const h = 70;
      const cx = w / 2;
      const cy = h / 2;
      const rx = w / 2 - 6;
      const ry = h / 2 - 6;
      // Irregular ellipse path — not perfectly round for organic feel
      const d = `M ${cx - rx} ${cy + 3}
        C ${cx - rx} ${cy - ry + 5}, ${cx + 4} ${cy - ry - 2}, ${cx + rx + 2} ${cy - 4}
        C ${cx + rx + 4} ${cy + ry - 3}, ${cx - 6} ${cy + ry + 3}, ${cx - rx - 2} ${cy + 1}`;
      const circleLength = (rx + ry) * Math.PI * 1.2;
      return (
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          style={{
            position: 'absolute',
            top: -10,
            left: -25,
            pointerEvents: 'none',
          }}
        >
          <path
            d={d}
            fill="none"
            stroke={primaryColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeDasharray={circleLength}
            strokeDashoffset={circleLength * (1 - drawFinal)}
          />
        </svg>
      );
    }

    if (scribbleStyle === 'bracket') {
      // Hand-drawn left bracket / vertical accent
      const h = 60;
      const d = `M 16 2 C 6 4, 2 10, 3 ${h / 2} S 6 ${h - 4}, 16 ${h - 2}`;
      const bracketLength = h * 1.5;
      return (
        <svg
          width={24}
          height={h}
          viewBox={`0 0 24 ${h}`}
          style={{
            position: 'absolute',
            left: -30,
            top: -8,
            pointerEvents: 'none',
          }}
        >
          <path
            d={d}
            fill="none"
            stroke={primaryColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={bracketLength}
            strokeDashoffset={bracketLength * (1 - drawFinal)}
          />
        </svg>
      );
    }

    return null;
  };

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 48,
          transform: `translateX(${slideX}px) rotate(${wobble}deg)`,
          opacity,
        }}
      >
        {/* Container — no rigid box, just the text */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {/* Circle & bracket decorations are absolutely positioned */}
          {(scribbleStyle === 'circle' || scribbleStyle === 'bracket') && renderScribble()}

          {/* Name — script font for organic feel */}
          <div
            style={{
              color: textColor,
              fontSize: 38,
              fontWeight: 'bold',
              fontFamily: '"Georgia", "Times New Roman", serif',
              letterSpacing: 1,
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>

          {/* Underline scribble (below name) */}
          {scribbleStyle === 'underline' && renderScribble()}

          {/* Title — clean sans-serif */}
          {title && (
            <div
              style={{
                color: primaryColor,
                fontSize: 15,
                fontWeight: '500',
                fontFamily: 'Inter, system-ui, sans-serif',
                letterSpacing: 3,
                textTransform: 'uppercase',
                marginTop: scribbleStyle === 'underline' ? 6 : 10,
                opacity: interpolate(
                  frame - Math.round(fps * 0.4),
                  [0, Math.round(fps * 0.4)],
                  [0, 0.85],
                  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
                ) * (frame < durationInFrames - Math.round(fps * 0.8) ? 1 : progress),
              }}
            >
              {title}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
