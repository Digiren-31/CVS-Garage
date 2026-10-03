import { Button, Card, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import type { Member } from '../../../../packages/contracts/src';
import { StatePanel, glassTokens } from '../../../../packages/ui/src';

const useStyles = makeStyles({
  page: {
    minHeight: 'calc(100dvh - 180px)',
    display: 'grid',
    placeItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalXXL, tokens.spacingHorizontalXL)
  },
  card: {
    width: 'min(100%, 560px)',
    display: 'grid',
    justifyItems: 'start',
    gap: tokens.spacingVerticalL,
    backgroundColor: glassTokens.surface,
    backdropFilter: glassTokens.blur,
    boxShadow: glassTokens.shadow,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    ...shorthands.padding(tokens.spacingVerticalXXL, tokens.spacingHorizontalXXL)
  },
  icon: {
    width: '44px',
    height: '44px',
    display: 'grid',
    placeItems: 'center',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1
  },
  title: { margin: 0 },
  description: { color: tokens.colorNeutralForeground2, maxWidth: '48ch' },
  actions: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' }
});

interface AuthGateProps extends PropsWithChildren {
  mode: 'demo' | 'supabase' | 'misconfigured';
  member: Member | null;
  loading: boolean;
  error: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function AuthGate({
  mode,
  member,
  loading,
  error,
  onSignIn,
  onSignOut,
  children
}: AuthGateProps) {
  const styles = useStyles();

  if (mode === 'demo') {
    return children;
  }
  if (loading) {
    return <StatePanel state="loading" message="Checking your secure session" />;
  }
  if (mode === 'misconfigured') {
    return (
      <StatePanel
        state="error"
        title="Authentication is not configured"
        message="The production portal is missing its public Supabase settings. Contact the portal administrator."
      />
    );
  }
  if (error && !member) {
    return <StatePanel state="error" message={error} onRetry={onSignIn} />;
  }
  if (!member) {
    return (
      <div className={styles.page}>
        <Card className={styles.card}>
          <span className={styles.icon}><LogIn size={22} aria-hidden="true" /></span>
          <h1 className={styles.title}>Sign in to continue</h1>
          <Text className={styles.description}>
            CVS Garage uses Google to verify your identity. New accounts remain private
            until a portal administrator approves access.
          </Text>
          <Button appearance="primary" icon={<LogIn size={18} />} onClick={onSignIn}>
            Continue with Google
          </Button>
        </Card>
      </div>
    );
  }
  if (member.status !== 'active') {
    const pending = member.status === 'pending';
    return (
      <div className={styles.page}>
        <Card className={styles.card}>
          <span className={styles.icon}><ShieldCheck size={22} aria-hidden="true" /></span>
          <h1 className={styles.title}>
            {pending ? 'Approval is pending' : 'Account access is suspended'}
          </h1>
          <Text className={styles.description}>
            {pending
              ? 'Your Google account is verified. An administrator must approve your CVS Garage profile before service areas become available.'
              : 'This profile cannot access service areas. Contact a portal administrator if you believe this is a mistake.'}
          </Text>
          <div className={styles.actions}>
            <Button icon={<LogOut size={18} />} onClick={onSignOut}>Sign out</Button>
          </div>
        </Card>
      </div>
    );
  }

  return children;
}
