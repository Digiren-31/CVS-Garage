import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { glassTokens } from '../../../../packages/ui/src';

export const useLandingStyles = makeStyles({
  page: {
    display: 'grid',
    gap: 'clamp(72px, 10vw, 132px)',
    overflow: 'hidden',
    paddingBottom: 'clamp(72px, 10vw, 128px)'
  },
  section: {
    width: 'min(100%, 1240px)',
    marginInline: 'auto',
    scrollMarginTop: '112px',
    ...shorthands.padding(0, 'clamp(20px, 5vw, 64px)')
  },
  hero: {
    width: 'min(100%, 1440px)',
    minHeight: 'min(760px, calc(100dvh - 82px))',
    marginInline: 'auto',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 0.92fr) minmax(420px, 1.08fr)',
    alignItems: 'center',
    gap: 'clamp(36px, 7vw, 96px)',
    position: 'relative',
    isolation: 'isolate',
    ...shorthands.padding(
      'clamp(56px, 8vw, 108px)',
      'clamp(20px, 5vw, 72px)',
      'clamp(48px, 7vw, 88px)'
    ),
    ':before': {
      content: '""',
      position: 'absolute',
      width: '460px',
      height: '460px',
      right: '-180px',
      top: '-160px',
      borderRadius: tokens.borderRadiusCircular,
      backgroundColor: glassTokens.accentSurface,
      filter: 'blur(80px)',
      opacity: 0.6,
      zIndex: -1,
      pointerEvents: 'none'
    },
    '@media (max-width: 980px)': {
      gridTemplateColumns: 'minmax(0, 1fr)',
      minHeight: 'auto'
    },
    '@media (prefers-reduced-transparency: reduce), (forced-colors: active)': {
      ':before': { display: 'none' }
    }
  },
  heroCopy: {
    display: 'grid',
    justifyItems: 'start',
    gap: tokens.spacingVerticalXL,
    position: 'relative',
    zIndex: 2
  },
  eyebrow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    minHeight: '34px',
    color: tokens.colorNeutralForeground2,
    backgroundColor: glassTokens.mutedSurface,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalM),
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold
  },
  heroTitle: {
    maxWidth: '12ch',
    margin: 0,
    fontSize: 'clamp(3.25rem, 7.8vw, 7.25rem)',
    lineHeight: 0.92,
    letterSpacing: '-0.065em',
    fontWeight: tokens.fontWeightRegular,
    textWrap: 'balance',
    '@media (max-width: 600px)': {
      fontSize: 'clamp(3rem, 15vw, 4.7rem)',
      lineHeight: 0.96
    }
  },
  heroAccent: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold
  },
  heroDescription: {
    maxWidth: '54ch',
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM
  },
  primaryCta: {
    minHeight: '48px',
    borderRadius: tokens.borderRadiusCircular,
    ...shorthands.padding(0, tokens.spacingHorizontalXL)
  },
  secondaryCta: {
    minHeight: '48px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground1,
    textDecorationLine: 'none',
    ...shorthands.padding(0, tokens.spacingHorizontalM),
    borderRadius: tokens.borderRadiusCircular,
    ':hover': {
      backgroundColor: glassTokens.mutedSurface
    }
  },
  signInError: {
    color: tokens.colorPaletteRedForeground1
  },
  trustLine: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalL,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200
  },
  trustItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS
  },
  heroVisual: {
    minHeight: '560px',
    position: 'relative',
    '@media (max-width: 980px)': {
      minHeight: '500px'
    },
    '@media (max-width: 600px)': {
      minHeight: '390px'
    },
    '@media (forced-colors: active)': {
      display: 'none'
    }
  },
  imageFrame: {
    position: 'absolute',
    inset: '4% 3% 7% 8%',
    overflow: 'hidden',
    borderRadius: 'clamp(28px, 5vw, 64px)',
    backgroundColor: glassTokens.mutedSurface,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    boxShadow: glassTokens.shadowHover,
    transform: 'rotate(2.5deg)',
    ':after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundImage: `linear-gradient(180deg, transparent 52%, ${glassTokens.overlay})`,
      pointerEvents: 'none'
    }
  },
  heroImage: {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'cover',
    filter: 'saturate(0.9) contrast(1.04)',
    transform: 'scale(1.02)',
    transitionProperty: 'transform, filter',
    transitionDuration: tokens.durationSlower,
    ':hover': {
      transform: 'scale(1.055)',
      filter: 'saturate(1) contrast(1.04)'
    }
  },
  visualCaption: {
    position: 'absolute',
    left: 'clamp(24px, 7vw, 72px)',
    right: 'clamp(20px, 5vw, 48px)',
    bottom: 'clamp(38px, 8vw, 82px)',
    zIndex: 2,
    display: 'grid',
    gap: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForegroundOnBrand
  },
  visualCaptionTitle: {
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
    fontWeight: tokens.fontWeightSemibold
  },
  floatingCard: {
    position: 'absolute',
    zIndex: 3,
    minWidth: '190px',
    display: 'grid',
    gap: tokens.spacingVerticalXS,
    backgroundColor: glassTokens.strongSurface,
    backdropFilter: glassTokens.blur,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: glassTokens.shadowHover,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    '@media (prefers-reduced-transparency: reduce)': {
      backgroundColor: glassTokens.solidSurface
    }
  },
  floatingTop: {
    top: 0,
    left: 0,
    transform: 'rotate(-4deg)'
  },
  floatingBottom: {
    right: 0,
    bottom: 0,
    transform: 'rotate(3deg)'
  },
  floatingLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200
  },
  metrics: {
    width: 'min(100%, 1100px)',
    marginInline: 'auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    backgroundColor: glassTokens.surface,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    borderRadius: tokens.borderRadiusXLarge,
    overflow: 'hidden',
    '@media (max-width: 700px)': {
      gridTemplateColumns: 'minmax(0, 1fr)'
    }
  },
  metric: {
    minHeight: '142px',
    display: 'grid',
    alignContent: 'center',
    gap: tokens.spacingVerticalS,
    ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalXXL),
    borderRight: `1px solid ${glassTokens.border}`,
    ':last-child': { borderRight: 0 },
    '@media (max-width: 700px)': {
      minHeight: '110px',
      borderRight: 0,
      borderBottom: `1px solid ${glassTokens.border}`,
      ':last-child': { borderBottom: 0 }
    }
  },
  metricValue: {
    margin: 0,
    fontSize: tokens.fontSizeHero900,
    lineHeight: tokens.lineHeightHero900,
    fontWeight: tokens.fontWeightRegular,
    fontVariantNumeric: 'tabular-nums'
  },
  metricLabel: {
    color: tokens.colorNeutralForeground2
  },
  metricError: {
    gridColumn: '1 / -1',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    color: tokens.colorPaletteRedForeground1,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL)
  },
  sectionHeader: {
    display: 'grid',
    gap: tokens.spacingVerticalM,
    maxWidth: '760px',
    marginBottom: 'clamp(32px, 5vw, 56px)'
  },
  kicker: {
    color: glassTokens.accentForeground,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    letterSpacing: '0.12em'
  },
  sectionTitle: {
    margin: 0,
    fontSize: 'clamp(2.15rem, 5vw, 4.5rem)',
    lineHeight: 1,
    letterSpacing: '-0.045em',
    fontWeight: tokens.fontWeightRegular,
    textWrap: 'balance'
  },
  sectionDescription: {
    maxWidth: '60ch',
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase500
  },
  workspaceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalL,
    '@media (max-width: 980px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
    },
    '@media (max-width: 640px)': {
      gridTemplateColumns: 'minmax(0, 1fr)'
    }
  },
  workspaceCard: {
    minHeight: '268px',
    display: 'grid',
    gridTemplateRows: 'auto auto 1fr auto',
    gap: tokens.spacingVerticalL,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: glassTokens.surface,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    borderRadius: tokens.borderRadiusXLarge,
    ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalXL),
    transitionProperty: 'transform, background-color, box-shadow',
    transitionDuration: tokens.durationNormal,
    ':before': {
      content: '""',
      position: 'absolute',
      inset: '0 0 auto',
      height: '4px',
      backgroundColor: 'var(--landing-accent)'
    },
    ':hover': {
      transform: 'translateY(-5px)',
      backgroundColor: glassTokens.surfaceHover,
      boxShadow: glassTokens.shadowHover
    }
  },
  workspaceIcon: {
    width: '48px',
    height: '48px',
    display: 'grid',
    placeItems: 'center',
    color: 'var(--landing-accent)',
    backgroundColor: 'var(--landing-tint)',
    borderRadius: tokens.borderRadiusLarge
  },
  cardTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
    fontWeight: tokens.fontWeightSemibold
  },
  cardDescription: {
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase400
  },
  cardLink: {
    width: 'fit-content',
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground1,
    textDecorationLine: 'none',
    fontWeight: tokens.fontWeightSemibold,
    ':hover': { textDecorationLine: 'underline' }
  },
  story: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.12fr) minmax(320px, 0.88fr)',
    gap: 'clamp(40px, 7vw, 96px)',
    alignItems: 'center',
    '@media (max-width: 900px)': {
      gridTemplateColumns: 'minmax(0, 1fr)'
    }
  },
  storyImages: {
    minHeight: '590px',
    display: 'grid',
    gridTemplateColumns: '1.22fr 0.78fr',
    gridTemplateRows: '1fr 1fr',
    gap: tokens.spacingHorizontalL,
    '@media (max-width: 600px)': {
      minHeight: '440px',
      gap: tokens.spacingHorizontalS
    },
    '@media (forced-colors: active)': {
      display: 'none'
    }
  },
  storyImageLarge: {
    gridRow: '1 / 3'
  },
  storyImage: {
    width: '100%',
    height: '100%',
    minHeight: 0,
    objectFit: 'cover',
    borderRadius: tokens.borderRadiusXLarge,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    filter: 'saturate(0.86) contrast(1.03)',
    transitionProperty: 'transform, filter',
    transitionDuration: tokens.durationSlower,
    ':hover': {
      transform: 'scale(1.015)',
      filter: 'saturate(1) contrast(1.03)'
    }
  },
  storyCopy: {
    display: 'grid',
    gap: tokens.spacingVerticalXL
  },
  storyPoints: {
    display: 'grid',
    gap: tokens.spacingVerticalL
  },
  storyPoint: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    gap: tokens.spacingHorizontalM,
    alignItems: 'start'
  },
  pointIcon: {
    width: '36px',
    height: '36px',
    display: 'grid',
    placeItems: 'center',
    color: glassTokens.accentForeground,
    backgroundColor: glassTokens.accentSurface,
    borderRadius: tokens.borderRadiusCircular
  },
  pointCopy: {
    display: 'grid',
    gap: tokens.spacingVerticalXS
  },
  attribution: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    '& a': {
      color: 'inherit'
    }
  },
  steps: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalXL,
    '@media (max-width: 760px)': {
      gridTemplateColumns: 'minmax(0, 1fr)'
    }
  },
  step: {
    display: 'grid',
    gap: tokens.spacingVerticalL,
    alignContent: 'start',
    ...shorthands.padding(tokens.spacingVerticalXL, 0)
  },
  stepNumber: {
    width: '42px',
    height: '42px',
    display: 'grid',
    placeItems: 'center',
    backgroundColor: tokens.colorNeutralForeground1,
    color: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusCircular,
    fontWeight: tokens.fontWeightBold
  },
  cta: {
    width: 'min(100%, 1180px)',
    minHeight: '360px',
    marginInline: 'auto',
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: glassTokens.strongSurface,
    backgroundImage: `radial-gradient(circle at 50% 110%, ${glassTokens.cardGlow}, transparent 54%)`,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    borderRadius: 'clamp(28px, 5vw, 56px)',
    ...shorthands.padding(
      'clamp(48px, 8vw, 88px)',
      'clamp(24px, 7vw, 96px)'
    ),
    '@media (prefers-reduced-transparency: reduce), (forced-colors: active)': {
      backgroundImage: 'none'
    }
  },
  ctaCopy: {
    maxWidth: '760px',
    display: 'grid',
    justifyItems: 'center',
    gap: tokens.spacingVerticalXL
  }
});
