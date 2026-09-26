import { useCallback, useId, useMemo, useState } from "react";

import type {
  AcademicYear,
  Department,
  Event,
  LeaderboardEntry,
} from "./models";

type StarFilter = "all" | "1" | "2" | "3" | "4" | "5";

interface LeaderboardFilters {
  eventId: string;
  minimumStarRating: StarFilter;
  departmentId: string;
  academicYear: string;
}

export interface CustomLeaderboardProps {
  entries: readonly LeaderboardEntry[];
  events: ReadonlyArray<Pick<Event, "id" | "title">>;
  departments: readonly Department[];
  academicYears: readonly AcademicYear[];
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
}

const DEFAULT_FILTERS: LeaderboardFilters = {
  eventId: "all",
  minimumStarRating: "all",
  departmentId: "all",
  academicYear: "all",
};

const controlClassName =
  "min-h-11 w-full rounded-md border border-[var(--leaderboards-color-border)] " +
  "bg-[var(--leaderboards-color-surface)] px-3 py-2 text-base " +
  "text-[var(--leaderboards-color-text)] outline-none " +
  "focus-visible:ring-2 focus-visible:ring-[var(--leaderboards-color-focus)] " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--leaderboards-color-page)]";

export function CustomLeaderboard({
  entries,
  events,
  departments,
  academicYears,
  isLoading = false,
  errorMessage = null,
  onRetry,
}: CustomLeaderboardProps) {
  const sectionId = useId();
  const [filters, setFilters] = useState<LeaderboardFilters>(DEFAULT_FILTERS);

  const filteredEntries = useMemo(() => {
    const minimumStars =
      filters.minimumStarRating === "all"
        ? null
        : Number(filters.minimumStarRating);

    // Scores and ranks remain server-authoritative. This projection only decides
    // which already-ranked rows are visible and never applies local tie-breakers.
    return entries.filter((entry) => {
      const matchesEvent =
        filters.eventId === "all" || entry.eventIds.includes(filters.eventId);
      const matchesStars =
        minimumStars === null || entry.starRating >= minimumStars;
      const matchesDepartment =
        filters.departmentId === "all" ||
        entry.user.department.id === filters.departmentId;
      const matchesAcademicYear =
        filters.academicYear === "all" ||
        entry.user.academicYear === filters.academicYear;

      return (
        matchesEvent &&
        matchesStars &&
        matchesDepartment &&
        matchesAcademicYear
      );
    });
  }, [entries, filters]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = Object.values(filters).some((value) => value !== "all");

  return (
    <section
      aria-labelledby={`${sectionId}-heading`}
      className="bg-[var(--leaderboards-color-page)] px-4 py-8 text-[var(--leaderboards-color-text)] sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id={`${sectionId}-heading`} className="text-2xl font-semibold">
              Custom leaderboard
            </h2>
            <p className="mt-1 text-base text-[var(--leaderboards-color-text-muted)]">
              Explore published rankings by event and student cohort.
            </p>
          </div>
          <button
            type="button"
            className="min-h-11 rounded-md border border-[var(--leaderboards-color-border)] px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!hasActiveFilters}
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>

        <form
          aria-label="Leaderboard filters"
          className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <FilterSelect
            id={`${sectionId}-event`}
            label="Event"
            value={filters.eventId}
            onChange={(value) =>
              setFilters((current) => ({ ...current, eventId: value }))
            }
          >
            <option value="all">All events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id={`${sectionId}-stars`}
            label="Star rating"
            value={filters.minimumStarRating}
            onChange={(value) =>
              setFilters((current) => ({
                ...current,
                minimumStarRating: value as StarFilter,
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

          <FilterSelect
            id={`${sectionId}-department`}
            label="Department"
            value={filters.departmentId}
            onChange={(value) =>
              setFilters((current) => ({ ...current, departmentId: value }))
            }
          >
            <option value="all">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect
            id={`${sectionId}-year`}
            label="Academic year"
            value={filters.academicYear}
            onChange={(value) =>
              setFilters((current) => ({ ...current, academicYear: value }))
            }
          >
            <option value="all">All academic years</option>
            {academicYears.map((academicYear) => (
              <option key={academicYear} value={academicYear}>
                {academicYear}
              </option>
            ))}
          </FilterSelect>
        </form>

        <p className="mb-3 text-sm text-[var(--leaderboards-color-text-muted)]" aria-live="polite">
          {isLoading
            ? "Loading rankings"
            : `${filteredEntries.length} ${filteredEntries.length === 1 ? "result" : "results"}`}
        </p>

        {errorMessage ? (
          <div
            role="alert"
            className="border-l-4 border-[var(--leaderboards-color-danger)] bg-[var(--leaderboards-color-surface)] p-4"
          >
            <p className="font-medium">Rankings could not be loaded.</p>
            <p className="mt-1">{errorMessage}</p>
            {onRetry ? (
              <button
                type="button"
                className="mt-3 min-h-11 rounded-md bg-[var(--leaderboards-color-brand)] px-4 py-2 font-semibold text-[var(--leaderboards-color-on-brand)]"
                onClick={onRetry}
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : isLoading ? (
          <div
            aria-busy="true"
            aria-label="Loading leaderboard results"
            className="h-72 animate-pulse rounded-md bg-[var(--leaderboards-color-surface)] motion-reduce:animate-none"
          />
        ) : filteredEntries.length === 0 ? (
          <div className="border-y border-[var(--leaderboards-color-border)] py-12 text-center">
            <h3 className="text-lg font-semibold">No matching rankings</h3>
            <p className="mt-1 text-[var(--leaderboards-color-text-muted)]">
              Adjust or reset the filters to see more results.
            </p>
          </div>
        ) : (
          // Horizontal overflow preserves real table semantics and readable
          // columns on mobile instead of duplicating rows as presentation cards.
          <div className="overflow-x-auto rounded-md border border-[var(--leaderboards-color-border)] bg-[var(--leaderboards-color-surface)]">
            <table className="min-w-[48rem] w-full border-collapse text-left">
              <caption className="sr-only">
                Filtered leaderboard rankings
              </caption>
              <thead className="bg-[var(--leaderboards-color-surface-subtle)]">
                <tr>
                  <TableHeading>Rank</TableHeading>
                  <TableHeading>Name</TableHeading>
                  <TableHeading>Department</TableHeading>
                  <TableHeading>Academic year</TableHeading>
                  <TableHeading align="right">Star rating</TableHeading>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <LeaderboardRow key={entry.user.id} entry={entry} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: FilterSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        className={controlClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

function TableHeading({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-3 text-sm font-semibold ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const rankLabel = entry.rank <= 3 ? `Top ${entry.rank}` : String(entry.rank);

  return (
    <tr className="border-t border-[var(--leaderboards-color-border)]">
      <td className="px-4 py-3 font-semibold">
        <span
          className={
            entry.rank <= 3
              ? "inline-flex min-h-8 min-w-8 items-center justify-center rounded-full bg-[var(--leaderboards-color-rank-highlight)] px-2 text-[var(--leaderboards-color-on-rank-highlight)]"
              : undefined
          }
          aria-label={`Rank ${entry.rank}`}
        >
          {rankLabel}
        </span>
      </td>
      <th scope="row" className="px-4 py-3 font-semibold">
        {entry.user.displayName}
      </th>
      <td className="px-4 py-3">{entry.user.department.name}</td>
      <td className="px-4 py-3">{entry.user.academicYear}</td>
      <td className="px-4 py-3 text-right font-semibold">
        <span aria-label={`${entry.starRating} out of 5 stars`}>
          {entry.starRating.toFixed(1)} / 5
        </span>
      </td>
    </tr>
  );
}