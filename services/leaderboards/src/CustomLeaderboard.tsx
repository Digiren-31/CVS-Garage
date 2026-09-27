import {
  Avatar,
  Badge,
  Button,
  Label,
  Select,
  Text,
  Title3,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import { useCallback, useId, useMemo, useState } from 'react';
import type {
  LeaderboardEntry,
  LeaderboardResponse
} from '../../../packages/contracts/src';
import { StatePanel } from '../../../packages/ui/src';

type StarFilter = 'all' | '1' | '2' | '3' | '4' | '5';

interface LeaderboardFilters {
  eventId: string;
  department: string;
  academicYear: string;
  minimumStarRating: StarFilter;
}

export interface CustomLeaderboardProps {
  entries: readonly LeaderboardEntry[];
  filterOptions: LeaderboardResponse['filters'];
}

const DEFAULT_FILTERS: LeaderboardFilters = {
  eventId: 'all',
  department: 'all',
  academicYear: 'all',
  minimumStarRating: 'all'
};

const BREAKDOWN_LABELS: Record<string, string> = {
  posts: 'Posts',
  replies: 'Replies',
  acceptedAnswers: 'Accepted answers',
  upvotesReceived: 'Upvotes received'
};

const useStyles = makeStyles({
  section: {
    display: 'grid',
    gap: tokens.spacingVerticalL
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap'
  },
  secondaryText: {
    color: tokens.colorNeutralForeground2
  },
  filters: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
    gap: tokens.spacingHorizontalM,
    ...shorthands.padding(tokens.spacingVerticalL),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    backgroundColor: tokens.colorNeutralBackground1
  },
  field: {
    display: 'grid',
    alignContent: 'start',
    gap: tokens.spacingVerticalXS
  },
  resetField: {
    display: 'flex',
    alignItems: 'flex-end'
  },
  resultStatus: {
    minHeight: tokens.lineHeightBase300
  },
  tableScroller: {
    maxWidth: '100%',
    overflowX: 'auto',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    backgroundColor: tokens.colorNeutralBackground1
  },
  table: {
    width: '100%',
    minWidth: '760px',
    borderCollapse: 'collapse'
  },
  caption: {
    textAlign: 'left',
    color: tokens.colorNeutralForeground2,
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM)
  },
  headerCell: {
    textAlign: 'left',
    backgroundColor: tokens.colorNeutralBackground2,
    fontWeight: tokens.fontWeightSemibold,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2)
  },
  numericHeader: {
    textAlign: 'right'
  },
  cell: {
    verticalAlign: 'middle',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalM),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2)
  },
  numericCell: {
    textAlign: 'right',
    whiteSpace: 'nowrap'
  },
  member: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS
  },
  memberName: {
    minWidth: 0
  },
  breakdown: {
    color: tokens.colorNeutralForeground2,
    maxWidth: '32ch'
  },
  rank: {
    minWidth: '32px',
    justifyContent: 'center'
  }
});

export function CustomLeaderboard({
  entries,
  filterOptions
}: CustomLeaderboardProps) {
  const styles = useStyles();
  const id = useId();
  const [filters, setFilters] = useState<LeaderboardFilters>(DEFAULT_FILTERS);

  const filteredEntries = useMemo(() => {
    const minimumStars =
      filters.minimumStarRating === 'all'
        ? null
        : Number(filters.minimumStarRating);

    return entries.filter(
      (entry) =>
        (filters.eventId === 'all' || entry.eventIds.includes(filters.eventId)) &&
        (filters.department === 'all' || entry.department === filters.department) &&
        (filters.academicYear === 'all' ||
          entry.academicYear === filters.academicYear) &&
        (minimumStars === null || entry.starRating >= minimumStars)
    );
  }, [entries, filters]);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);
  const hasActiveFilters = Object.values(filters).some((value) => value !== 'all');

  return (
    <section aria-labelledby={`${id}-heading`} className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <Title3 as="h2" id={`${id}-heading`}>
            Explore the rankings
          </Title3>
          <Text block className={styles.secondaryText}>
            Filters only change which server-ranked rows are visible.
          </Text>
        </div>
      </div>

      <form
        className={styles.filters}
        aria-label="Leaderboard filters"
        onSubmit={(event) => event.preventDefault()}
      >
        <FilterSelect
          id={`${id}-event`}
          label="Event"
          value={filters.eventId}
          onChange={(eventId) => setFilters((current) => ({ ...current, eventId }))}
        >
          <option value="all">All events</option>
          {filterOptions.events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id={`${id}-department`}
          label="Department"
          value={filters.department}
          onChange={(department) =>
            setFilters((current) => ({ ...current, department }))
          }
        >
          <option value="all">All departments</option>
          {filterOptions.departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id={`${id}-year`}
          label="Academic year"
          value={filters.academicYear}
          onChange={(academicYear) =>
            setFilters((current) => ({ ...current, academicYear }))
          }
        >
          <option value="all">All academic years</option>
          {filterOptions.academicYears.map((academicYear) => (
            <option key={academicYear} value={academicYear}>
              {academicYear}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          id={`${id}-stars`}
          label="Minimum star rating"
          value={filters.minimumStarRating}
          onChange={(minimumStarRating) =>
            setFilters((current) => ({
              ...current,
              minimumStarRating: minimumStarRating as StarFilter
            }))
          }
        >
          <option value="all">All ratings</option>
          {[5, 4, 3, 2, 1].map((rating) => (
            <option key={rating} value={rating}>
              {rating}+ stars
            </option>
          ))}
        </FilterSelect>

        <div className={styles.resetField}>
          <Button
            type="button"
            appearance="secondary"
            disabled={!hasActiveFilters}
            onClick={resetFilters}
          >
            Reset filters
          </Button>
        </div>
      </form>

      <Text className={styles.resultStatus} aria-live="polite">
        {filteredEntries.length}{' '}
        {filteredEntries.length === 1 ? 'ranked contributor' : 'ranked contributors'}
      </Text>

      {filteredEntries.length === 0 ? (
        <StatePanel
          state="empty"
          title="No rankings match these filters"
          message="Reset one or more filters to see additional contributors."
          onRetry={hasActiveFilters ? resetFilters : undefined}
        />
      ) : (
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <caption className={styles.caption}>Leaderboard rankings</caption>
            <thead>
              <tr>
                <th scope="col" className={styles.headerCell}>
                  Rank
                </th>
                <th scope="col" className={styles.headerCell}>
                  Contributor
                </th>
                <th scope="col" className={styles.headerCell}>
                  Department
                </th>
                <th scope="col" className={styles.headerCell}>
                  Academic year
                </th>
                <th
                  scope="col"
                  className={`${styles.headerCell} ${styles.numericHeader}`}
                >
                  Score
                </th>
                <th
                  scope="col"
                  className={`${styles.headerCell} ${styles.numericHeader}`}
                >
                  Stars
                </th>
                <th scope="col" className={styles.headerCell}>
                  Contribution breakdown
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <LeaderboardRow key={entry.memberId} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <div className={styles.field}>
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {children}
      </Select>
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const styles = useStyles();
  const breakdown = Object.entries(entry.contributionBreakdown)
    .filter(([, points]) => points > 0)
    .map(([key, points]) => `${BREAKDOWN_LABELS[key] || key}: ${points}`)
    .join(', ');

  return (
    <tr>
      <td className={styles.cell}>
        <Badge
          className={styles.rank}
          appearance={entry.rank <= 3 ? 'filled' : 'outline'}
          color={entry.rank <= 3 ? 'brand' : 'informative'}
        >
          <span aria-label={`Rank ${entry.rank}`}>{entry.rank}</span>
        </Badge>
      </td>
      <th scope="row" className={styles.cell}>
        <div className={styles.member}>
          <Avatar
            name={entry.memberName}
            image={entry.avatarUrl ? { src: entry.avatarUrl } : undefined}
            size={40}
          />
          <Text weight="semibold" className={styles.memberName}>
            {entry.memberName}
          </Text>
        </div>
      </th>
      <td className={styles.cell}>{entry.department}</td>
      <td className={styles.cell}>{entry.academicYear}</td>
      <td className={`${styles.cell} ${styles.numericCell}`}>
        <Text weight="semibold">{entry.score}</Text>
      </td>
      <td className={`${styles.cell} ${styles.numericCell}`}>
        <Text aria-label={`${entry.starRating} out of 5 stars`}>
          {entry.starRating} / 5 ★
        </Text>
      </td>
      <td className={`${styles.cell} ${styles.breakdown}`}>
        {breakdown || 'No scored contributions'}
      </td>
    </tr>
  );
}
