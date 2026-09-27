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

const useStyles = makeStyles({
  page: {
    display: 'grid',
    gap: tokens.spacingVerticalXXL
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalL,
    flexWrap: 'wrap'
  },
  eyebrow: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  subtitle: {
    color: tokens.colorNeutralForeground2,
    maxWidth: '70ch'
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: tokens.spacingHorizontalM
  },
  metric: {
    ...shorthands.padding(tokens.spacingVerticalL),
    minHeight: '116px'
  },
  metricValue: {
    display: 'block',
    fontSize: tokens.fontSizeHero700,
    lineHeight: tokens.lineHeightHero700,
    fontWeight: tokens.fontWeightSemibold
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
    gap: tokens.spacingHorizontalL
  },
  panel: {
    ...shorthands.padding(tokens.spacingVerticalL),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    backgroundColor: tokens.colorNeutralBackground1
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
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Text block size={200} className={styles.eyebrow}>
            {areaDetails[area].label}
          </Text>
          <Title2 as="h1">{title}</Title2>
          <Text block size={400} className={styles.subtitle}>
            {description}
          </Text>
        </div>
        {actions}
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
  detail
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  const styles = useStyles();
  return (
    <Card className={styles.metric}>
      <Text size={300}>{label}</Text>
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
  return (
    <Card>
      <CardHeader
        header={<Text weight="semibold">{title}</Text>}
        description={description ? <Text>{description}</Text> : undefined}
        action={header ? <div>{header}</div> : undefined}
      />
      {children}
      {footer}
    </Card>
  );
}

export function Panel({ children }: PropsWithChildren) {
  return <section className={useStyles().panel}>{children}</section>;
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const color =
    normalized.includes('complete') || normalized.includes('active') || normalized.includes('registered')
      ? 'success'
      : normalized.includes('suspend') || normalized.includes('cancel') || normalized.includes('declin')
        ? 'danger'
        : normalized.includes('progress') || normalized.includes('ongoing')
          ? 'warning'
          : 'informative';

  return <Badge color={color}>{status}</Badge>;
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
