import {
  Badge,
  Button,
  Card,
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
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useHref, useLinkClickHandler, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../../packages/api-client/src';
import type { Event } from '../../../packages/contracts/src';
import {
  CardGrid,
  MetricCard,
  MetricGrid,
  Panel,
  ServicePage,
  StatePanel,
  StatusBadge,
  glassTokens
} from '../../../packages/ui/src';

const useStyles = makeStyles({
  toolbar: {
    display: 'grid',
    minWidth: 0,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
    alignItems: 'end',
    gap: tokens.spacingHorizontalM,
    '& > *': {
      minWidth: 0
    }
  },
  field: {
    minWidth: 0,
    maxWidth: '100%',
    gridTemplateColumns: 'minmax(0, 1fr)'
  },
  control: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%'
  },
  search: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    minWidth: 0,
    gap: tokens.spacingHorizontalS,
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr'
    }
  },
  searchInput: {
    minWidth: 0,
    width: '100%'
  },
  section: {
    minWidth: 0
  },
  sectionHeading: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalXS,
    marginBottom: tokens.spacingVerticalM
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    height: '100%',
    gap: tokens.spacingVerticalM,
    overflowWrap: 'anywhere',
    backgroundColor: glassTokens.surface,
    backdropFilter: glassTokens.blur,
    WebkitBackdropFilter: glassTokens.blur,
    boxShadow: glassTokens.shadow,
    ...shorthands.border('1px', 'solid', glassTokens.border),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    ...shorthands.padding(tokens.spacingVerticalL)
  },
  cardHeading: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalS
  },
  cardTitle: {
    marginBlock: 0,
    overflowWrap: 'anywhere'
  },
  cardBody: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalS
  },
  cardMeta: {
    color: tokens.colorNeutralForeground2
  },
  badgeRow: {
    display: 'flex',
    minWidth: 0,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS
  },
  tag: {
    minWidth: 0,
    maxWidth: '100%',
    height: 'auto',
    minHeight: tokens.lineHeightBase400,
    whiteSpace: 'normal',
    overflowWrap: 'anywhere',
    lineHeight: tokens.lineHeightBase200,
    ...shorthands.padding(tokens.spacingVerticalXXS, tokens.spacingHorizontalS)
  },
  cardFooter: {
    display: 'flex',
    minWidth: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    marginTop: 'auto',
    paddingTop: tokens.spacingVerticalM,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2)
  },
  detail: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalL,
    overflowWrap: 'anywhere',
    '& > *': {
      minWidth: 0
    }
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
    minWidth: 0,
    '& > *': {
      minWidth: 0
    }
  },
  detailGrid: {
    display: 'grid',
    minWidth: 0,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
    gap: tokens.spacingHorizontalL
  },
  detailBlock: {
    display: 'grid',
    minWidth: 0,
    alignContent: 'start',
    gap: tokens.spacingVerticalXS
  },
  schedule: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalS,
    ...shorthands.margin(0),
    ...shorthands.padding(0),
    listStyleType: 'none'
  },
  scheduleItem: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalXXS,
    ...shorthands.padding(tokens.spacingVerticalS, 0),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2)
  },
  capacity: {
    display: 'grid',
    minWidth: 0,
    alignContent: 'start',
    gap: tokens.spacingVerticalXS
  },
  actionArea: {
    display: 'flex',
    minWidth: 0,
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

function EventNavigationLink({
  to,
  label,
  children
}: {
  to: string;
  label?: string;
  children: string;
}) {
  const href = useHref(to);
  const onClick = useLinkClickHandler<HTMLAnchorElement>(to);
  return (
    <Button as="a" href={href} onClick={onClick} appearance="secondary" aria-label={label}>
      {children}
    </Button>
  );
}

export function EventsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  return eventId
    ? <EventDetailPage key={eventId} eventId={eventId} />
    : <EventDirectoryPage />;
}

function EventDirectoryPage() {
  const styles = useStyles();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const submittedQuery = (searchParams.get('q') || '').trim();
  const category = searchParams.get('category') || 'All';
  const requestedMode = searchParams.get('mode') || 'All';
  const mode = ['All', 'Online', 'Offline', 'Hybrid'].includes(requestedMode) ? requestedMode : 'All';
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState(submittedQuery);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSearchQuery(submittedQuery);
  }, [submittedQuery]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const nextEvents = await api.events.list(submittedQuery);
        if (active) setEvents(nextEvents);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Events could not be loaded.');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [submittedQuery, reload]);

  const categories = useMemo(
    () => Array.from(new Set([
      ...events.map((event) => event.category),
      ...(category === 'All' ? [] : [category])
    ])).sort(),
    [events, category]
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

  function updateFilter(name: 'q' | 'category' | 'mode', value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || (name !== 'q' && value === 'All')) {
      next.delete(name);
    } else {
      next.set(name, value);
    }
    setSearchParams(next);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = searchQuery.trim();
    if (normalizedQuery === submittedQuery) setReload((value) => value + 1);
    updateFilter('q', normalizedQuery);
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
        onRetry={() => setReload((value) => value + 1)}
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
          <Field className={styles.field} label="Search events">
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
          <Field className={styles.field} label="Category">
            <Dropdown
              className={styles.control}
              button={{ className: styles.control }}
              aria-label="Filter events by category"
              value={category}
              selectedOptions={[category]}
              onOptionSelect={(_, data) => updateFilter('category', data.optionValue || 'All')}
            >
              <Option value="All">All categories</Option>
              {categories.map((option) => (
                <Option key={option} value={option}>
                  {option}
                </Option>
              ))}
            </Dropdown>
          </Field>
          <Field className={styles.field} label="Format">
            <Dropdown
              className={styles.control}
              button={{ className: styles.control }}
              aria-label="Filter events by format"
              value={mode}
              selectedOptions={[mode]}
              onOptionSelect={(_, data) => updateFilter('mode', data.optionValue || 'All')}
            >
              <Option value="All">All formats</Option>
              <Option value="Online">Online</Option>
              <Option value="Offline">Offline</Option>
              <Option value="Hybrid">Hybrid</Option>
            </Dropdown>
          </Field>
        </div>
      </Panel>

      <section className={styles.section} aria-labelledby="event-directory-heading">
        <div className={styles.sectionHeading}>
          <Text as="h2" id="event-directory-heading" size={500} weight="semibold">
            Event directory
          </Text>
          <Text className={styles.cardMeta}>
            {visibleEvents.length} {visibleEvents.length === 1 ? 'event' : 'events'} shown
          </Text>
        </div>
        {visibleEvents.length === 0 ? (
          <StatePanel
            state="empty"
            title="No events match these filters"
            message="Try another search, category, or format."
          />
        ) : (
          <CardGrid>
            {visibleEvents.map((event) => (
              <Card
                key={event.id}
                className={styles.card}
                role="article"
                aria-labelledby={`event-title-${event.id}`}
              >
                <div className={styles.cardHeading}>
                  <Text
                    as="h3"
                    id={`event-title-${event.id}`}
                    size={400}
                    weight="semibold"
                    className={styles.cardTitle}
                  >
                    {event.title}
                  </Text>
                  <div className={styles.badgeRow}>
                    <Text size={200} className={styles.cardMeta}>{event.organizerName}</Text>
                    <StatusBadge status={event.status} />
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <Text>{event.summary}</Text>
                  <Text size={200} className={styles.cardMeta}>
                    {formatDateTime(event.startsAt)} · {event.venue}
                  </Text>
                  <div className={styles.badgeRow} aria-label={`${event.title} tags`}>
                    <Badge className={styles.tag} appearance="outline">{event.category}</Badge>
                    <Badge className={styles.tag} appearance="outline">{event.mode}</Badge>
                    {event.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} className={styles.tag} appearance="tint">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <Text size={200} className={styles.cardMeta}>{registrationAvailability(event)}</Text>
                  <EventNavigationLink
                    to={`/events/${encodeURIComponent(event.id)}${location.search}`}
                    label={`View details for ${event.title}`}
                  >
                    View details
                  </EventNavigationLink>
                </div>
              </Card>
            ))}
          </CardGrid>
        )}
      </section>
    </ServicePage>
  );
}

function EventDetailPage({ eventId }: { eventId: string }) {
  const styles = useStyles();
  const location = useLocation();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    setLoading(true);
    setError(null);
    setSelectedEvent(null);
    setActionError(null);
    void (async () => {
      try {
        const event = await api.events.get(eventId);
        if (active) setSelectedEvent(event);
      } catch (requestError) {
        if (active) {
          setError({
            message: requestError instanceof Error ? requestError.message : 'Event details could not be loaded.',
            notFound: typeof requestError === 'object' && requestError !== null &&
              'status' in requestError && requestError.status === 404
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [eventId, reload]);

  async function refreshEvent(id: string) {
    const detail = await api.events.get(id);
    if (mounted.current) setSelectedEvent(detail);
  }

  async function register(event: Event) {
    setBusyEventId(event.id);
    setActionError(null);
    setActionMessage(null);
    try {
      const registration = await api.events.register(event.id);
      if (!mounted.current) return;
      await refreshEvent(event.id);
      if (mounted.current) {
        setActionMessage(
          registration.status === 'Waitlisted'
            ? `You joined the waitlist for ${event.title}.`
            : `You are registered for ${event.title}.`
        );
      }
    } catch (registrationError) {
      if (mounted.current) {
        setActionError(
          registrationError instanceof Error
            ? registrationError.message
            : 'Registration could not be completed.'
        );
      }
    } finally {
      if (mounted.current) setBusyEventId(null);
    }
  }

  async function cancelRegistration(event: Event) {
    setBusyEventId(event.id);
    setActionError(null);
    setActionMessage(null);
    try {
      await api.events.cancelRegistration(event.id);
      if (!mounted.current) return;
      await refreshEvent(event.id);
      if (mounted.current) {
        setActionMessage(`Your registration for ${event.title} was cancelled.`);
      }
    } catch (cancellationError) {
      if (mounted.current) {
        setActionError(
          cancellationError instanceof Error
            ? cancellationError.message
            : 'The registration could not be cancelled.'
        );
      }
    } finally {
      if (mounted.current) setBusyEventId(null);
    }
  }

  return (
    <ServicePage
      area="events"
      title={selectedEvent?.title || 'Event details'}
      description={selectedEvent?.summary || 'Review the schedule, venue, and registration for this event.'}
      actions={
        <EventNavigationLink to={`/events${location.search}`}>
          Back to events
        </EventNavigationLink>
      }
    >
      {loading ? (
        <StatePanel state="loading" message="Loading event details" />
      ) : error || !selectedEvent ? (
        <StatePanel
          state="error"
          title={error?.notFound ? 'Event not found' : 'Event details unavailable'}
          message={error?.message || 'This event could not be loaded.'}
          onRetry={() => setReload((value) => value + 1)}
        />
      ) : (
        <Panel>
          <section className={styles.detail} aria-labelledby="event-detail-heading">
            <div className={styles.detailHeader}>
              <div>
                <Title3 as="h2" id="event-detail-heading">
                  Event information
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
                <>
                  <Text className={styles.actionError} role="alert">{actionError}</Text>
                  <Button appearance="subtle" onClick={() => setReload((value) => value + 1)}>
                    Refresh event details
                  </Button>
                </>
              ) : null}
            </div>
          </section>
        </Panel>
      )}
    </ServicePage>
  );
}
