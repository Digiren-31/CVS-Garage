import { Card, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { Link } from 'react-router-dom';
import { glassTokens } from '../../../../packages/ui/src';

const useStyles = makeStyles({
  page: {
    width: 'min(100%, 880px)',
    marginInline: 'auto',
    display: 'grid',
    gap: tokens.spacingVerticalXL,
    ...shorthands.padding(tokens.spacingVerticalXXL, tokens.spacingHorizontalXL)
  },
  header: {
    display: 'grid',
    gap: tokens.spacingVerticalS
  },
  title: {
    margin: 0,
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800
  },
  card: {
    display: 'grid',
    gap: tokens.spacingVerticalL,
    backgroundColor: glassTokens.surface,
    backdropFilter: glassTokens.blur,
    boxShadow: glassTokens.shadow,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    ...shorthands.padding(tokens.spacingVerticalXXL, tokens.spacingHorizontalXXL)
  },
  section: {
    display: 'grid',
    gap: tokens.spacingVerticalS
  },
  sectionTitle: {
    margin: 0
  },
  links: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalL
  }
});

export function PrivacyPage() {
  const styles = useStyles();
  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <Text as="h1" className={styles.title}>Privacy notice</Text>
        <Text>CVS Garage limited pilot · Effective 3 October 2026</Text>
      </header>
      <Card className={styles.card}>
        <section className={styles.section}>
          <Text as="h2" size={500} weight="semibold" className={styles.sectionTitle}>Information we use</Text>
          <Text>
            Google sign-in supplies a verified email address, name, and optional profile
            image. Approved members may add a department, batch or year, bio, skills,
            project and event activity, ideas, discussions, and permitted uploads.
          </Text>
        </section>
        <section className={styles.section}>
          <Text as="h2" size={500} weight="semibold" className={styles.sectionTitle}>Why we use it</Text>
          <Text>
            Information is used only to operate the college innovation pilot, enforce
            access and moderation rules, attribute contributions, and maintain security
            and audit records. CVS Garage does not request access to Google Drive,
            contacts, mail, or other sensitive Google services.
          </Text>
        </section>
        <section className={styles.section}>
          <Text as="h2" size={500} weight="semibold" className={styles.sectionTitle}>Hosting and retention</Text>
          <Text>
            The application runs on Render and uses Supabase for authentication,
            database storage, realtime updates, and files. Administrators can suspend
            access immediately. Approved deletion requests anonymize personal profile
            fields while preserving non-personal community records where necessary for
            discussion and project integrity.
          </Text>
        </section>
        <section className={styles.section}>
          <Text as="h2" size={500} weight="semibold" className={styles.sectionTitle}>Your choices</Text>
          <Text>
            You can sign out at any time and ask a portal administrator to correct,
            suspend, or anonymize your pilot profile. Do not upload confidential,
            regulated, or real student records during the free-tier pilot.
          </Text>
        </section>
        <nav className={styles.links} aria-label="Legal pages">
          <Link to="/terms">Terms of use</Link>
          <Link to="/">Return to CVS Garage</Link>
        </nav>
      </Card>
    </article>
  );
}

export function TermsPage() {
  const styles = useStyles();
  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <Text as="h1" className={styles.title}>Terms of use</Text>
        <Text>CVS Garage limited pilot · Effective 3 October 2026</Text>
      </header>
      <Card className={styles.card}>
        <section className={styles.section}>
          <Text as="h2" size={500} weight="semibold" className={styles.sectionTitle}>Pilot access</Text>
          <Text>
            CVS Garage is an experimental college innovation portal. Google sign-in
            verifies identity, but an administrator must approve every account before
            service workspaces become available. Access may be suspended when required
            for safety, moderation, or pilot operations.
          </Text>
        </section>
        <section className={styles.section}>
          <Text as="h2" size={500} weight="semibold" className={styles.sectionTitle}>Acceptable use</Text>
          <Text>
            Use the portal for legitimate academic, project, event, mentoring, and
            community activity. Do not impersonate others, expose private student data,
            upload malware or prohibited files, evade access controls, harass members,
            or submit content you do not have the right to share.
          </Text>
        </section>
        <section className={styles.section}>
          <Text as="h2" size={500} weight="semibold" className={styles.sectionTitle}>Content and moderation</Text>
          <Text>
            You remain responsible for content you submit. Moderators and administrators
            may review, restrict, or remove content that violates pilot rules. Uploaded
            files are subject to type and size limits, and protected attachments use
            short-lived access links.
          </Text>
        </section>
        <section className={styles.section}>
          <Text as="h2" size={500} weight="semibold" className={styles.sectionTitle}>Availability</Text>
          <Text>
            The pilot uses free hosting tiers and may experience cold starts, limits, or
            interruptions. Do not rely on it as the sole record for deadlines,
            attendance, grades, credentials, or other official college decisions.
          </Text>
        </section>
        <nav className={styles.links} aria-label="Legal pages">
          <Link to="/privacy">Privacy notice</Link>
          <Link to="/">Return to CVS Garage</Link>
        </nav>
      </Card>
    </article>
  );
}
