# Guild Engine — Application Description

> A configurable gamification tracking tool for a voluntary workplace knowledge-sharing meeting.
> Built with Next.js and PostgreSQL. Created in the scope of a master's thesis.

This document describes *what* the application is and does, from a functional and domain point of
view. For the technical architecture see [`architecture.md`](./architecture.md); for diagrams see
[`architecture-diagrams.md`](./architecture-diagrams.md); for design decisions see
[`architecture-decisions.md`](./architecture-decisions.md).

> Terminology in this document uses **points**, **performance metrics**, **contributions**, **streaks**,
> **achievements/badges**, **powerups** and **minigames** consistently with the other documents.

All facts below were taken from the source code and from the running, seeded "showcase" instance.
Where a value is only an *example configuration* of the seeded instance (as opposed to a hard-coded
default), this is stated explicitly.

---

## 1. Purpose and domain

The Guild Engine is the tracking tool for a gamification concept applied to a **voluntary, recurring
workplace knowledge-sharing meeting** — internally called a *guild meeting*.
The goal of the gamification is to encourage participation and
contribution in such meetings.

The core idea:

1. Administrators define, per their own meeting culture, which kinds of contributions are worth
   tracking (**performance metrics**) and schedule the concrete **meetings**.
2. Members **self-report** their contributions for each meeting.
3. The application turns this activity into a set of gamification mechanics:
   - **Points** are derived from the reported contributions and drive the **leaderboards**, the
     **level system**, and the **cooperative progress bar**.
   - **Streaks** are derived **directly from a performance metric** (consecutive meetings that fulfilled
     it) — independent of the point system.
   - **Minigames** (role raffle, quizzes) are **independent** of both points and metrics.
   - **Achievements/badges** can be based on **almost any signal** (points, a metric, a streak, level,
     leaderboard position, powerup usage, quizzes …), not only points.

Because the "right" gamification design depends heavily on the concrete meeting, group and culture,
the application is deliberately **highly configurable**: almost every mechanic is a feature that can be
enabled, disabled and parameterized by an administrator at runtime (see §5).

## 2. Users and roles

There are two kinds of principals, distinguished by a single `admin` boolean flag on the user record:

- **Regular users** (guild members) — self-report contributions, view leaderboards and the cooperative
  progress bar, level up, earn badges, keep streaks, and use minigames and powerups.
- **Administrators** — everything a regular user can do, plus access to the `/admin` area used to
  configure the application (features, performance metrics, meetings, achievements, quizzes, manual
  points, rules).

Authentication supports two mechanisms (see [`architecture.md`](./architecture.md) §4):

- **Microsoft Entra ID (Azure AD) single sign-on** — the **normal way users authenticate in
  production**, enabled when the corresponding environment variables are configured.
- **Username/password credentials** — a small number of accounts supplied via environment variables,
  intended **only for showcase/test purposes** (e.g. the seeded `testuser` and `admin`). A production
  deployment authenticates its members via Microsoft Entra ID.

The interface is **locale-first**: every user-facing page lives under a language prefix, and the app
ships with **English (`en`)** and **German (`de`)** dictionaries. Each user has a preferred language.

## 3. The core loop

Performance metrics are typically defined **once**, during the initial configuration of an instance,
and are rarely touched again afterwards. The recurring loop is the per-meeting self-reporting and the
mechanics it feeds:

```
Admin (usually once): defines performance metrics + schedules guild meetings
                                    │
Member self-reports contributions per meeting  ("Track Contributions")
                                    │
        ┌───────────────────────────┼──────────────────────────────┐
        ▼                            ▼                              ▼
 Points = contributions        Streaks                     Minigames
 (+ manual + quiz points)      (consecutive meetings        (role raffle, quizzes)
        │                       fulfilling a metric —        — independent of
        ▼                       no points involved)          points and metrics
 Point-based surfaces:
   • Individual & Team leaderboards
   • Level system (+ lootboxes → powerups)
   • Cooperative progress bar

 Achievements / badges: awarded from almost any signal
   (points, a metric, a streak, level, leaderboard position, powerup usage, quizzes …)
```

### Performance metrics

A **performance metric** is an admin-defined, tracked contribution category. Each metric has a short
name, a question shown to the user (with a `[date]` placeholder for the meeting date), a type, and a
points configuration. There are two metric **types**:

- **Enum metric** — a fixed set of `;`-separated answer options; each option maps to a fixed point
  value (also `;`-separated). Rendered as a radio group.
- **Integer metric** — a numeric count; points are computed as *points-per-unit × the entered count*.
  Rendered as a number input.

**Example configuration (seeded showcase instance):**

| Metric           | Type    | Options → points                                                |
|------------------|---------|-----------------------------------------------------------------|
| Attendance       | Enum    | `No; Yes, on-site; Yes, online` → `0;10;5`                      |
| Working groups   | Enum    | `No; Yes` → `0;10`                                              |
| Protocol         | Enum    | `No; Yes, voluntarily; Yes, forced; Yes, gifted` → `0;20;15;25` |
| Moderation       | Enum    | `No; Yes, voluntarily; Yes, forced; Yes, gifted` → `0;35;30;40` |
| Today We Learned | Integer | 10 points per posted contribution                               |
| Talks            | Integer | 50 points per talk                                              |

*(Labels are translated to English here for readability; the showcase instance itself is configured
with German labels.)*

### Tracking contributions

On the **Track Contributions** page a member selects a meeting (previous/next/date picker) and answers
each metric's question. The form is generated dynamically from the configured metrics (enum → radios,
integer → number field). Answers are stored as one record per user per meeting.

### Point calculation

A user's **total points** are the sum of three sources (see [`architecture.md`](./architecture.md)
for the exact algorithm):

- **Tracked-contribution points** — per metric, using the enum/integer scoring above, but only for
  meetings that have already taken place, and optionally scaled by a point-multiplier powerup the user
  activated for that meeting.
- **Manual points** — ad-hoc points granted by an administrator with a reason.
- **Quiz points** — a flat amount awarded once for completing a quiz.

The leaderboards, the level system and the cooperative progress bar all build on this single total (as
do those achievement criteria that reference points).

## 4. Feature catalogue (gamification mechanics)

The following user-facing features exist. Each is individually toggleable and (where applicable)
parameterizable by an administrator (see §5). Defaults listed are the *catalog* defaults from
`src/config/feature-configuration.json`; the seeded showcase instance may configure different values.

- **Point System** — translates tracked performance metrics into point values. Prerequisite for most
  other features.
- **Individual Leaderboard** — ranks all users by total points (competition-style ties). Configurable
  optional start date (points before it are ignored).
- **Team Leaderboard** — ranks teams by aggregated member points; the aggregation is configurable as
  **Sum** or **Average**. Optional start date.
- **Level System** — per-user levels derived from points. Configurable *first-level points* (points
  needed for level 1) and a *per-level multiplier* (each subsequent level costs the multiplier times
  the previous one; multiplier = 1 means linear levels). Leveling up grants **lootboxes**.
- **Badges** — an achievement system that awards badges based on the other features (see below).
- **Cooperative Progress Bar** — a shared progress bar toward a configurable **goal**, filled by the
  aggregated points (Sum/Average) of all users. Has a configurable title (shown in the top bar and on a
  dedicated page listing top contributors) and optional start date.
- **Streaks** — counts how many consecutive meetings a user fulfilled a chosen performance metric.
  Configurable *which metric* and *which of its values* count. Can be protected by a Streak Freeze
  powerup.
- **Minigames** — helper implementations for in-app minigames, with two sub-toggles:
  - **Role Raffle** — a wheel-of-fortune that randomly assigns a role among selected users (e.g. who
    keeps the minutes). Interacts with the Role Shield / Role Present powerups. Spinning the wheel has no effect inside the app and is meant to be used as an aid during a meeting instance.
  - **Quizzes** — admin-authored quizzes (multiple-choice / numeric questions supplied as JSON) with a
    validity window and a flat point reward. Members take a quiz once to earn its points. Per the
    catalog description, quizzes can e.g. reinforce the content of a contribution held during a meeting.
- **Powerups** — virtual items randomly unlocked by opening lootboxes (earned by leveling up). Each
  powerup type is individually toggleable, with a *frequency* weight controlling how likely it is to be
  drawn from a lootbox:
  - **Small / Medium / Large Point Multiplier** — multiply the points earned for one (future) meeting
    by a configurable factor (catalog defaults 2× / 3× / 4×).
  - **Streak Freeze** — skip a meeting without breaking the streak. Configurable auto-apply timeout
    (default 72 hours after a meeting).
  - **Role Present** — force another user to receive a specific role for one meeting (can be countered
    by a Role Shield).
  - **Role Shield** — opt out of a role raffle in advance, or counter one Role Present.

> Note: the seeded showcase instance configures the multipliers as **1.2× / 1.5× / 2.0×** with draw
> frequencies 5 / 2 / 1, streak-freeze frequency 10 (auto-apply 72 h), role-present frequency 2 and
> role-shield frequency 5 — these are *administrator settings of that instance*, not the code defaults.

### Achievements / badges in detail

An achievement has a title, description, image and a **criteria** definition. The criteria supports
four modes:

- **manual** — only ever granted by an administrator (via the *Award Achievements* page).
- **defined** — based on a performance metric over past contributions, either a **count** (N qualifying
  meetings within a time frame, compared with an operator) or a **streak** (N consecutive most-recent
  meetings all qualify).
- **feature** — a threshold on a feature-derived value: total points, individual/team leaderboard
  position, level, achievement count, powerup usage, or quizzes completed.
- **position** — the user's current leaderboard rank (individual or team).

Achievements are evaluated opportunistically whenever an authenticated user opens a page (while the
Badges feature is enabled) and awarded once each.

## 5. Highly-configurable nature

The defining characteristic of the application is that the gamification design is **not hard-coded** —
it is data, managed at runtime through the `/admin` area:

- **Feature Configuration** — a single page to enable/disable every feature above and set its
  parameters. Saving takes effect immediately for all users. Features declare **prerequisites** (e.g.
  the leaderboards, level system and cooperative bar all require the Point System; powerups require the
  Level System). Disabling a prerequisite automatically **cascades**: dependent features are treated as
  disabled. The page also records who last edited it and when.
- **Configurable home page** — administrators set which enabled feature page users land on (the seeded
  instance uses the individual leaderboard).
- Disabled features are hidden from navigation and their routes return **404**, so the app's surface
  area matches the current configuration.

Because of this, two deployments of the same code can present very different gamification experiences.

## 6. Page walkthrough

### User-facing pages (under `/{lang}/…`)

| Page                       | Purpose                                                                                                                                                                    |
|----------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Login**                  | Username/password sign-in; optional "Continue with Microsoft" (Entra ID).                                                                                                  |
| **Register**               | Shown to authenticated SSO users without a profile yet — completes their profile.                                                                                          |
| **Profile** (`/user/{id}`) | Avatar, level & progress, leaderboard placement, current streak, earned achievements, powerup inventory (incl. opening lootboxes and using powerups), and profile editing. |
| **Track Contributions**    | Self-report performance-metric answers per selected meeting.                                                                                                               |
| **Individual Leaderboard** | Ranked users with level, attendance streak, badges and total points.                                                                                                       |
| **Team Leaderboard**       | Ranked teams by aggregated points.                                                                                                                                         |
| **Cooperative Progress**   | The shared progress bar toward the goal, plus top contributors.                                                                                                            |
| **Role Raffle**            | Wheel-of-fortune to assign a role among selected users; list of role presents.                                                                                             |
| **Quizzes**                | List of currently valid quizzes; take a quiz; instructions for authoring your own.                                                                                         |
| **Rules**                  | Administrator-authored markdown rules/《how it works》per language.                                                                                                          |

### Admin pages (under `/{lang}/admin/…`, gated to administrators)

| Page                                 | Configures                                                          |
|--------------------------------------|---------------------------------------------------------------------|
| **Feature Configuration**            | Enable/disable & parameterise all features; set the home page path. |
| **Performance Metric Configuration** | Define scoring metrics (enum/integer, options, points).             |
| **Meetings**                         | Create/delete guild meetings (date + time).                         |
| **Achievements**                     | Define achievements (title, image, criteria).                       |
| **Award Achievements**               | Manually grant/revoke achievements per user.                        |
| **Manual Points**                    | Grant ad-hoc points to a user with a reason.                        |
| **Quiz Management**                  | Create/edit/delete quizzes (JSON data, points, validity window).    |
| **Rules Configuration**              | Edit the per-language rules markdown.                               |
