# Guild Engine — Architectural Decisions

This document lists architectural decisions that appear to have been made **deliberately** during
development. They are inferred from the system's structure and behavior and from the project's checked-in
**design-rules document (`AGENTS.md`)**, which records several conventions explicitly. Where a rationale
is an inference rather than an explicit statement, it is phrased as such.

It is written for a reader without access to the source code. Each entry follows a lightweight ADR
shape: **Decision → Rationale → Consequences**.

---

### ADR-1 — Locale-first routing with a single, centralized request guard

**Decision.** Every user-facing page lives beneath a language prefix, and all cross-cutting request
handling — language prefixing, authentication redirects, and feature-based access control — is
concentrated in one centralized request guard rather than spread across pages.

**Rationale.** `AGENTS.md` states that routing and authentication are "locale-first" and that request
guarding and locale redirects are centralized. Handling these concerns in one place keeps the individual
pages simple and ensures consistent behavior.

**Consequences.** A single place governs access, language and feature-gating. In return, a few
collaborating pieces (the request guard, the post-login redirect logic, and the language switcher) must
be kept in step — a coupling `AGENTS.md` explicitly calls out.

### ADR-2 — Server actions instead of a separate API layer

**Decision.** Data reads and changes are implemented as server-side actions co-located with the routes
that use them and invoked directly from the interface; there is no separate REST/GraphQL API.

**Rationale.** `AGENTS.md` documents this convention. It keeps each page's behavior next to the page and
leans on the framework's built-in model, while limiting the surface exposed to the browser to explicit
operations.

**Consequences.** Behavior is easy to locate alongside the UI, and shared logic is factored into reusable
server-side modules; there is no additional API layer to design, version or secure separately.

### ADR-3 — Data-driven, admin-configurable scoring

**Decision.** What counts as a trackable contribution, and how much it is worth, is **not hard-coded**.
Administrators define the contribution categories (as *enum* or *integer* metrics with their point
mappings); members self-report against them and totals are derived from that configuration.

**Rationale.** The scoring is interpreted from configuration at runtime rather than baked into the code,
so one codebase can serve very different meeting cultures without changes.

**Consequences.** Maximum flexibility for administrators; the trade-off is that scoring lives in
configuration that must be validated carefully whenever it is edited.

### ADR-4 — Two-layer feature configuration: fixed catalog + versioned runtime state

**Decision.** Feature configuration is split into a source-controlled **catalog** (which features and
settings can exist, with their defaults and validation) and a **runtime configuration** stored in the
database as a **versioned, append-only history** — every save writes a new version recording the full
state, who changed it, and when.

**Rationale.** Keeping the catalog in source control keeps defaults and validation reviewed and
versioned, while append-only runtime versions give an auditable "who changed what, when" trail and make
rollback trivial (just read, or re-apply, an earlier version).

**Consequences.** Configuration changes are traceable and reversible; reads always take the latest
version as the current state.

### ADR-5 — Feature prerequisites enforced by a cascading stabilization pass

**Decision.** Features declare prerequisites, and a stabilization pass repeatedly treats as disabled any
feature whose prerequisites are unmet until the state settles.

**Rationale.** This guarantees invalid combinations can never be presented (e.g. leaderboards without the
point system, or powerups without the level system), from one central rule set.

**Consequences.** Disabling one foundational feature safely cascades to everything that depends on it —
navigation, routing and evaluation alike — without each consumer having to re-check prerequisites.

### ADR-6 — Points computed on demand as a single source of truth

**Decision.** A member's total points are produced by a single computation that combines contribution,
manual and quiz points, executed as one set-based database query.

**Rationale.** Performing the aggregation in the database is efficient even when computing points for the
whole membership at once (as the leaderboards do), and having exactly one definition of "points" avoids
divergent results.

**Consequences.** One authoritative definition of points is shared by the leaderboards, the level system,
the cooperative progress bar, and point-based achievements.

### ADR-7 — Achievements awarded lazily as members use the app (no scheduler)

**Decision.** Achievements are evaluated opportunistically whenever an authenticated member opens a page
(while the Badges feature is enabled), rather than by a background job.

**Rationale.** It avoids running and operating any scheduling infrastructure and keeps the app a single
web process; awards are applied idempotently, so re-evaluation is harmless.

**Consequences.** No background infrastructure is required; the trade-off is that an award is only
granted once the member is next active, and a lightweight check runs as they navigate (bounded to their
still-unearned achievements).

### ADR-8 — Correctness delegated to the database

**Decision.** Data integrity and idempotency are enforced at the database level: uniqueness rules (one
contribution per member per meeting, one submission per member per quiz, one award per member per
achievement), value constraints (quiz points and validity ranges), and locking for the operations that
must not race (automatic streak-freeze consumption and powerup usage).

**Rationale.** Enforcing invariants at the source of truth prevents duplication and race conditions
regardless of how the application code is called.

**Consequences.** Concurrency and duplication bugs are prevented structurally; the application can rely on
these guarantees instead of pre-checking before every write.

### ADR-9 — ORM with generated, never-hand-edited migrations

**Decision.** Persistence uses an ORM with the schema defined in one place; database migrations are
**generated** from that schema, and the generated migrations are not edited by hand.

**Rationale.** `AGENTS.md` explicitly forbids editing the generated migrations. A single, type-safe schema
definition with generated migrations keeps the database reproducible.

**Consequences.** The schema definition is the single source of truth and migrations are reproducible;
manual edits to generated migrations are prohibited to avoid divergence.

### ADR-10 — Stateless sessions with pluggable sign-in (SSO in production, credentials for showcase)

**Decision.** Authentication uses stateless (token) sessions, with **Microsoft Entra ID single sign-on as
the production sign-in method** and a small number of username/password accounts available **only for
showcase/test** use.

**Rationale.** Stateless sessions avoid operating a session store, and making the SSO provider optional
lets the very same code run as a simple local/showcase setup or as an enterprise SSO deployment purely
through environment configuration.

**Consequences.** No server-side session store is needed; a production deployment authenticates members
via Entra ID, while the credential accounts exist only to run the app without SSO for demos and showcase
instances.

### ADR-11 — Admin protection returns 404 and is enforced in depth

**Decision.** Non-administrator access to admin functionality yields a **404** rather than a 403, and the
check is applied both at the boundary of the admin area and again on every individual admin operation.

**Rationale.** Returning 404 avoids revealing that protected functionality exists at all; re-checking on
each operation is defense in depth so the protection cannot be bypassed by invoking an operation
directly.

**Consequences.** The admin surface is invisible and unreachable to non-administrators; the redundant
checks are intentional.

### ADR-12 — Strict UI and content conventions

**Decision.** All UI is built from the shared shadcn/ui component library (no ad-hoc markup or CSS for UI
elements); all user-facing text goes through the English/German dictionaries; dark/light mode uses theme
tokens; and layouts must work on both mobile and desktop.

**Rationale.** `AGENTS.md` mandates the component library, the dictionaries, theme-token dark mode, and
responsive patterns. These conventions make the UI consistent, fully localizable, and theme- and
device-safe by construction.

**Consequences.** A consistent look-and-feel and complete localization; in exchange, contributors must
add copy to both dictionaries and reuse the shared components rather than introducing bespoke markup.
