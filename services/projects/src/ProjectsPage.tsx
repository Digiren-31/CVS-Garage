import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Label,
  Link,
  ProgressBar,
  Select,
  Text,
  Textarea,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent
} from 'react';
import {
  useHref,
  useLinkClickHandler,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams
} from 'react-router-dom';
import { api } from '../../../packages/api-client/src';
import type {
  CreateProjectInput,
  Member,
  Project,
  ProjectMilestone
} from '../../../packages/contracts/src';
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

type ProjectStatusFilter = Project['status'] | 'all';
type MilestoneStatus = ProjectMilestone['status'];
type ProjectForm = {
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string;
};
type ProjectFormErrors = Partial<Record<keyof ProjectForm, string>>;

const EMPTY_FORM: ProjectForm = {
  name: '',
  tagline: '',
  description: '',
  category: '',
  tags: ''
};

const PROJECT_STATUSES: Array<{ value: ProjectStatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'showcase', label: 'Showcase' }
];

const MILESTONE_STATUSES: Array<{ value: MilestoneStatus; label: string }> = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' }
];

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
  searchForm: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    minWidth: 0,
    alignItems: 'end',
    gap: tokens.spacingHorizontalS,
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr'
    }
  },
  field: {
    display: 'grid',
    gap: tokens.spacingVerticalXS,
    minWidth: 0
  },
  grow: {
    flexGrow: 1,
    minWidth: 0
  },
  control: {
    width: '100%',
    minWidth: 0,
    maxWidth: '100%'
  },
  sectionHeading: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    marginBottom: tokens.spacingVerticalM,
    minWidth: 0,
    '& > *': {
      minWidth: 0
    }
  },
  secondaryText: {
    color: tokens.colorNeutralForeground2
  },
  card: {
    minWidth: 0,
    height: '100%',
    backgroundColor: glassTokens.surface,
    backdropFilter: glassTokens.blur,
    WebkitBackdropFilter: glassTokens.blur,
    boxShadow: glassTokens.shadow,
    overflowWrap: 'anywhere',
    ...shorthands.border('1px', 'solid', glassTokens.border),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    ...shorthands.padding(tokens.spacingVerticalL)
  },
  coverImage: {
    width: '100%',
    height: '160px',
    objectFit: 'cover',
    borderRadius: tokens.borderRadiusMedium
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minWidth: 0,
    gap: tokens.spacingVerticalM,
    '& > *': {
      minWidth: 0
    }
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
  cardMeta: {
    display: 'flex',
    minWidth: 0,
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap'
  },
  tags: {
    display: 'flex',
    minWidth: 0,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    '& > li': {
      display: 'flex',
      minWidth: 0,
      maxWidth: '100%'
    }
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
  progress: {
    display: 'grid',
    minWidth: 0,
    marginTop: 'auto',
    gap: tokens.spacingVerticalXS
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    minWidth: 0,
    paddingTop: tokens.spacingVerticalM,
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2)
  },
  feedback: {
    minHeight: tokens.spacingVerticalL
  },
  error: {
    color: tokens.colorPaletteRedForeground1
  },
  detail: {
    display: 'grid',
    gap: tokens.spacingVerticalL,
    minWidth: 0,
    overflowWrap: 'anywhere',
    '& > *': {
      minWidth: 0
    }
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    minWidth: 0,
    '& > *': {
      minWidth: 0
    }
  },
  detailMeta: {
    display: 'flex',
    minWidth: 0,
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM
  },
  detailSection: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalS
  },
  teamList: {
    display: 'flex',
    minWidth: 0,
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    listStyleType: 'none',
    margin: 0,
    padding: 0,
    '& > li': {
      display: 'flex',
      minWidth: 0,
      maxWidth: '100%'
    }
  },
  milestones: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalM,
    listStyleType: 'none',
    margin: 0,
    padding: 0
  },
  milestone: {
    display: 'grid',
    minWidth: 0,
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
    gap: tokens.spacingHorizontalL,
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalM),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium)
  },
  milestoneCopy: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalXS
  },
  milestoneActions: {
    display: 'flex',
    minWidth: 0,
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
    '@media (max-width: 760px)': {
      alignItems: 'stretch',
      flexDirection: 'column'
    }
  },
  dialogForm: {
    display: 'grid',
    minWidth: 0
  },
  dialogSurface: {
    minWidth: 0,
    width: `min(640px, calc(100vw - ${tokens.spacingHorizontalL} * 2))`,
    maxWidth: '100%',
    maxHeight: `calc(100dvh - ${tokens.spacingVerticalL} * 2)`,
    overflowY: 'auto'
  },
  dialogBody: {
    minWidth: 0,
    overflowWrap: 'anywhere',
    '& > *': {
      minWidth: 0
    }
  },
  dialogActions: {
    display: 'flex',
    minWidth: 0,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS
  },
  formFields: {
    display: 'grid',
    minWidth: 0,
    gap: tokens.spacingVerticalM,
    marginTop: tokens.spacingVerticalM,
    '& > *': {
      minWidth: 0
    }
  },
  dialogError: {
    color: tokens.colorPaletteRedForeground1,
    marginTop: tokens.spacingVerticalM
  }
});

function formatStatus(status: string) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(`${date}T00:00:00`));
}

function isAdministrator(member: Member | null) {
  return Boolean(
    member &&
      member.status === 'active' &&
      (member.role === 'Admin' || member.roles.includes('Admin'))
  );
}

function validateProjectForm(form: ProjectForm): ProjectFormErrors {
  const errors: ProjectFormErrors = {};
  const name = form.name.trim();
  const tagline = form.tagline.trim();
  const description = form.description.trim();
  const category = form.category.trim();
  const tags = form.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (name.length < 3 || name.length > 100) {
    errors.name = 'Use between 3 and 100 characters.';
  }
  if (tagline.length < 10 || tagline.length > 180) {
    errors.tagline = 'Use between 10 and 180 characters.';
  }
  if (description.length < 20 || description.length > 2000) {
    errors.description = 'Use between 20 and 2,000 characters.';
  }
  if (category.length < 2 || category.length > 60) {
    errors.category = 'Use between 2 and 60 characters.';
  }

  const uniqueTags = new Set(tags.map((tag) => tag.toLocaleLowerCase()));
  if (tags.length < 1 || tags.length > 8) {
    errors.tags = 'Provide between 1 and 8 comma-separated tags.';
  } else if (tags.some((tag) => tag.length > 30)) {
    errors.tags = 'Keep every tag to 30 characters or fewer.';
  } else if (uniqueTags.size !== tags.length) {
    errors.tags = 'Remove duplicate tags.';
  }
  return errors;
}

function toProjectInput(form: ProjectForm, coverImageUrl?: string): CreateProjectInput {
  return {
    name: form.name.trim(),
    tagline: form.tagline.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    tags: form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    ...(coverImageUrl ? { coverImageUrl } : {})
  };
}

function ProjectNavigationLink({
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

export function ProjectsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return projectId
    ? <ProjectDetailPage key={projectId} projectId={projectId} />
    : <ProjectDirectoryPage />;
}

function ProjectDirectoryPage() {
  const styles = useStyles();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const submittedQuery = (searchParams.get('q') || '').trim();
  const statusFilter = PROJECT_STATUSES.find(
    (status) => status.value === searchParams.get('status')
  )?.value || 'all';
  const categoryFilter = searchParams.get('category') || 'all';
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [query, setQuery] = useState(submittedQuery);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<ProjectFormErrors>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    setQuery(submittedQuery);
  }, [submittedQuery]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [nextProjects, member] = await Promise.all([
          api.projects.list(submittedQuery),
          api.members.current()
        ]);
        if (active) {
          setProjects(nextProjects);
          setCurrentMember(member);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Projects could not be loaded.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [submittedQuery, reload]);

  const categories = useMemo(
    () => [...new Set([
      ...projects.map((project) => project.category),
      ...(categoryFilter === 'all' ? [] : [categoryFilter])
    ])].sort(),
    [projects, categoryFilter]
  );

  const filteredProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          (statusFilter === 'all' || project.status === statusFilter) &&
          (categoryFilter === 'all' || project.category === categoryFilter)
      ),
    [categoryFilter, projects, statusFilter]
  );

  const averageProgress =
    projects.length === 0
      ? 0
      : Math.round(
          projects.reduce((total, project) => total + project.progress, 0) / projects.length
        );
  const contributorCount = new Set(projects.flatMap((project) => project.memberIds)).size;

  function updateFilter(name: 'q' | 'status' | 'category', value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || (name !== 'q' && value === 'all')) {
      next.delete(name);
    } else {
      next.set(name, value);
    }
    setSearchParams(next);
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (normalizedQuery === submittedQuery) {
      setReload((value) => value + 1);
    }
    updateFilter('q', normalizedQuery);
  }

  function updateForm(field: keyof ProjectForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  }

  function closeDialog() {
    if (creating) {
      return;
    }
    setDialogOpen(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setCreateError(null);
    setCoverFile(null);
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateProjectForm(form);
    setFormErrors(nextErrors);
    setCreateError(null);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setCreating(true);
    let coverId: string | null = null;
    try {
      const cover = coverFile
        ? await api.media.upload(coverFile, 'project-cover')
        : null;
      coverId = cover?.id || null;
      const created = await api.projects.create(
        toProjectInput(form, cover?.url)
      );
      if (!mounted.current) return;
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setCoverFile(null);
      setFormErrors({});
      navigate(`/projects/${encodeURIComponent(created.id)}${location.search}`, {
        state: {
          createdProjectId: created.id,
          message: `${created.name} was added as a project proposal.`
        }
      });
    } catch (requestError) {
      if (coverId) {
        try {
          await api.media.remove(coverId);
        } catch (cleanupError) {
          console.error('The unused project cover could not be cleaned up.', cleanupError);
        }
      }
      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : 'The project proposal could not be submitted.'
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading && !currentMember) {
    return <StatePanel state="loading" message="Loading projects" />;
  }

  if (error || !currentMember) {
    return (
      <StatePanel
        state="error"
        message={error || 'Projects are not available right now.'}
        onRetry={() => setReload((value) => value + 1)}
      />
    );
  }

  return (
    <ServicePage
      area="projects"
      title="Turn ideas into working projects"
      description="Discover student work, follow delivery milestones, and propose the next campus collaboration."
      actions={
        <Button
          appearance="primary"
          aria-haspopup="dialog"
          aria-expanded={dialogOpen}
          onClick={() => setDialogOpen(true)}
        >
          Propose a project
        </Button>
      }
    >
      <MetricGrid>
        <MetricCard label="Total projects" value={projects.length} />
        <MetricCard
          label="Active projects"
          value={projects.filter((project) => project.status === 'active').length}
        />
        <MetricCard label="Contributors" value={contributorCount} />
        <MetricCard label="Average progress" value={`${averageProgress}%`} />
      </MetricGrid>

      <Panel>
        <div className={styles.toolbar}>
          <form role="search" className={styles.searchForm} onSubmit={search}>
            <div className={mergeClasses(styles.field, styles.grow)}>
              <Label htmlFor="project-search">Search projects</Label>
              <Input
                id="project-search"
                type="search"
                value={query}
                onChange={(_event, data) => setQuery(data.value)}
                placeholder="Name, description, category, or tag"
                className={styles.control}
              />
            </div>
            <Button type="submit" appearance="primary" disabled={loading}>
              Search
            </Button>
          </form>
          <div className={styles.field}>
            <Label htmlFor="project-status-filter">Filter by status</Label>
            <Select
              className={styles.control}
              id="project-status-filter"
              value={statusFilter}
              onChange={(_event, data) =>
                updateFilter('status', data.value)
              }
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>
          </div>
          <div className={styles.field}>
            <Label htmlFor="project-category-filter">Filter by category</Label>
            <Select
              className={styles.control}
              id="project-category-filter"
              value={categoryFilter}
              onChange={(_event, data) => updateFilter('category', data.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Panel>

      <section aria-labelledby="project-directory-heading">
        <div className={styles.sectionHeading}>
          <div>
            <Text as="h2" id="project-directory-heading" size={500} weight="semibold">
              Project directory
            </Text>
            <Text block className={styles.secondaryText}>
              {filteredProjects.length}{' '}
              {filteredProjects.length === 1 ? 'project' : 'projects'} shown
            </Text>
          </div>
        </div>

        {loading ? (
          <StatePanel state="loading" message="Searching projects" />
        ) : filteredProjects.length === 0 ? (
          <StatePanel
            state="empty"
            title="No projects match these filters"
            message="Try a broader search or choose a different status or category."
          />
        ) : (
          <CardGrid>
            {filteredProjects.map((project) => (
              <article key={project.id} aria-labelledby={`project-title-${project.id}`}>
                <Card className={styles.card}>
                  <div className={styles.cardBody}>
                    {project.coverImageUrl ? (
                      <img
                        className={styles.coverImage}
                        src={project.coverImageUrl}
                        alt=""
                      />
                    ) : null}
                    <div className={styles.cardHeading}>
                      <Text
                        as="h3"
                        id={`project-title-${project.id}`}
                        size={400}
                        weight="semibold"
                        className={styles.cardTitle}
                      >
                        {project.name}
                      </Text>
                      <div className={styles.cardMeta}>
                        <Text size={200} className={styles.secondaryText}>
                          {project.category}
                        </Text>
                        <StatusBadge status={formatStatus(project.status)} />
                      </div>
                    </div>
                    <Text>{project.tagline}</Text>
                    <ul className={styles.tags} aria-label={`Tags for ${project.name}`}>
                      {project.tags.map((tag) => (
                        <li key={tag}>
                          <Badge className={styles.tag} appearance="outline">{tag}</Badge>
                        </li>
                      ))}
                    </ul>
                    <div className={styles.progress}>
                      <div className={styles.progressLabel}>
                        <Text size={200} className={styles.secondaryText}>Progress</Text>
                        <Text size={200} weight="semibold">{project.progress}%</Text>
                      </div>
                      <ProgressBar
                        value={project.progress / 100}
                        aria-label={`${project.name} progress: ${project.progress}%`}
                      />
                    </div>
                    <div className={styles.cardFooter}>
                      <Text size={200} className={styles.secondaryText}>
                        {project.memberIds.length}{' '}
                        {project.memberIds.length === 1 ? 'team member' : 'team members'}
                      </Text>
                      <ProjectNavigationLink
                        to={`/projects/${encodeURIComponent(project.id)}${location.search}`}
                        label={`View ${project.name} details`}
                      >
                        View details
                      </ProjectNavigationLink>
                    </div>
                  </div>
                </Card>
              </article>
            ))}
          </CardGrid>
        )}
      </section>

      <Dialog
        open={dialogOpen}
        onOpenChange={(_event, data) => {
          if (!data.open) {
            closeDialog();
          }
        }}
      >
        <DialogSurface className={styles.dialogSurface} aria-describedby="project-proposal-description">
          <form className={styles.dialogForm} onSubmit={createProject} noValidate>
            <DialogBody className={styles.dialogBody}>
              <DialogTitle>Propose a project</DialogTitle>
              <DialogContent>
                <Text id="project-proposal-description" block>
                  Share a clear starting point. You will become the project leader while the
                  proposal is in planning.
                </Text>
                <div className={styles.formFields}>
                  <Field
                    label="Project name"
                    required
                    validationState={formErrors.name ? 'error' : 'none'}
                    validationMessage={formErrors.name}
                  >
                    <Input
                      value={form.name}
                      onChange={(_event, data) => updateForm('name', data.value)}
                      maxLength={100}
                    />
                  </Field>
                  <Field
                    label="Tagline"
                    required
                    validationState={formErrors.tagline ? 'error' : 'none'}
                    validationMessage={formErrors.tagline}
                  >
                    <Input
                      value={form.tagline}
                      onChange={(_event, data) => updateForm('tagline', data.value)}
                      maxLength={180}
                    />
                  </Field>
                  <Field
                    label="Description"
                    required
                    validationState={formErrors.description ? 'error' : 'none'}
                    validationMessage={formErrors.description}
                  >
                    <Textarea
                      value={form.description}
                      onChange={(_event, data) => updateForm('description', data.value)}
                      maxLength={2000}
                      resize="vertical"
                    />
                  </Field>
                  <Field
                    label="Category"
                    required
                    validationState={formErrors.category ? 'error' : 'none'}
                    validationMessage={formErrors.category}
                  >
                    <Input
                      value={form.category}
                      onChange={(_event, data) => updateForm('category', data.value)}
                      maxLength={60}
                    />
                  </Field>
                  <Field
                    label="Tags"
                    hint="Separate up to eight tags with commas."
                    required
                    validationState={formErrors.tags ? 'error' : 'none'}
                    validationMessage={formErrors.tags}
                  >
                    <Input
                      value={form.tags}
                      onChange={(_event, data) => updateForm('tags', data.value)}
                      placeholder="Accessibility, IoT, React"
                    />
                  </Field>
                  <Field
                    label="Project cover"
                    hint="Optional JPEG, PNG, WebP, GIF, or AVIF up to 5 MB."
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                      onChange={(event) => setCoverFile(event.target.files?.[0] || null)}
                    />
                  </Field>
                </div>
                {createError ? (
                  <Text role="alert" block className={styles.dialogError}>
                    {createError}
                  </Text>
                ) : null}
              </DialogContent>
              <DialogActions className={styles.dialogActions}>
                <Button type="button" appearance="secondary" onClick={closeDialog} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" appearance="primary" disabled={creating}>
                  {creating ? 'Submitting…' : 'Submit proposal'}
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>
    </ServicePage>
  );
}

function ProjectDetailPage({ projectId }: { projectId: string }) {
  const styles = useStyles();
  const location = useLocation();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, MilestoneStatus>>({});
  const [updatingMilestone, setUpdatingMilestone] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(() =>
    location.state?.createdProjectId === projectId && typeof location.state?.message === 'string'
      ? location.state.message
      : null
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    setLoading(true);
    setError(null);
    setSelectedProject(null);
    setCurrentMember(null);
    void (async () => {
      try {
        const [project, member] = await Promise.all([
          api.projects.get(projectId),
          api.members.current()
        ]);
        if (active) {
          setSelectedProject(project);
          setCurrentMember(member);
          setMilestoneDrafts(Object.fromEntries(
            project.milestones.map((milestone) => [milestone.id, milestone.status])
          ));
        }
      } catch (requestError) {
        if (active) {
          setError({
            message: requestError instanceof Error ? requestError.message : 'Project details could not be loaded.',
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
  }, [projectId, reload]);

  async function updateMilestone(milestone: ProjectMilestone) {
    if (!selectedProject) return;
    const status = milestoneDrafts[milestone.id] || milestone.status;
    setUpdatingMilestone(milestone.id);
    setActionMessage(null);
    setActionError(null);
    try {
      const updated = await api.projects.updateMilestone(selectedProject.id, milestone.id, status);
      if (!mounted.current) return;
      setSelectedProject(updated);
      setMilestoneDrafts(Object.fromEntries(
        updated.milestones.map((item) => [item.id, item.status])
      ));
      setActionMessage('Milestone status updated.');
    } catch (requestError) {
      if (mounted.current) {
        setActionError(
          requestError instanceof Error ? requestError.message : 'The milestone could not be updated.'
        );
      }
    } finally {
      if (mounted.current) setUpdatingMilestone(null);
    }
  }

  const canUpdateMilestones = selectedProject !== null && currentMember !== null &&
    (selectedProject.leaderId === currentMember.id || isAdministrator(currentMember));

  return (
    <ServicePage
      area="projects"
      title={selectedProject?.name || 'Project details'}
      description={selectedProject?.tagline || 'Review this project, its team, and delivery milestones.'}
      actions={
        <ProjectNavigationLink to={`/projects${location.search}`}>
          Back to projects
        </ProjectNavigationLink>
      }
    >
      {actionMessage ? <Text role="status">{actionMessage}</Text> : null}
      {actionError ? <Text role="alert" className={styles.error}>{actionError}</Text> : null}
      {loading ? (
        <StatePanel state="loading" message="Loading project details" />
      ) : error || !selectedProject ? (
        <StatePanel
          state="error"
          title={error?.notFound ? 'Project not found' : 'Project details unavailable'}
          message={error?.message || 'This project could not be loaded.'}
          onRetry={() => setReload((value) => value + 1)}
        />
      ) : (
        <Panel>
          <div className={styles.detail}>
            <div className={styles.detailMeta}>
              <StatusBadge status={formatStatus(selectedProject.status)} />
              <Text>{selectedProject.category}</Text>
              <Text>
                {selectedProject.memberIds.length}{' '}
                {selectedProject.memberIds.length === 1 ? 'team member' : 'team members'}
              </Text>
              {selectedProject.repositoryUrl ? (
                <Link href={selectedProject.repositoryUrl} target="_blank" rel="noreferrer">
                  Open repository
                </Link>
              ) : null}
            </div>
            <Text>{selectedProject.description}</Text>
            <ul className={styles.tags} aria-label={`Tags for ${selectedProject.name}`}>
              {selectedProject.tags.map((tag) => (
                <li key={tag}>
                  <Badge className={styles.tag} appearance="outline">{tag}</Badge>
                </li>
              ))}
            </ul>
            <div className={styles.progress}>
              <div className={styles.progressLabel}>
                <Text>Progress</Text>
                <Text weight="semibold">{selectedProject.progress}%</Text>
              </div>
              <ProgressBar
                value={selectedProject.progress / 100}
                aria-label={`${selectedProject.name} progress: ${selectedProject.progress}%`}
              />
            </div>
            <section className={styles.detailSection} aria-labelledby="project-team-heading">
              <Text id="project-team-heading" as="h2" size={500} weight="semibold">Team</Text>
              <ul className={styles.teamList}>
                {selectedProject.memberIds.map((memberId) => (
                  <li key={memberId}>
                    <Badge className={styles.tag} appearance="tint">
                      {memberId === selectedProject.leaderId ? `${memberId} · Leader` : memberId}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
            <section className={styles.detailSection} aria-labelledby="project-milestones-heading">
              <Text id="project-milestones-heading" as="h2" size={500} weight="semibold">Milestones</Text>
              {selectedProject.milestones.length === 0 ? (
                <Text block className={styles.secondaryText}>
                  Milestones will be added as this proposal moves into active delivery.
                </Text>
              ) : (
                <ul className={styles.milestones}>
                  {selectedProject.milestones.map((milestone) => (
                    <li key={milestone.id} className={styles.milestone}>
                      <div className={styles.milestoneCopy}>
                        <Text weight="semibold">{milestone.title}</Text>
                        <Text className={styles.secondaryText}>Due {formatDate(milestone.dueDate)}</Text>
                        {!canUpdateMilestones ? (
                          <StatusBadge status={formatStatus(milestone.status)} />
                        ) : null}
                      </div>
                      {canUpdateMilestones ? (
                        <div className={styles.milestoneActions}>
                          <div className={mergeClasses(styles.field, styles.grow)}>
                            <Label htmlFor={`milestone-status-${milestone.id}`}>Status</Label>
                            <Select
                              className={styles.control}
                              id={`milestone-status-${milestone.id}`}
                              aria-label={`Status for ${milestone.title}`}
                              value={milestoneDrafts[milestone.id] || milestone.status}
                              onChange={(_event, data) => setMilestoneDrafts((current) => ({
                                ...current,
                                [milestone.id]: data.value as MilestoneStatus
                              }))}
                            >
                              {MILESTONE_STATUSES.map((status) => (
                                <option key={status.value} value={status.value}>{status.label}</option>
                              ))}
                            </Select>
                          </div>
                          <Button
                            appearance="primary"
                            aria-label={`Save ${milestone.title} status`}
                            disabled={updatingMilestone !== null}
                            onClick={() => void updateMilestone(milestone)}
                          >
                            {updatingMilestone === milestone.id ? 'Saving…' : 'Save'}
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {!canUpdateMilestones && selectedProject.milestones.length > 0 ? (
                <Text block className={styles.secondaryText}>
                  Milestone changes are available to the project leader and administrators.
                </Text>
              ) : null}
            </section>
          </div>
        </Panel>
      )}
    </ServicePage>
  );
}
