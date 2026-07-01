# Guild Engine — Architecture

This document describes the technical architecture of the Guild Engine: the technology stack, how
requests are routed and guarded, the domain data model, the runtime feature-configuration system, the
core server-side behaviors (including how points are calculated), and deployment.

It is written for a reader without access to the source code — it describes the system's structure and
behavior rather than individual files or functions. It complements the functional
[`app-description.md`](./app-description.md), the visual [`architecture-diagrams.md`](./architecture-diagrams.md),
and [`architecture-decisions.md`](./architecture-decisions.md).

---

## 1. High-level shape

The Guild Engine is a **single Next.js (App Router) web application** backed by a **PostgreSQL**
database. It is server-centric:

- Pages are **server-rendered** and read their data directly on the server.
- Data changes (and most reads) go through **server actions** — server-side operations the browser
  invokes directly. There is no separate REST/GraphQL API beyond the authentication callback endpoint.
- A single, centralized **request guard** applies authentication, locale handling and feature-based
  access control to every request before a page renders.
- All database access goes through an **ORM**; only the heavier aggregation (e.g. computing points
  across all members) drops down to hand-written SQL.

## 2. Technology stack

**Framework / runtime**
- **Next.js 16** (App Router) — a **customised build** with breaking changes relative to upstream; most
  notably, the centralized request guard is expressed through a dedicated entry point rather than the
  conventional middleware file.
- **React 19**, **TypeScript**.

**Data**
- **Drizzle ORM** over **PostgreSQL** (via the standard Node Postgres driver). The schema is defined in
  TypeScript, and database migrations are generated from it.

**Authentication**
- **NextAuth v5** with stateless (JWT) sessions; a username/password provider and a Microsoft Entra ID
  single-sign-on provider.

**UI / styling**
- **shadcn/ui** components on top of **Base UI** primitives; **Tailwind CSS v4**; **lucide** icons;
  **next-themes** for dark/light mode.
- Feature-specific libraries: a wheel-of-fortune component (Role Raffle), a date picker + date utilities
  (meetings, quiz validity), a code editor (authoring quiz/feature JSON), and a Markdown renderer (the
  Rules page).

**Configuration / tooling**
- Environment-variable based configuration; ESLint for linting.

## 3. Routing, rendering and internationalization

- **Locale-first routing.** Every user-facing page lives beneath a language prefix; a request without a
  language prefix is redirected to the default locale. The only non-localized endpoint is the
  authentication callback.
- **Rendering model.** Pages render on the server and pass the data they need down to small interactive
  client components; those client components are what invoke server actions.
- **Internationalization.** The app ships **English** and **German** dictionaries, and these dictionaries
  are the **single source of all user-facing text** — the UI never contains hard-coded copy. The two
  languages are kept in step, and an unrecognized locale yields a "not found" page.

## 4. Authentication and access control

- **Sign-in methods.** Two mechanisms are supported:
  - **Microsoft Entra ID single sign-on** — the method members use **in production**.
  - **Username/password credentials** — a small number of accounts supplied via environment variables,
    intended **only for showcase/test** use.
  The session is stateless (a signed token), so no server-side session store is required. The same code
  runs with or without SSO depending on how the environment is configured.
- **Request-guard pipeline.** Before any page renders, the centralized guard, in order:
  1. adds the default language prefix if the request has none;
  2. redirects an **unauthenticated** visitor to the login page (remembering where they were going);
  3. redirects an **authenticated but not-yet-registered** SSO user to a one-time profile-completion
     page;
  4. redirects an already-signed-in user away from the login/registration pages to their configured
     home page;
  5. **rewrites any request for a disabled feature to a 404**, so the reachable surface always matches
     the current configuration.
- **Administrator protection.** Admin functionality is gated by the single `admin` flag on the member
  record. A non-administrator who reaches an admin area or triggers an admin operation receives a **404
  (not a 403)**, so the existence of admin functionality is never revealed. The check is applied both at
  the boundary of the admin area **and** again on every individual admin operation (defense in depth).

## 5. Domain data model (conceptual)

Persistence uses an ORM with schema-generated migrations. The main domain entities are:

- **Members & Teams** — the participants (with a language preference and an admin flag) and the teams
  they belong to for the team leaderboard.
- **Meetings** — the scheduled guild meetings; whether a meeting is past or upcoming is simply a matter
  of its date.
- **Performance metrics** — the admin-defined, configurable contribution categories (each an *enum* or
  an *integer* metric with its point mapping).
- **Contributions** — a member's self-reported answers for a given meeting (one record per member per
  meeting).
- **Manual points** — administrator-granted ad-hoc points, each with a reason.
- **Quizzes & quiz submissions** — quiz definitions (validity window, point reward, question data) and
  the one-time record of a member completing a quiz.
- **Achievements & awards** — the badge catalogue (each with its earning criteria) and the record of
  which member earned which badge.
- **Levels** — each member's current level and when they last leveled up.
- **Powerups & powerup usage** — each member's powerup inventory, and the record of a powerup being
  activated for a particular meeting.
- **Streak freezes (activated)** — the record that a streak freeze was consumed to cover a missed
  meeting.
- **Feature configuration (versioned)** — the runtime configuration history (see §6).
- **Rules** — the per-language Markdown rules text, versioned over time.

The database enforces the important invariants directly (see §7.7).

## 6. Runtime feature-configuration system

Configurability — the app's defining characteristic — is implemented as a **two-layer** system:

- **Layer 1 — the catalog (fixed, in source).** A source-controlled catalog defines *which features and
  settings can exist*: for each feature, its name/description (localized), whether it is on by default,
  what it can be used as a basis for achievements, its prerequisites, and its typed settings.
- **Layer 2 — the runtime configuration (in the database).** What is *actually* enabled right now is
  stored as a **versioned, append-only history**: every save writes a **new version** recording the full
  feature state, who changed it, and when. The current configuration is simply the latest version. This
  gives an auditable trail (surfaced in the admin UI as "last edited / edited by") and easy rollback.

At runtime the saved configuration is merged over the catalog defaults and then evaluated:

- **Prerequisite cascade.** Features declare prerequisites; a stabilization pass repeatedly treats as
  disabled any feature whose prerequisites are unmet, until the state settles. So turning off a
  foundational feature (e.g. the point system) automatically disables everything that depends on it
  (leaderboards, levels, cooperative bar, …) everywhere at once.
- **Route gating.** Each route is associated with the feature(s) it requires; the request guard uses this
  to 404 disabled routes (see §4).
- **Navigation.** Disabled features are hidden from the navigation, and the **home page** members land on
  is itself configurable.

Saving re-validates every setting value against the catalog before it is written.

## 7. Core behaviors (domain logic)

### 7.1 Point calculation

A member's **total points** are computed on demand as the sum of three sources:

```
total points = contribution points  +  manual points  +  quiz points
```

- **Contribution points** come from the member's reported contributions, scored per metric:
  - an **integer** metric scores *points-per-unit × the reported count*;
  - an **enum** metric scores the fixed value mapped to the chosen option;
  - only meetings that have **already taken place** are counted;
  - a meeting's contribution points are multiplied by any **point-multiplier powerup** the member
    activated for that meeting (the multiplier factor never reduces below 1).
- **Manual points** are the sum of the administrator-granted amounts.
- **Quiz points** are the flat rewards of the quizzes the member has completed.

All three sources can optionally be restricted to a **date window** (used by the leaderboards' and the
cooperative bar's configurable start date). This computation is the **single source of truth** for
points, shared by every point-based surface.

### 7.2 Levels

A member's level is derived from their total points. The points required for each level grow by a
**configurable per-level multiplier**: with a multiplier of 1 the levels are evenly spaced; with a
larger multiplier each level costs progressively more than the last. Reaching a new level grants
**lootboxes** (one per level gained), and a member's stored level only ever moves upward.

### 7.3 Streaks

A streak counts how many **consecutive meetings** a member fulfilled the configured streak metric with
one of its qualifying values. A meeting also counts as "kept" if a **streak-freeze** powerup covered it:
if a member misses a meeting after having attended the previous one, an available streak freeze is
**automatically consumed** (within a configurable time window) to preserve the streak.

### 7.4 Leaderboards, ranking and cooperative progress

- **Individual leaderboard** — members ranked by total points, using **competition-style ranking** (ties
  share a rank).
- **Team leaderboard** — teams ranked by their members' points, aggregated as either a **sum** or an
  **average** (configurable).
- **Cooperative progress bar** — everyone's points aggregated (sum or average) toward a configurable
  **goal**, shown as a percentage alongside the current top contributors.

### 7.5 Achievements

Achievements are **awarded automatically as members use the app** — whenever an authenticated member
opens a page (while the Badges feature is enabled), their outstanding achievements are evaluated and any
newly qualifying ones are granted. There is **no background scheduler**; each achievement is granted at
most once. An achievement whose criterion depends on a feature that is currently disabled is skipped
until that feature is re-enabled.

### 7.6 Powerups and the role raffle

- **Opening a lootbox** performs a **weighted random draw** among the enabled powerup types (each type's
  configured frequency is its weight) and adds the result to the member's inventory.
- **Using a powerup** targets an **upcoming meeting** (a point multiplier, a role shield, or a role
  present), consuming it from the inventory; a member cannot stack duplicates on the same meeting.
- **The role raffle** is a wheel-of-fortune used as an aid during a live meeting; spinning it has no
  persistent effect in the app. The **role present** / **role shield** powerups interact with it (a
  shield can pre-empt or counter a present).

### 7.7 Data integrity and concurrency

Correctness is delegated to the database: **uniqueness rules** guarantee one contribution per member per
meeting, one submission per member per quiz, and one award per member per achievement (so the
corresponding operations are naturally idempotent); **value constraints** guard quiz points and validity
ranges; and **locking** serializes the operations that must not race (automatic streak-freeze
consumption and powerup usage). This prevents duplication and race conditions at the source of truth
rather than only in application code.

## 8. Deployment

The application is packaged as a **self-contained Docker image** and runs alongside a **PostgreSQL**
container; all deployment settings are provided through **environment variables**. A separate
**showcase** stack bundles seed data to run a ready-made demonstration instance.
