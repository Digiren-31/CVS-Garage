# Idea Hub — Build Instructions

Engineering instruction set for the **Idea Hub** module of the Innovation Hub student
workspace. This is the single source of truth for implementation: stack, RBAC, data
model, API contract, and UI/workflow behavior. Build only this module; the other four
sidebar modules (Projects, Events, Forum, Ranking & Leaderboard) stay as placeholder
routes.

---

## 1. Stack & Architecture

**Stack:** Next.js (App Router, TypeScript) + Prisma + PostgreSQL + Tailwind CSS.

**Justification:** A single Next.js app gives server components, route handlers, and
middleware in one codebase, so RBAC can be enforced at the routing layer and the data
layer with no separate API service to keep in sync — the fastest path to the
"server-side re-verification on every request" requirement in §2.

**Auth/session:** Idea Hub does not own authentication. It reads the signed
session/JWT issued by the Member Management module (custom JWT + bcrypt, per the
existing portal decision) via shared middleware. Idea Hub never mints, refreshes, or
stores its own session — only reads `role` and `userId` off the verified token on
every request.

**Shared layer (build for reuse by future modules, not just Idea Hub):**
- `components/shell/` — TopNav, LeftSidebar, ModuleShell layout
- `components/modal/` — focus-trapped Modal primitive (see §5)
- `lib/auth/` — `getSession()` server helper, `requireRole()` guard
- `lib/db/` — Prisma client singleton
- Route groups: `app/(workspace)/idea-hub/**` for this module; sibling route groups
  (`app/(workspace)/projects/**`, etc.) as empty placeholder pages only.

---

## 2. RBAC & Identity

**Roles:** `STUDENT` (default, self-registration only) → `MENTOR` (admin-promoted) →
`ADMIN` (manages roles externally in Member Management; not part of this UI).

**Hard rules:**
1. **One signup flow.** No role picker, no "Become a Mentor" affordance anywhere in
   Idea Hub.
2. **No cached role.** Every server component and route handler calls
   `getSession()` fresh and reads `role` from the verified token — never from a
   client store, cookie value trusted as-is, or a role fetched once and held in
   React state/context across navigations.
3. **Hot role changes.** Because role is re-read per request/page load rather than
   cached, a promotion made in Member Management takes effect on the user's *next*
   navigation or the *next* poll of `/api/notifications` — no logout required. If the
   UI needs to reflect a promotion without any navigation (e.g. user is idle on the
   dashboard when promoted), poll session state (e.g. via the existing notification
   poll interval) and re-render the sidebar's Mentor Queue entry when role changes.
4. **Server-side enforcement is mandatory, UI hiding is not enough.** Every mutating
   route handler must independently re-check: (a) is the caller authenticated, (b)
   does the caller's role permit this action, (c) does the caller *own* or otherwise
   have standing over the specific row being mutated (e.g. only the idea's owner or
   an assigned mentor can mark it complete; only the applicant or idea owner can act
   on a given `JoinRequest`). A hidden button is not a security control.

**Permission matrix:**

| Action | Student | Mentor | Notes |
|---|---|---|---|
| Submit idea, browse/filter/search, bookmark, comment | ✅ | ✅ | |
| Send join request | ✅ | ✅ | Not on own idea |
| Connect with idea owner/mentor | ✅ | ✅ | Gated on profile links (§4 card footer) |
| View Mentorship Queue | ❌ | ✅ | |
| Claim a mentorship request | ❌ | ✅ | Sets `assignedMentorId`, flips request to `CLAIMED` |
| Step down from an assigned team | ❌ | ✅ | Clears `assignedMentorId`, idea returns to `seekingMentor = true` |

---

## 3. Data Model (Prisma schema)

Normalized relational schema; lookups (`Track`, `TechStackTag`) are separate tables
referenced by id, not free-text, so filters/counts in §4 stay accurate.

```prisma
enum Role {
  STUDENT
  MENTOR
  ADMIN
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum IdeaStatus {
  OPEN
  IN_PROGRESS
  COMPLETED
}

enum JoinRequestStatus {
  PENDING
  ACCEPTED
  DECLINED
}

enum MentorshipStatus {
  OPEN
  CLAIMED
}

enum NotificationType {
  JOIN_REQUEST
  REQUEST_ACCEPTED
  REQUEST_DECLINED
  MENTOR_ASSIGNED
  NEW_COMMENT
  ROLE_PROMOTED
}

model User {
  id          String   @id @default(cuid())
  name        String
  email       String   @unique
  role        Role     @default(STUDENT)
  course      String
  githubUrl   String?
  linkedInUrl String?
  avatarUrl   String

  ideasOwned        Idea[]              @relation("IdeaOwner")
  ideasMentoring    Idea[]              @relation("IdeaMentor")
  teamMemberships   TeamMembership[]
  joinRequestsMade  JoinRequest[]       @relation("JoinApplicant")
  joinRequestsDecided JoinRequest[]     @relation("JoinDecider")
  mentorshipClaims  MentorshipRequest[] @relation("MentorshipClaimant")
  comments          Comment[]
  savedIdeas        SavedIdea[]
  notifications     Notification[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Track {
  id   String @id @default(cuid())
  name String
  slug String @unique
  ideas Idea[]
}

model TechStackTag {
  id    String @id @default(cuid())
  name  String
  slug  String @unique
  ideas IdeaTechStack[]
}

model Idea {
  id               String     @id @default(cuid())
  ticketCode       String     @unique // e.g. IDEA-102, generated server-side
  title            String
  tagline          String
  description      String
  trackId          String
  track            Track      @relation(fields: [trackId], references: [id])
  difficulty       Difficulty
  status           IdeaStatus @default(OPEN)
  targetTeamSize   Int
  ownerId          String
  owner            User       @relation("IdeaOwner", fields: [ownerId], references: [id])
  assignedMentorId String?
  assignedMentor   User?      @relation("IdeaMentor", fields: [assignedMentorId], references: [id])
  seekingMentor    Boolean    @default(false)
  githubRepoUrl    String?
  awardNote        String?
  usageStats       String?

  techStack          IdeaTechStack[]
  teamMemberships    TeamMembership[]
  joinRequests       JoinRequest[]
  mentorshipRequests MentorshipRequest[]
  comments           Comment[]
  savedBy            SavedIdea[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status])
  @@index([trackId])
  @@index([seekingMentor])
  // Full-text search over title/tagline/description handled via a
  // Postgres GIN/tsvector index added in a raw migration (see §7).
}

model IdeaTechStack {
  ideaId String
  idea   Idea         @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  tagId  String
  tag    TechStackTag @relation(fields: [tagId], references: [id])

  @@id([ideaId, tagId])
}

model TeamMembership {
  id       String   @id @default(cuid())
  ideaId   String
  idea     Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  userId   String
  user     User     @relation(fields: [userId], references: [id])
  joinedAt DateTime @default(now())

  @@unique([ideaId, userId]) // one membership per user per idea
}

model JoinRequest {
  id              String            @id @default(cuid())
  ideaId          String
  idea            Idea              @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  applicantId     String
  applicant       User              @relation("JoinApplicant", fields: [applicantId], references: [id])
  message         String
  skills          String
  status          JoinRequestStatus @default(PENDING)
  decidedByUserId String?
  decidedBy       User?             @relation("JoinDecider", fields: [decidedByUserId], references: [id])
  decisionNote    String?
  createdAt       DateTime          @default(now())

  @@unique([ideaId, applicantId, status]) // prevent duplicate pending requests (partial-unique via migration, see §7)
}

model MentorshipRequest {
  id               String            @id @default(cuid())
  ideaId           String
  idea             Idea              @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  guidanceNeeded   String
  preferredDomain  String?
  status           MentorshipStatus  @default(OPEN)
  claimedByMentorId String?
  claimedBy        User?             @relation("MentorshipClaimant", fields: [claimedByMentorId], references: [id])
  createdAt        DateTime          @default(now())
}

model Comment {
  id        String   @id @default(cuid())
  ideaId    String
  idea      Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  parentId  String?
  parent    Comment? @relation("Thread", fields: [parentId], references: [id])
  replies   Comment[] @relation("Thread")
  content   String
  createdAt DateTime @default(now())
}

model SavedIdea {
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  ideaId    String
  idea      Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@id([userId, ideaId])
}

model Notification {
  id          String           @id @default(cuid())
  recipientId String
  recipient   User             @relation(fields: [recipientId], references: [id])
  type        NotificationType
  read        Boolean          @default(false)
  // Polymorphic pointer so the client can deep-link the notification
  ideaId      String?
  createdAt   DateTime         @default(now())

  @@index([recipientId, read])
}
```

**Design notes:**
- `parentId` on `Comment` is one level deep by contract (§ requirement), enforced in
  the route handler (reject a reply whose `parent.parentId` is already non-null), not
  in the schema — Prisma has no native depth constraint.
- `JoinRequest`'s partial-unique constraint (one *pending* request per applicant per
  idea) needs a raw SQL migration since Prisma's `@@unique` can't scope to a status
  value; add `CREATE UNIQUE INDEX ... WHERE status = 'PENDING'`.
- `Notification.ideaId` is deliberately nullable and untyped-relation-light so the
  same table serves all six notification types without six join tables.

---

## 4. API Contract

All routes under `/api/idea-hub/*`. Every row marked "server re-check" independently
re-verifies role + ownership per §2 rule 4, regardless of what the client believes.

| Method & Path | Role | Server re-check | Purpose |
|---|---|---|---|
| `GET /ideas` | any | — | List/filter/search/sort ideas (query params: `track`, `status`, `q`, `sort`) |
| `GET /ideas/:id` | any | — | Idea detail |
| `POST /ideas` | Student, Mentor | — | Submit idea; server generates `ticketCode` |
| `PATCH /ideas/:id` | owner | is caller `ownerId`? | Edit idea fields |
| `POST /ideas/:id/join-requests` | any, not owner | caller not already a team member | Send join request |
| `PATCH /join-requests/:id` | owner | is caller the idea's `ownerId`? | Accept/decline; accept creates `TeamMembership`, fires `REQUEST_ACCEPTED` notification |
| `POST /ideas/:id/mentorship-requests` | owner/team member | is caller owner or in `TeamMembership`? | Open a mentorship request, sets `seekingMentor = true` |
| `POST /mentorship-requests/:id/claim` | Mentor | is caller role `MENTOR`? | Sets `claimedByMentorId`, `Idea.assignedMentorId`, `seekingMentor = false`, fires `MENTOR_ASSIGNED` |
| `POST /ideas/:id/step-down` | assigned mentor | is caller the `assignedMentorId`? | Clears mentor fields, reopens `seekingMentor` |
| `PATCH /ideas/:id/complete` | owner or assigned mentor | ownership check | Sets `status = COMPLETED` |
| `POST /ideas/:id/comments` | any | — | 1-level threaded comment; reject if `parentId`'s parent is non-null |
| `POST /ideas/:id/save` / `DELETE /ideas/:id/save` | any | — | Bookmark toggle |
| `GET /notifications` | self | scoped to `recipientId = session.userId` | Poll for unread indicator |
| `PATCH /notifications/:id/read` | self | is caller the `recipientId`? | Mark read |
| `GET /tracks`, `GET /tech-stack-tags` | any | — | Lookup data for filters/forms |

---

## 5. UI Implementation Notes

**Shell:** TopNav (global search w/ `Ctrl+K`/`Cmd+K`, sort dropdown default
*Trending*, status filter, "Submit Idea" button) + LeftSidebar (branding + Beta
badge, "Submit Idea" CTA, nav links with live count badges for Projects/Saved
Ideas, unread-notification dot, profile footer). Trending sort = a computed score
(e.g. recent join requests + comments + views, decayed by age) rather than a stored
column, to avoid a background job for v1.

**Dashboard:** Breadcrumb `Workspace / Project Directory` → "Explore Project Ideas" →
subtitle. Segmented tabs (`All`, `Open`, `Completed`) with live counts from the same
query used for the grid (avoid a second unfiltered count query per tab — compute all
three counts in one grouped query). Two stat cards (Completed: total + shipped
metrics + delta; Open: total + seeking-mentor count). Track filter bar: horizontal
pills from `GET /tracks` joined with a per-track idea count, "All Tracks" default,
right-aligned `Showing X of Y ideas`.

**Grid & card:** CSS Grid, 3 cols desktop → 1 col under 640px. Card top row: status
badge, `ticketCode`, bookmark toggle. Body: title, 1–2 line truncated `tagline`
(not `description` — keep the card scannable), up to 3 tech-stack chips (`+N more`
if over 3). Footer is the one part of the card that's genuinely stateful per viewer —
compute the viewer's relationship to the idea server-side (owner / team member /
pending applicant / neither) and pass it down as a single `viewerRelation` prop
rather than re-deriving it in multiple client conditionals:

- `OPEN`, space available, viewer not on team → **Start Working** (opens join-request modal)
- `OPEN`, team full, viewer not on team → disabled **Team Full**
- viewer has a `PENDING` request → disabled **Request Sent**
- viewer on team & `seekingMentor` → **Apply for Mentor**
- mentor assigned → **Connect with Mentor** (links to mentor profile/contact)
- `COMPLETED` → award/usage line + **View Archive / Case Study**; **Connect with
  Owner** only rendered if `owner.githubUrl || owner.linkedInUrl` is truthy

---

## 6. Workflows & Modals

Shared `Modal` primitive (single implementation, used by Submit Idea, Join Request,
Mentorship Claim, Comment reply, etc.):
- Traps keyboard focus inside the modal while open.
- `Escape` closes it.
- Restores the background scroll position on close (capture `window.scrollY` on
  open, restore on close — don't just re-enable `overflow`).
- Client-side validation on blur/submit; server re-validates the same fields on
  submit (never trust client validation alone, consistent with §2).
- Submit button shows a loading state and is disabled for the duration of the
  request (prevents double-submit, e.g. duplicate join requests).

---

## 7. Build Order

1. Prisma schema + migrations (including the two raw-SQL constraints noted in §3)
   and seed data for `Track`/`TechStackTag`.
2. `lib/auth` session helpers reading the shared JWT; `requireRole()` guard used by
   every route handler in §4.
3. API routes, in the order listed in §4 (ideas → join requests → mentorship →
   comments/saves → notifications).
4. Shell components (TopNav, LeftSidebar, Modal) — build these generically now,
   since the other four modules will reuse them.
5. Dashboard header, stat cards, track filter bar.
6. Idea grid + card, including the `viewerRelation` footer logic.
7. Modals (Submit Idea, Join Request, Mentorship Claim/Step-down).
8. Notification polling + unread dot.
9. Tests (`tests/`): RBAC enforcement per route (a Student hitting a Mentor-only
   endpoint gets 403; an owner-only mutation from a non-owner gets 403), the
   1-level comment-depth rule, and the `viewerRelation` → footer-CTA mapping.
