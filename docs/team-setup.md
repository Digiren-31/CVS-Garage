# GitHub Team Setup

## What is prepared locally

Each area has its own landing page and instructions.
[../.github/CODEOWNERS](../.github/CODEOWNERS) contains **commented placeholders
only**. It is not active ownership configuration, and no GitHub teams,
collaborators, protected branches, or deployments have been created.

## Assign actual owners

1. For a personal repository, invite collaborators and use their GitHub usernames.
   For an organization repository, use visible teams with explicit repository
   write access. User code owners also need write access.
2. Assign a portal maintainer, six service owners, a backend owner, and agreed
   owners for shared areas.
3. Replace placeholder handles and uncomment the corresponding CODEOWNERS lines.
   Personal users use `@username`; organization teams use `@organization/team-slug`.
   Do not use a bare organization handle as a user/team owner.
4. Keep the fallback pattern first and specific path rules later: the last
   matching pattern wins. Keep ownership policy and central portal instructions
   under maintainer review.
5. Publish the file to `main` and verify GitHub recognizes the owners. Pull
   requests use the ownership configuration on their base branch.

Until then, request reviewers manually. CODEOWNERS does not create teams, grant
access, or require approvals on its own.

## Protect main after the initial publication

Configure a branch ruleset or protection rule in GitHub settings, subject to the
repository's plan and visibility:

- [ ] Require pull requests before merging into `main`.
- [ ] Require at least one approval and review from code owners.
- [ ] Dismiss stale approvals when reviewable changes are pushed.
- [ ] Require review conversations to be resolved.
- [ ] Block force pushes and branch deletion.
- [ ] Review administrator/bypass permissions and apply protections to them where supported.
- [ ] When CI is introduced, require the actual checks after they have run.
      There are no build/test workflows to require in this scaffold.

An author cannot approve their own pull request. Arrange another trusted reviewer
before requiring reviews on sole-maintainer work; avoid making normal work
depend on an unavailable reviewer.

Multiple owners on a single path mean **any one** of those owners can satisfy
the standard owner-review requirement. Contract changes should receive both
frontend and backend review. Request both and establish an additional review
policy/check if both approvals must be enforced automatically.

## Central portal publication

When hosting is selected, reserve central deployment credentials and release
approval for the portal maintainer. If deployments use GitHub Actions, configure
a protected environment where supported and review who can change deployment
workflows or approve releases. None of that infrastructure is provisioned yet.

## Permission limitation

GitHub repository write access and branches are not folder-scoped. CODEOWNERS
assigns reviewers; it does not prevent editing or pushing other folders on a
feature branch. A service-prefixed branch name is a convention, not a restriction.

Use this monorepo with protected `main` for review-based isolation. Use separate
repositories if teams require strict per-team write or visibility isolation, and
agree how their public interfaces integrate with the portal.