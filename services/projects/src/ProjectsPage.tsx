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
  Title3,
  makeStyles,
  shorthands,
  tokens
} from '@fluentui/react-components';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from 'react';
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
  StatusBadge
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
    gridTemplateColumns: 'minmax(220px, 1fr) repeat(2, minmax(150px, 220px))',
    alignItems: 'end',
    gap: tokens.spacingHorizontalM,
    '@media (max-width: 760px)': {
      gridTemplateColumns: '1fr'
    }
  },
  searchForm: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalS,
    '@media (max-width: 760px)': {
      alignItems: 'stretch',
      flexDirection: 'column'
    }
  },
  field: {
    display: 'grid',
    gap: tokens.spacingVerticalXS,
    minWidth: 0
  },
  grow: {
    flexGrow: 1
  },
  control: {
    width: '100%'
  },
  sectionHeading: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    marginBottom: tokens.spacingVerticalM
  },
  secondaryText: {
    color: tokens.colorNeutralForeground2
  },
  card: {
    height: '100%',
    ...shorthands.padding(tokens.spacingVerticalL)
  },
  cardBody: {
    display: 'grid',
    gap: tokens.spacingVerticalM,
    height: '100%'
  },
  cardHeading: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    listStyleType: 'none',
    margin: 0,
    padding: 0
  },
  progress: {
    display: 'grid',
    gap: tokens.spacingVerticalXS
  },
  progressLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    marginTop: 'auto',
    paddingTop: tokens.spacingVerticalS,
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
    gap: tokens.spacingVerticalL
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM
  },
  detailMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM
  },
  teamList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    listStyleType: 'none',
    margin: 0,
    padding: 0
  },
  milestones: {
    display: 'grid',
    gap: tokens.spacingVerticalM,
    listStyleType: 'none',
    margin: 0,
    padding: 0
  },
  milestone: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: tokens.spacingHorizontalL,
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalM),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    '@media (max-width: 760px)': {
      gridTemplateColumns: '1fr'
    }
  },
  milestoneCopy: {
    display: 'grid',
    gap: tokens.spacingVerticalXS
  },
  milestoneActions: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalS,
    '@media (max-width: 760px)': {
      alignItems: 'stretch',
      flexDirection: 'column'
    }
  },
  dialogForm: {
    display: 'grid'
  },
  formFields: {
    display: 'grid',
    gap: tokens.spacingVerticalM
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

function toProjectInput(form: ProjectForm): CreateProjectInput {
  return {
    name: form.name.trim(),
    tagline: form.tagline.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    tags: form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  };
}

export function ProjectsPage() {
  const styles = useStyles();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [requestedProjectId, setRequestedProjectId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [milestoneDrafts, setMilestoneDrafts] = useState<Record<string, MilestoneStatus>>({});
  const [updatingMilestone, setUpdatingMilestone] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ProjectForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<ProjectFormErrors>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (searchQuery = '') => {
    setLoading(true);
    try {
      const [nextProjects, member] = await Promise.all([
        api.projects.list(searchQuery),
        api.members.current()
      ]);
      setProjects(nextProjects);
      setCurrentMember(member);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Projects could not be loaded.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(
    () => [...new Set(projects.map((project) => project.category))].sort(),
    [projects]
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

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    setSubmittedQuery(normalizedQuery);
    setActionMessage(null);
    setActionError(null);
    void load(normalizedQuery);
  }

  function setMilestoneDefaults(project: Project) {
    setMilestoneDrafts(
      Object.fromEntries(
        project.milestones.map((milestone) => [milestone.id, milestone.status])
      )
    );
  }

  async function showDetails(projectId: string) {
    setRequestedProjectId(projectId);
    setDetailLoading(true);
    setDetailError(null);
    setActionMessage(null);
    setActionError(null);
    try {
      const project = await api.projects.get(projectId);
      setSelectedProject(project);
      setMilestoneDefaults(project);
    } catch (requestError) {
      setSelectedProject(null);
      setDetailError(
        requestError instanceof Error
          ? requestError.message
          : 'Project details could not be loaded.'
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function replaceProject(updated: Project) {
    setProjects((current) =>
      current.map((project) => (project.id === updated.id ? updated : project))
    );
    setSelectedProject(updated);
    setMilestoneDefaults(updated);
  }

  async function updateMilestone(milestone: ProjectMilestone) {
    if (!selectedProject) {
      return;
    }

    const status = milestoneDrafts[milestone.id] || milestone.status;
    setUpdatingMilestone(milestone.id);
    setActionMessage(null);
    setActionError(null);
    try {
      const updated = await api.projects.updateMilestone(
        selectedProject.id,
        milestone.id,
        status
      );
      replaceProject(updated);
      setActionMessage('Milestone status updated.');
    } catch (requestError) {
      setActionError(
        requestError instanceof Error
          ? requestError.message
          : 'The milestone could not be updated.'
      );
    } finally {
      setUpdatingMilestone(null);
    }
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
    try {
      const created = await api.projects.create(toProjectInput(form));
      setProjects((current) => [created, ...current]);
      setSelectedProject(created);
      setMilestoneDefaults(created);
      setActionError(null);
      setActionMessage(`${created.name} was added as a project proposal.`);
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
    } catch (requestError) {
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
        onRetry={() => void load(submittedQuery)}
      />
    );
  }

  const canUpdateMilestones =
    selectedProject !== null &&
    (selectedProject.leaderId === currentMember.id || isAdministrator(currentMember));

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
            <div className={`${styles.field} ${styles.grow}`}>
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
              id="project-status-filter"
              value={statusFilter}
              onChange={(_event, data) =>
                setStatusFilter(data.value as ProjectStatusFilter)
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
              id="project-category-filter"
              value={categoryFilter}
              onChange={(_event, data) => setCategoryFilter(data.value)}
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
            <Text id="project-directory-heading" size={600} weight="semibold">
              Project directory
            </Text>
            <Text block className={styles.secondaryText}>
              {filteredProjects.length}{' '}
              {filteredProjects.length === 1 ? 'project' : 'projects'} shown
            </Text>
          </div>
        </div>

        <div className={styles.feedback} aria-live="polite">
          {actionMessage ? <Text>{actionMessage}</Text> : null}
          {actionError ? (
            <Text role="alert" className={styles.error}>
              {actionError}
            </Text>
          ) : null}
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
              <article key={project.id}>
                <Card className={styles.card}>
                  <div className={styles.cardBody}>
                    <div className={styles.cardHeading}>
                      <div>
                        <Title3 as="h3">{project.name}</Title3>
                        <Text block className={styles.secondaryText}>
                          {project.category}
                        </Text>
                      </div>
                      <StatusBadge status={formatStatus(project.status)} />
                    </div>
                    <Text>{project.tagline}</Text>
                    <ul className={styles.tags} aria-label={`Tags for ${project.name}`}>
                      {project.tags.map((tag) => (
                        <li key={tag}>
                          <Badge appearance="outline">{tag}</Badge>
                        </li>
                      ))}
                    </ul>
                    <div className={styles.progress}>
                      <div className={styles.progressLabel}>
                        <Text>Progress</Text>
                        <Text>{project.progress}%</Text>
                      </div>
                      <ProgressBar
                        value={project.progress / 100}
                        aria-label={`${project.name} progress: ${project.progress}%`}
                      />
                    </div>
                    <div className={styles.cardFooter}>
                      <Text className={styles.secondaryText}>
                        {project.memberIds.length}{' '}
                        {project.memberIds.length === 1 ? 'team member' : 'team members'}
                      </Text>
                      <Button
                        appearance="secondary"
                        aria-label={`View ${project.name} details`}
                        onClick={() => void showDetails(project.id)}
                      >
                        View details
                      </Button>
                    </div>
                  </div>
                </Card>
              </article>
            ))}
          </CardGrid>
        )}
      </section>

      {detailLoading ? (
        <StatePanel state="loading" message="Loading project details" />
      ) : detailError ? (
        <div role="alert" className={styles.detail}>
          <Text className={styles.error}>{detailError}</Text>
          <Button
            onClick={() => {
              if (requestedProjectId) {
                void showDetails(requestedProjectId);
              }
            }}
          >
            Try details again
          </Button>
        </div>
      ) : selectedProject ? (
        <Panel>
          <div className={styles.detail} aria-labelledby="project-detail-heading">
            <div className={styles.detailHeader}>
              <div>
                <Text id="project-detail-heading" as="h2" size={700} weight="semibold">
                  Project details
                </Text>
                <Title3 as="h3">{selectedProject.name}</Title3>
              </div>
              <Button
                appearance="subtle"
                aria-label="Close project details"
                onClick={() => {
                  setSelectedProject(null);
                  setRequestedProjectId(null);
                  setDetailError(null);
                }}
              >
                Close
              </Button>
            </div>
            <Text>{selectedProject.description}</Text>
            <div className={styles.detailMeta}>
              <StatusBadge status={formatStatus(selectedProject.status)} />
              <Text>{selectedProject.category}</Text>
              <Text>
                {selectedProject.memberIds.length}{' '}
                {selectedProject.memberIds.length === 1 ? 'team member' : 'team members'}
              </Text>
              {selectedProject.repositoryUrl ? (
                <Link
                  href={selectedProject.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open repository
                </Link>
              ) : null}
            </div>

            <section aria-labelledby="project-team-heading">
              <Text id="project-team-heading" as="h3" size={500} weight="semibold">
                Team
              </Text>
              <ul className={styles.teamList}>
                {selectedProject.memberIds.map((memberId) => (
                  <li key={memberId}>
                    <Badge appearance="tint">
                      {memberId === selectedProject.leaderId ? `${memberId} · Leader` : memberId}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="project-milestones-heading">
              <Text id="project-milestones-heading" as="h3" size={500} weight="semibold">
                Milestones
              </Text>
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
                        <Text className={styles.secondaryText}>
                          Due {formatDate(milestone.dueDate)}
                        </Text>
                        {!canUpdateMilestones ? (
                          <StatusBadge status={formatStatus(milestone.status)} />
                        ) : null}
                      </div>
                      {canUpdateMilestones ? (
                        <div className={styles.milestoneActions}>
                          <div className={styles.field}>
                            <Label htmlFor={`milestone-status-${milestone.id}`}>Status</Label>
                            <Select
                              id={`milestone-status-${milestone.id}`}
                              aria-label={`Status for ${milestone.title}`}
                              value={milestoneDrafts[milestone.id] || milestone.status}
                              onChange={(_event, data) =>
                                setMilestoneDrafts((current) => ({
                                  ...current,
                                  [milestone.id]: data.value as MilestoneStatus
                                }))
                              }
                            >
                              {MILESTONE_STATUSES.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
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
      ) : null}

      <Dialog
        open={dialogOpen}
        onOpenChange={(_event, data) => {
          if (!data.open) {
            closeDialog();
          }
        }}
      >
        <DialogSurface aria-describedby="project-proposal-description">
          <form className={styles.dialogForm} onSubmit={createProject} noValidate>
            <DialogBody>
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
                </div>
                {createError ? (
                  <Text role="alert" block className={styles.dialogError}>
                    {createError}
                  </Text>
                ) : null}
              </DialogContent>
              <DialogActions>
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
