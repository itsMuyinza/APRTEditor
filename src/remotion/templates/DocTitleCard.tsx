import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Easing } from 'remotion';

export interface DocTitleCardProps {
  title: string;
  subtitle?: string;
  credit?: string;
  style?: 'cinematic' | 'era' | 'minimal';
  primaryColor?: string;
  textColor?: string;
  backgroundColor?: string;
}

export const DocTitleCard: React.FC<DocTitleCardProps> = ({
  title,
  subtitle = '',
  credit = 'APRT Media',
  style = 'cinematic',
  primaryColor = '#D4AF37',
  textColor = '#ffffff',
  backgroundColor = '#0a0a0a',
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Slow, cinematic entrance
  const enterProgress = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 60 },
  });

  // Gentle exit
  const exitStart = durationInFrames - Math.round(fps * 1.2);
  const exitProgress = spring({
    frame: Math.max(0, frame - exitStart),
    fps,
    config: { damping: 200 },
  });

  const isExiting = frame >= exitStart;
  const progress = isExiting ? 1 - exitProgress : enterProgress;

  // -- Cinematic style --
  // Dark background, large serif title fading in, gold accent line, optional credit watermark
  if (style === 'cinematic') {
    const titleOpacity = interpolate(progress, [0, 0.6, 1], [0, 0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const titleScale = interpolate(progress, [0, 1], [1.05, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    // Subtitle appears after title
    const subtitleDelay = Math.round(fps * 0.6);
    const subtitleOpacity = interpolate(
      frame - subtitleDelay,
      [0, Math.round(fps * 0.8)],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const subtitleFinal = isExiting ? subtitleOpacity * progress : subtitleOpacity;

    // Gold divider draws on
    const dividerDelay = Math.round(fps * 0.4);
    const dividerWidth = interpolate(
      frame - dividerDelay,
      [0, Math.round(fps * 0.7)],
      [0, 120],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) }
    );
    const dividerFinal = isExiting ? dividerWidth * progress : dividerWidth;

    // Credit watermark fades in last
    const creditDelay = Math.round(fps * 1.0);
    const creditOpacity = interpolate(
      frame - creditDelay,
      [0, Math.round(fps * 0.5)],
      [0, 0.35],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const creditFinal = isExiting ? creditOpacity * progress : creditOpacity;

    return (
      <AbsoluteFill
        style={{
          backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
            textAlign: 'center',
            padding: '0 80px',
          }}
        >
          {/* Main title */}
          <div
            style={{
              color: textColor,
              fontSize: 56,
              fontWeight: 'bold',
              fontFamily: 'Georgia, "Times New Roman", serif',
              letterSpacing: 2,
              lineHeight: 1.2,
              opacity: titleOpacity,
              transform: `scale(${titleScale})`,
              textShadow: '0 2px 20px rgba(0,0,0,0.5)',
            }}
          >
            {title}
          </div>

          {/* Gold divider */}
          <div
            style={{
              width: dividerFinal,
              height: 2,
              backgroundColor: primaryColor,
              marginTop: 24,
              marginBottom: 24,
            }}
          />

          {/* Subtitle — era/year line */}
          {subtitle && (
            <div
              style={{
                color: primaryColor,
                fontSize: 18,
                fontWeight: '500',
                fontFamily: 'Inter, system-ui, sans-serif',
                letterSpacing: 4,
                textTransform: 'uppercase',
                opacity: subtitleFinal,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Credit watermark bottom-right */}
        {credit && (
          <div
            style={{
              position: 'absolute',
              bottom: 32,
              right: 40,
              color: textColor,
              fontSize: 11,
              fontFamily: 'Inter, system-ui, sans-serif',
              letterSpacing: 3,
              textTransform: 'uppercase',
              opacity: creditFinal,
            }}
          >
            {credit}
          </div>
        )}
      </AbsoluteFill>
    );
  }

  // -- Era style --
  // Film grain texture overlay, warm-tinted background, vintage typography
  if (style === 'era') {
    const titleOpacity = interpolate(progress, [0, 0.5, 1], [0, 0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    // Simulated film grain via pseudo-random noise pattern
    const grainSeed = frame * 13.37;
    const grainOpacity = 0.08 + Math.sin(grainSeed) * 0.03;

    // Subtitle fades in
    const subtitleDelay = Math.round(fps * 0.8);
    const subtitleOpacity = interpolate(
      frame - subtitleDelay,
      [0, Math.round(fps * 0.6)],
      [0, 0.9],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const subtitleFinal = isExiting ? subtitleOpacity * progress : subtitleOpacity;

    // Slow vertical drift for cinematic feel
    const drift = interpolate(frame, [0, durationInFrames], [4, -4], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#1a150e', // warm dark
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Warm vignette overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(10,8,4,0.7) 100%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Film grain noise layer */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: width,
            height: height,
            opacity: grainOpacity,
            background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' seed='${Math.round(grainSeed)}' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '256px 256px',
            pointerEvents: 'none',
            mixBlendMode: 'overlay',
          }}
        />

        {/* Text content with drift */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '0 100px',
            transform: `translateY(${drift}px)`,
            zIndex: 1,
          }}
        >
          {/* Main title — vintage serif */}
          <div
            style={{
              color: '#f0e6d3', // warm white
              fontSize: 52,
              fontWeight: 'bold',
              fontFamily: 'Georgia, "Times New Roman", serif',
              letterSpacing: 3,
              lineHeight: 1.3,
              opacity: titleOpacity,
              textShadow: '0 2px 12px rgba(0,0,0,0.6)',
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <div
              style={{
                color: primaryColor,
                fontSize: 16,
                fontWeight: '400',
                fontFamily: '"Courier New", Courier, monospace',
                letterSpacing: 5,
                textTransform: 'uppercase',
                opacity: subtitleFinal,
                marginTop: 28,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Credit bottom center */}
        {credit && (
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              left: 0,
              right: 0,
              textAlign: 'center',
              color: 'rgba(240, 230, 211, 0.25)',
              fontSize: 10,
              fontFamily: '"Courier New", Courier, monospace',
              letterSpacing: 4,
              textTransform: 'uppercase',
              opacity: isExiting ? progress : 1,
            }}
          >
            {credit}
          </div>
        )}
      </AbsoluteFill>
    );
  }

  // -- Minimal style --
  // Clean, modern, just text on dark with thin gold accent
  if (style === 'minimal') {
    const titleOpacity = interpolate(progress, [0, 0.4, 1], [0, 0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const titleSlideY = interpolate(progress, [0, 1], [20, 0]);

    const subtitleDelay = Math.round(fps * 0.5);
    const subtitleOpacity = interpolate(
      frame - subtitleDelay,
      [0, Math.round(fps * 0.5)],
      [0, 0.8],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
    const subtitleFinal = isExiting ? subtitleOpacity * progress : subtitleOpacity;

    // Thin horizontal rule
    const ruleDelay = Math.round(fps * 0.3);
    const ruleWidth = interpolate(
      frame - ruleDelay,
      [0, Math.round(fps * 0.5)],
      [0, 60],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) }
    );
    const ruleFinal = isExiting ? ruleWidth * progress : ruleWidth;

    return (
      <AbsoluteFill
        style={{
          backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '0 60px',
          }}
        >
          {/* Title — clean sans-serif */}
          <div
            style={{
              color: textColor,
              fontSize: 48,
              fontWeight: '700',
              fontFamily: 'Inter, system-ui, sans-serif',
              letterSpacing: -0.5,
              lineHeight: 1.2,
              opacity: titleOpacity,
              transform: `translateY(${titleSlideY}px)`,
            }}
          >
            {title}
          </div>

          {/* Thin gold rule */}
          <div
            style={{
              width: ruleFinal,
              height: 1,
              backgroundColor: primaryColor,
              marginTop: 20,
              marginBottom: 20,
            }}
          />

          {/* Subtitle */}
          {subtitle && (
            <div
              style={{
                color: textColor,
                fontSize: 16,
                fontWeight: '400',
                fontFamily: 'Inter, system-ui, sans-serif',
                letterSpacing: 2,
                textTransform: 'uppercase',
                opacity: subtitleFinal,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </AbsoluteFill>
    );
  }

  return null;
};
