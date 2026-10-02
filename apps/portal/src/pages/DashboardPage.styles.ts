import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { areaTokens, glassTokens } from '../../../../packages/ui/src';

export const useDashboardStyles = makeStyles({
  page: { display: 'grid', gap: tokens.spacingVerticalXXXL, minWidth: 0 },
  heading: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    position: 'relative', overflow: 'hidden', isolation: 'isolate',
    minHeight: '244px',
    gap: tokens.spacingHorizontalXXXL,
    ...shorthands.padding(tokens.spacingVerticalXXXL, tokens.spacingHorizontalXXXL),
    ...shorthands.border('1px', 'solid', glassTokens.border),
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: glassTokens.surface,
    backgroundImage: `radial-gradient(ellipse 48% 90% at 88% 50%, ${glassTokens.cardGlow}, transparent 85%)`,
    boxShadow: glassTokens.shadow,
    '@media (prefers-reduced-transparency: reduce), (forced-colors: active)': {
      backgroundImage: 'none'
    },
    '@media (max-width: 600px)': {
      minHeight: '200px',
      ...shorthands.padding(tokens.spacingVerticalXXL, tokens.spacingHorizontalL)
    }
  },
  headingCopy: { display: 'grid', justifyItems: 'start', gap: tokens.spacingVerticalM, position: 'relative', zIndex: 1 },
  eyebrow: {
    display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2, fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold
  },
  title: {
    margin: 0, fontSize: tokens.fontSizeHero800, lineHeight: tokens.lineHeightHero800,
    fontWeight: tokens.fontWeightRegular,
    '@media (max-width: 600px)': { fontSize: tokens.fontSizeBase600, lineHeight: tokens.lineHeightBase600 }
  },
  headingDescription: { color: tokens.colorNeutralForeground2, maxWidth: '42ch' },
  muted: { color: tokens.colorNeutralForeground3 },
  heroArt: {
    width: '280px', height: '180px', display: 'grid', placeItems: 'center', flexShrink: 0,
    '@media (max-width: 760px), (forced-colors: active)': { display: 'none' }
  },
  orbit: {
    position: 'relative', width: '220px', height: '150px',
    ...shorthands.border('1px', 'solid', glassTokens.artLine),
    borderRadius: '50%',
    transform: 'rotate(-18deg)',
    ':before': {
      content: '""', position: 'absolute', inset: '22px 34px',
      ...shorthands.border('1px', 'solid', glassTokens.artLine),
      borderRadius: '50%'
    }
  },
  orbitCenter: {
    position: 'absolute', left: '50%', top: '50%', width: '72px', height: '72px',
    transform: 'translate(-50%, -50%) rotate(18deg)',
    boxShadow: `0 0 54px 8px ${glassTokens.cardGlow}`, borderRadius: tokens.borderRadiusXLarge
  },
  orbitNode: {
    position: 'absolute', display: 'grid', placeItems: 'center', width: '42px', height: '42px',
    color: tokens.colorNeutralForeground2, backgroundColor: glassTokens.solidSurface,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    borderRadius: tokens.borderRadiusCircular, boxShadow: glassTokens.shadow,
    transform: 'rotate(18deg)',
    ':nth-child(1)': { top: '-20px', left: '38px' },
    ':nth-child(2)': { top: '-20px', right: '20px' },
    ':nth-child(3)': { bottom: '-20px', left: '20px' },
    ':nth-child(4)': { bottom: '-20px', right: '38px' }
  },
  stats: {
    display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: tokens.spacingHorizontalL, margin: 0,
    '@media (max-width: 600px)': { gridTemplateColumns: 'minmax(0, 1fr)' }
  },
  stat: {
    minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    gap: tokens.spacingVerticalM, minHeight: '128px',
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalXL),
    ...shorthands.border('1px', 'solid', glassTokens.border),
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: glassTokens.surface,
    boxShadow: glassTokens.shadow,
    '@media (max-width: 600px)': { minHeight: '98px' }
  },
  statLabel: {
    display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2, fontSize: tokens.fontSizeBase200,
    '& > svg': { flexShrink: 0, color: tokens.colorNeutralForeground2 }
  },
  statValue: {
    margin: 0, fontSize: tokens.fontSizeHero800, lineHeight: tokens.lineHeightHero800,
    fontWeight: tokens.fontWeightRegular, fontVariantNumeric: 'tabular-nums',
    '@media (max-width: 600px)': { fontSize: tokens.fontSizeBase600, lineHeight: tokens.lineHeightBase600 }
  },
  sections: {
    display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
    gap: tokens.spacingHorizontalXXXL, alignItems: 'start',
    '@media (max-width: 1000px)': { gridTemplateColumns: 'minmax(0, 1fr)', gap: tokens.spacingVerticalXXXL }
  },
  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: tokens.spacingHorizontalM, marginBottom: tokens.spacingVerticalL
  },
  sectionHeading: { display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalM },
  sectionIcon: {
    display: 'grid', placeItems: 'center', width: '36px', height: '36px',
    color: tokens.colorNeutralForeground1, backgroundColor: glassTokens.mutedSurface,
    borderRadius: tokens.borderRadiusMedium
  },
  sectionTitle: { margin: 0, fontSize: tokens.fontSizeBase500, lineHeight: tokens.lineHeightBase500, fontWeight: tokens.fontWeightSemibold },
  list: { display: 'grid', gap: tokens.spacingVerticalL },
  card: {
    minWidth: 0, gap: tokens.spacingVerticalM, position: 'relative', overflow: 'hidden',
    ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalXL),
    ...shorthands.border('1px', 'solid', glassTokens.border),
    borderRadius: tokens.borderRadiusLarge, backgroundColor: glassTokens.surface,
    boxShadow: glassTokens.shadow,
    transitionProperty: 'background-color, box-shadow',
    transitionDuration: tokens.durationNormal,
    ':hover': { backgroundColor: glassTokens.surfaceHover, boxShadow: glassTokens.shadowHover }
  },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: tokens.spacingHorizontalM },
  itemTitle: { margin: 0, fontSize: tokens.fontSizeBase400, lineHeight: tokens.lineHeightBase400, fontWeight: tokens.fontWeightSemibold, overflowWrap: 'anywhere' },
  itemLink: { color: tokens.colorNeutralForeground1, textDecorationLine: 'none', ':hover': { textDecorationLine: 'underline' } },
  description: { color: tokens.colorNeutralForeground2, maxWidth: '70ch', overflowWrap: 'anywhere' },
  progress: { display: 'grid', gap: tokens.spacingVerticalS, paddingBlock: tokens.spacingVerticalS },
  eventDate: {
    display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalS,
    color: areaTokens('events').foreground, fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold
  },
  textLink: {
    display: 'inline-flex', width: 'fit-content', alignItems: 'center',
    gap: tokens.spacingHorizontalS, minHeight: '36px', color: tokens.colorNeutralForeground1,
    textDecorationLine: 'none', fontSize: tokens.fontSizeBase200,
    ':hover': { textDecorationLine: 'underline' }
  }
});
