import {
  Badge,
  Button,
  Card,
  CardHeader,
  Spinner,
  Text,
  Title2,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import type { PropsWithChildren, ReactNode } from 'react';
import type { AreaId } from './theme';
import { areaDetails } from './theme';
import { glassTokens } from './glass';

const useStyles = makeStyles({
  page: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalXXXL,
    '& > *': {
      minWidth: 0
    }
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    flexWrap: 'wrap'
  },
  heading: {
    flexGrow: 1,
    flexBasis: '440px',
    minWidth: 0,
    display: 'grid',
    gap: tokens.spacingVerticalS
  },
  title: {
    margin: 0,
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    fontWeight: tokens.fontWeightRegular,
    overflowWrap: 'anywhere',
    '@media (max-width: 700px)': {
      fontSize: tokens.fontSizeHero700,
      lineHeight: tokens.lineHeightHero700
    }
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexShrink: 0,
    maxWidth: '100%'
  },
  eyebrow: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    '::before': {
      content: '""',
      width: tokens.spacingHorizontalS,
      height: tokens.spacingVerticalS,
      borderRadius: tokens.borderRadiusCircular,
      backgroundColor: tokens.colorBrandForeground1
    }
  },
  subtitle: {
    color: tokens.colorNeutralForeground2,
    maxWidth: '64ch'
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
    gap: tokens.spacingHorizontalM,
    minWidth: 0
  },
  metric: {
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalXL),
    ...shorthands.border('1px', 'solid', glassTokens.border),
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: glassTokens.surface,
    backdropFilter: glassTokens.blur,
    boxShadow: glassTokens.shadow,
    minWidth: 0,
    minHeight: '104px',
    gap: tokens.spacingVerticalS
  },
  metricLabel: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    color: tokens.colorNeutralForeground2
  },
  metricIcon: {
    color: tokens.colorBrandForeground1,
    display: 'inline-flex',
    flexShrink: 0
  },
  metricValue: {
    display: 'block',
    fontSize: tokens.fontSizeHero700,
    lineHeight: tokens.lineHeightHero700,
    fontWeight: tokens.fontWeightRegular,
    fontVariantNumeric: 'tabular-nums',
    overflowWrap: 'anywhere'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
    gap: tokens.spacingHorizontalXL,
    minWidth: 0,
    alignItems: 'stretch',
    '& > *': {
      minWidth: 0
    }
  },
  card: {
    minWidth: 0,
    height: '100%',
    ...shorthands.padding(tokens.spacingVerticalL),
    ...shorthands.border('1px', 'solid', glassTokens.border),
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: glassTokens.surface,
    backdropFilter: glassTokens.blur,
    boxShadow: glassTokens.shadow,
    gap: tokens.spacingVerticalM
  },
  cardTitle: {
    overflowWrap: 'anywhere'
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    marginTop: 'auto',
    paddingTop: tokens.spacingVerticalS
  },
  panel: {
    minWidth: 0,
    ...shorthands.padding(tokens.spacingVerticalL),
    ...shorthands.border('1px', 'solid', glassTokens.border),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    backgroundColor: glassTokens.surface,
    backdropFilter: glassTokens.blur,
    boxShadow: glassTokens.shadow
  },
  badge: {
    whiteSpace: 'normal',
    height: 'auto',
    minHeight: '24px',
    flexShrink: 0,
    maxWidth: '100%',
    ...shorthands.padding(tokens.spacingVerticalXXS, tokens.spacingHorizontalS),
    textAlign: 'center',
    overflowWrap: 'anywhere',
    lineHeight: tokens.lineHeightBase200
  },
  state: {
    minHeight: '220px',
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    ...shorthands.padding(tokens.spacingVerticalXXL)
  },
  stateInner: {
    display: 'grid',
    gap: tokens.spacingVerticalM,
    justifyItems: 'center',
    maxWidth: '440px'
  }
});

export function ServicePage({
  area,
  title,
  description,
  actions,
  children
}: PropsWithChildren<{
  area: AreaId;
  title: string;
  description: string;
  actions?: ReactNode;
}>) {
  const styles = useStyles();
  return (
    <div className={styles.page} data-service-page={area}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <Text block size={200} className={styles.eyebrow}>
            {areaDetails[area].label}
          </Text>
          <Title2 as="h1" className={styles.title}>{title}</Title2>
          <Text block size={300} className={styles.subtitle}>
            {description}
          </Text>
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function MetricGrid({ children }: PropsWithChildren) {
  return <div className={useStyles().metrics}>{children}</div>;
}

export function MetricCard({
  label,
  value,
  detail,
  icon
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <Card className={styles.metric} data-pointer-glow>
      <div className={styles.metricLabel}>
        <Text size={200}>{label}</Text>
        {icon ? <span className={styles.metricIcon} aria-hidden="true">{icon}</span> : null}
      </div>
      <Text className={styles.metricValue}>{value}</Text>
      {detail ? <Text size={200}>{detail}</Text> : null}
    </Card>
  );
}

export function CardGrid({ children }: PropsWithChildren) {
  return <div className={useStyles().grid}>{children}</div>;
}

export function ContentCard({
  title,
  description,
  header,
  children,
  footer
}: PropsWithChildren<{
  title: string;
  description?: string;
  header?: ReactNode;
  footer?: ReactNode;
}>) {
  const styles = useStyles();
  return (
    <Card className={styles.card} data-pointer-glow>
      <CardHeader
        header={<Text weight="semibold" className={styles.cardTitle}>{title}</Text>}
        description={description ? <Text>{description}</Text> : undefined}
        action={header ? <div>{header}</div> : undefined}
      />
      {children}
      {footer ? <div className={styles.cardFooter}>{footer}</div> : null}
    </Card>
  );
}

export function Panel({ children }: PropsWithChildren) {
  return <section className={useStyles().panel} data-pointer-glow>{children}</section>;
}

export function StatusBadge({ status }: { status: string }) {
  const styles = useStyles();
  const normalized = status.toLowerCase();
  const color =
    normalized.includes('complete') || normalized.includes('active') || normalized.includes('registered')
      ? 'success'
      : normalized.includes('suspend') || normalized.includes('cancel') || normalized.includes('declin')
        ? 'danger'
        : normalized.includes('progress') || normalized.includes('ongoing')
          ? 'warning'
          : 'informative';

  return <Badge className={styles.badge} color={color} appearance="tint" shape="rounded">{status}</Badge>;
}

export function StatePanel({
  state,
  title,
  message,
  onRetry
}: {
  state: 'loading' | 'empty' | 'error';
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const styles = useStyles();
  return (
    <div className={styles.state} role={state === 'error' ? 'alert' : 'status'}>
      <div className={styles.stateInner}>
        {state === 'loading' ? <Spinner label={message || 'Loading'} /> : null}
        {state !== 'loading' ? (
          <>
            <Text size={500} weight="semibold">{title || (state === 'empty' ? 'Nothing here yet' : 'Something went wrong')}</Text>
            <Text>{message}</Text>
            {onRetry ? <Button appearance="primary" onClick={onRetry}>Try again</Button> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
