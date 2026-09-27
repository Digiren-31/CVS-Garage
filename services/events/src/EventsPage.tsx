import {
  Badge,
  Button,
  Card,
  CardHeader,
  Dropdown,
  Field,
  Input,
  Option,
  ProgressBar,
  Text,
  Title3,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../../../packages/api-client/src';
import type { Event } from '../../../packages/contracts/src';
import {
  CardGrid,
  MetricCard,
  MetricGrid,
  Panel,
  ServicePage,
  StatePanel,
  StatusBadge
} from '../../../packages/ui/src';

const useStyles = makeStyles({
  toolbar: {
    display: 'grid',
    gridTemplateColumns: 'minmax(min(100%, 320px), 2fr) repeat(2, minmax(160px, 1fr))',
    alignItems: 'end',
    gap: tokens.spacingHorizontalM,
    '@media (max-width: 760px)': {
      gridTemplateColumns: '1fr'
    }
  },
  search: {
    display: 'flex',
    gap: tokens.spacingHorizontalS
  },
  searchInput: {
    flexGrow: 1
  },
  cardBody: {
    display: 'grid',
    gap: tokens.spacingVerticalS
  },
  cardMeta: {
    color: tokens.colorNeutralForeground2
  },
  badgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap'
  },
  detail: {
    display: 'grid',
    gap: tokens.spacingVerticalL
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
    gap: tokens.spacingHorizontalL
  },
  detailBlock: {
    display: 'grid',
    alignContent: 'start',
    gap: tokens.spacingVerticalXS
  },
  schedule: {
    display: 'grid',
    gap: tokens.spacingVerticalS,
    ...shorthands.margin(0),
    ...shorthands.padding(0),
    listStyleType: 'none'
  },
  scheduleItem: {
    display: 'grid',
    gap: tokens.spacingVerticalXXS,
    ...shorthands.padding(tokens.spacingVerticalS, 0),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2)
  },
  capacity: {
    display: 'grid',
    gap: tokens.spacingVerticalXS
  },
  actionArea: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap'
  },
  actionMessage: {
    color: tokens.colorNeutralForeground2
  },
  actionError: {
    color: tokens.colorPaletteRedForeground1
  }
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function isRegistrationOpen(event: Event) {
  return (
    event.status === 'Published' &&
    new Date(event.registrationEndsAt).getTime() >= Date.now() &&
    new Date(event.startsAt).getTime() > Date.now() &&
    event.registrationCount < event.capacity
  );
}

function registrationAvailability(event: Event) {
  if (event.status !== 'Published') {
    return 'Registration unavailable';
  }
  if (new Date(event.registrationEndsAt).getTime() < Date.now()) {
    return 'Registration closed';
  }
  if (new Date(event.startsAt).getTime() <= Date.now()) {
    return 'Event has started';
  }
  if (event.registrationCount >= event.capacity) {
    return 'Event full';
  }
  return `${event.capacity - event.registrationCount} spots available`;
}

export function EventsPage() {
  const styles = useStyles();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [mode, setMode] = useState('All');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  const loadEvents = useCallback(async (query = '') => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await api.events.list(query));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Events could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const categories = useMemo(
    () => Array.from(new Set(events.map((event) => event.category))).sort(),
    [events]
  );

  const visibleEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          (category === 'All' || event.category === category) &&
          (mode === 'All' || event.mode === mode)
      ),
    [category, events, mode]
  );

  const upcomingCount = events.filter(
    (event) => new Date(event.endsAt).getTime() >= Date.now()
  ).length;
  const openCount = events.filter(
    (event) =>
      event.status === 'Published' &&
      new Date(event.registrationEndsAt).getTime() >= Date.now() &&
      event.registrationCount < event.capacity
  ).length;
  const registeredCount = events.filter((event) => event.currentUserRegistration).length;

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSelectedEvent(null);
    await loadEvents(searchQuery);
  }

  async function showDetails(eventId: string) {
    setDetailLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      setSelectedEvent(await api.events.get(eventId));
    } catch (detailError) {
      setActionError(
        detailError instanceof Error ? detailError.message : 'Event details could not be loaded.'
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function refreshEvent(eventId: string) {
    const [detail, refreshedEvents] = await Promise.all([
      api.events.get(eventId),
      api.events.list(searchQuery)
    ]);
    setSelectedEvent(detail);
    setEvents(refreshedEvents);
  }

  async function register(event: Event) {
    setBusyEventId(event.id);
    setActionError(null);
    setActionMessage(null);
    try {
      const registration = await api.events.register(event.id);
      await refreshEvent(event.id);
      setActionMessage(
        registration.status === 'Waitlisted'
          ? `You joined the waitlist for ${event.title}.`
          : `You are registered for ${event.title}.`
      );
    } catch (registrationError) {
      setActionError(
        registrationError instanceof Error
          ? registrationError.message
          : 'Registration could not be completed.'
      );
    } finally {
      setBusyEventId(null);
    }
  }

  async function cancelRegistration(event: Event) {
    setBusyEventId(event.id);
    setActionError(null);
    setActionMessage(null);
    try {
      await api.events.cancelRegistration(event.id);
      await refreshEvent(event.id);
      setActionMessage(`Your registration for ${event.title} was cancelled.`);
    } catch (cancellationError) {
      setActionError(
        cancellationError instanceof Error
          ? cancellationError.message
          : 'The registration could not be cancelled.'
      );
    } finally {
      setBusyEventId(null);
    }
  }

  if (loading) {
    return <StatePanel state="loading" message="Loading campus events" />;
  }

  if (error) {
    return (
      <StatePanel
        state="error"
        title="Events are unavailable"
        message={error}
        onRetry={() => void loadEvents(searchQuery)}
      />
    );
  }

  return (
    <ServicePage
      area="events"
      title="Discover campus events"
      description="Find workshops, competitions, showcases, and community sessions. Review the schedule and reserve your place from one workspace."
    >
      <MetricGrid>
        <MetricCard label="Events found" value={events.length} detail="For the current search" />
        <MetricCard label="Upcoming" value={upcomingCount} detail="Still on the calendar" />
        <MetricCard label="Open registration" value={openCount} detail="With space available" />
        <MetricCard label="Your registrations" value={registeredCount} detail="Active reservations" />
      </MetricGrid>

      <Panel>
        <div className={styles.toolbar}>
          <Field label="Search events">
            <form className={styles.search} role="search" onSubmit={submitSearch}>
              <Input
                className={styles.searchInput}
                type="search"
                aria-label="Search events"
                value={searchQuery}
                placeholder="Search title, topic, organizer, or venue"
                onChange={(_, data) => setSearchQuery(data.value)}
              />
              <Button appearance="primary" type="submit">
                Search
              </Button>
            </form>
          </Field>
          <Field label="Category">
            <Dropdown
              aria-label="Filter events by category"
              value={category}
              selectedOptions={[category]}
              onOptionSelect={(_, data) => setCategory(data.optionValue || 'All')}
            >
              <Option value="All">All categories</Option>
              {categories.map((option) => (
                <Option key={option} value={option}>
                  {option}
                </Option>
              ))}
            </Dropdown>
          </Field>
          <Field label="Format">
            <Dropdown
              aria-label="Filter events by format"
              value={mode}
              selectedOptions={[mode]}
              onOptionSelect={(_, data) => setMode(data.optionValue || 'All')}
            >
              <Option value="All">All formats</Option>
              <Option value="Online">Online</Option>
              <Option value="Offline">Offline</Option>
              <Option value="Hybrid">Hybrid</Option>
            </Dropdown>
          </Field>
        </div>
      </Panel>

      {visibleEvents.length === 0 ? (
        <StatePanel
          state="empty"
          title="No events match these filters"
          message="Try another search, category, or format."
        />
      ) : (
        <CardGrid>
          {visibleEvents.map((event) => (
            <Card key={event.id}>
              <CardHeader
                header={<Text weight="semibold">{event.title}</Text>}
                description={<Text>{event.organizerName}</Text>}
                action={<StatusBadge status={event.status} />}
              />
              <div className={styles.cardBody}>
                <Text>{event.summary}</Text>
                <Text className={styles.cardMeta}>
                  {formatDateTime(event.startsAt)} · {event.venue}
                </Text>
                <div className={styles.badgeRow} aria-label={`${event.title} tags`}>
                  <Badge appearance="outline">{event.category}</Badge>
                  <Badge appearance="outline">{event.mode}</Badge>
                  {event.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} appearance="tint">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className={styles.cardFooter}>
                <Text>{registrationAvailability(event)}</Text>
                <Button
                  appearance="secondary"
                  aria-label={`View details for ${event.title}`}
                  onClick={() => void showDetails(event.id)}
                >
                  View details
                </Button>
              </div>
            </Card>
          ))}
        </CardGrid>
      )}

      {detailLoading ? <StatePanel state="loading" message="Loading event details" /> : null}

      {selectedEvent && !detailLoading ? (
        <Panel>
          <section className={styles.detail} aria-labelledby="event-detail-heading">
            <div className={styles.detailHeader}>
              <div>
                <Title3 as="h2" id="event-detail-heading">
                  {selectedEvent.title}
                </Title3>
                <Text block>{selectedEvent.description}</Text>
              </div>
              <StatusBadge status={selectedEvent.status} />
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailBlock}>
                <Text weight="semibold">When and where</Text>
                <Text>{formatDateTime(selectedEvent.startsAt)}</Text>
                <Text>Ends {formatDateTime(selectedEvent.endsAt)}</Text>
                <Text>{selectedEvent.venue}</Text>
                <Text>{selectedEvent.mode}</Text>
              </div>
              <div className={styles.capacity}>
                <Text weight="semibold">Capacity</Text>
                <ProgressBar
                  aria-label={`${selectedEvent.registrationCount} of ${selectedEvent.capacity} places reserved`}
                  value={
                    selectedEvent.capacity === 0
                      ? 0
                      : selectedEvent.registrationCount / selectedEvent.capacity
                  }
                />
                <Text>
                  {selectedEvent.registrationCount} of {selectedEvent.capacity} places reserved
                </Text>
                <Text>
                  Registration ends {formatDateTime(selectedEvent.registrationEndsAt)}
                </Text>
              </div>
              <div className={styles.detailBlock}>
                <Text weight="semibold">Schedule</Text>
                {selectedEvent.schedule.length === 0 ? (
                  <Text>The detailed schedule will be published soon.</Text>
                ) : (
                  <ol className={styles.schedule}>
                    {selectedEvent.schedule.map((item) => (
                      <li className={styles.scheduleItem} key={item.id}>
                        <Text weight="semibold">{item.title}</Text>
                        <Text>
                          {formatDateTime(item.startsAt)}–{formatDateTime(item.endsAt)}
                        </Text>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            <div className={styles.actionArea}>
              {selectedEvent.currentUserRegistration ? (
                <>
                  <StatusBadge status={selectedEvent.currentUserRegistration.status} />
                  <Button
                    appearance="secondary"
                    disabled={busyEventId === selectedEvent.id}
                    onClick={() => void cancelRegistration(selectedEvent)}
                  >
                    {busyEventId === selectedEvent.id ? 'Cancelling…' : 'Cancel registration'}
                  </Button>
                </>
              ) : (
                <Button
                  appearance="primary"
                  disabled={
                    busyEventId === selectedEvent.id ||
                    !isRegistrationOpen(selectedEvent)
                  }
                  onClick={() => void register(selectedEvent)}
                >
                  {busyEventId === selectedEvent.id ? 'Registering…' : 'Register'}
                </Button>
              )}
              {actionMessage ? (
                <Text className={styles.actionMessage} role="status">
                  {actionMessage}
                </Text>
              ) : null}
              {actionError ? (
                <Text className={styles.actionError} role="alert">
                  {actionError}
                </Text>
              ) : null}
            </div>
          </section>
        </Panel>
      ) : null}

      {actionError && !selectedEvent ? (
        <Text className={styles.actionError} role="alert">
          {actionError}
        </Text>
      ) : null}
    </ServicePage>
  );
}
