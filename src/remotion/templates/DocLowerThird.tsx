import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';

export interface DocLowerThirdProps {
  name: string;
  title?: string;
  style?: 'documentary' | 'archive' | 'narrator';
  primaryColor?: string;
  textColor?: string;
}

export const DocLowerThird: React.FC<DocLowerThirdProps> = ({
  name,
  title = '',
  style = 'documentary',
  primaryColor = '#D4AF37', // cinematic gold
  textColor = '#ffffff',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Smooth entrance — no bounce, slow elegant reveal
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  // Smooth exit near end
  const exitProgress = spring({
    frame: Math.max(0, frame - (durationInFrames - Math.round(fps * 0.8))),
    fps,
    config: { damping: 200 },
  });

  const progress = frame < durationInFrames - Math.round(fps * 0.8)
    ? enterProgress
    : 1 - exitProgress;

  // -- Documentary style --
  // Serif font, thin gold underline that draws on, dark semi-transparent background
  if (style === 'documentary') {
    const slideX = interpolate(progress, [0, 1], [-300, 0]);
    const opacity = interpolate(progress, [0, 0.4, 1], [0, 1, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    // Gold underline draws on with a slight delay
    const lineDelay = Math.round(fps * 0.3);
    const lineProgress = interpolate(frame - lineDelay, [0, Math.round(fps * 0.6)], [0, 100], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.inOut(Easing.quad),
    });
    const lineWidth = frame < durationInFrames - Math.round(fps * 0.8)
      ? lineProgress
      : lineProgress * progress;

    return (
      <AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 48,
            transform: `translateX(${slideX}px)`,
            opacity,
          }}
        >
          {/* Semi-transparent backing */}
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.55)',
              padding: '18px 36px 14px 36px',
              backdropFilter: 'blur(4px)',
            }}
          >
            {/* Name — serif, tracked */}
            <div
              style={{
                color: textColor,
                fontSize: 34,
                fontWeight: 'bold',
                fontFamily: 'Georgia, "Times New Roman", serif',
                letterSpacing: 1.5,
                textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              {name}
            </div>
            {title && (
              <div
                style={{
                  color: primaryColor,
                  fontSize: 16,
                  fontWeight: '500',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  marginTop: 6,
                }}
              >
                {title}
              </div>
            )}
          </div>
          {/* Gold underline */}
          <div
            style={{
              height: 2,
              backgroundColor: primaryColor,
              width: `${lineWidth}%`,
              marginTop: 0,
            }}
          />
        </div>
      </AbsoluteFill>
    );
  }

  // -- Archive style --
  // VHS-era monospace, glitchy scan-line feel, timestamp aesthetic
  if (style === 'archive') {
    const glitchOffset = frame % 120 < 3 ? Math.sin(frame * 7) * 2 : 0;
    const scanLineOpacity = interpolate(frame % 4, [0, 2, 4], [0.06, 0.12, 0.06], {
      extrapolateRight: 'clamp',
    });

    const slideY = interpolate(progress, [0, 1], [40, 0]);
    const opacity = interpolate(progress, [0, 0.5, 1], [0, 1, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    return (
      <AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 32,
            transform: `translateY(${slideY}px) translateX(${glitchOffset}px)`,
            opacity,
          }}
        >
          {/* VHS-style container */}
          <div
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '14px 28px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Scan line overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(255,255,255,${scanLineOpacity}) 2px,
                  rgba(255,255,255,${scanLineOpacity}) 4px
                )`,
                pointerEvents: 'none',
              }}
            />
            {/* Name — monospace, slightly warm */}
            <div
              style={{
                color: '#f0e6d3',
                fontSize: 26,
                fontWeight: 'bold',
                fontFamily: '"Courier New", Courier, monospace',
                letterSpacing: 2,
                textTransform: 'uppercase',
                textShadow: '1px 1px 0 rgba(212,175,55,0.3)',
              }}
            >
              {name}
            </div>
            {title && (
              <div
                style={{
                  color: 'rgba(240, 230, 211, 0.7)',
                  fontSize: 14,
                  fontFamily: '"Courier New", Courier, monospace',
                  letterSpacing: 1,
                  marginTop: 4,
                }}
              >
                {title}
              </div>
            )}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // -- Narrator style --
  // Ultra-minimal: just name and role, gentle fade with gold accent dot
  if (style === 'narrator') {
    const fadeIn = interpolate(progress, [0, 1], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    // Name slides up subtly
    const nameSlide = interpolate(progress, [0, 1], [12, 0]);

    // Title fades in slightly delayed
    const titleDelay = Math.round(fps * 0.25);
    const titleOpacity = interpolate(
      frame - titleDelay,
      [0, Math.round(fps * 0.5)],
      [0, 0.7],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const titleFinal = frame < durationInFrames - Math.round(fps * 0.8)
      ? titleOpacity
      : titleOpacity * progress;

    return (
      <AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            opacity: fadeIn,
          }}
        >
          {/* Gold accent dot */}
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: primaryColor,
              flexShrink: 0,
            }}
          />
          {/* Text block */}
          <div>
            <div
              style={{
                color: textColor,
                fontSize: 24,
                fontWeight: '600',
                fontFamily: 'Inter, system-ui, sans-serif',
                textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                transform: `translateY(${nameSlide}px)`,
              }}
            >
              {name}
            </div>
            {title && (
              <div
                style={{
                  color: textColor,
                  opacity: titleFinal,
                  fontSize: 13,
                  fontWeight: '400',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                {title}
              </div>
            )}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  return null;
};
