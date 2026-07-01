# Guild Engine — Architecture Diagrams

This document collects the architecture diagrams in [Mermaid](https://mermaid.js.org/) format. They are
organised roughly along the **C4 model** abstraction levels (System Context → Container → Component),
followed by three focused diagrams: the central **point-calculation data flow**, the **request /
auth / redirect flow** implemented in `proxy.ts`, and the **domain data model** (entity–relationship).

See [`architecture.md`](./architecture.md) for the prose descriptions these diagrams summarise.

---

## L1 — System Context

The system, its human actors and its external dependencies.

```mermaid
flowchart TB
    user["Regular user<br/>(guild member)"]
    admin["Administrator"]
    ge["<b>Guild Engine</b><br/>Next.js web app<br/>gamification tracking and configuration"]
    db[("PostgreSQL<br/>database")]
    entra["Microsoft Entra ID<br/>(optional OIDC single sign-on)"]

    user -->|"self-reports contributions,<br/>views leaderboards, uses powerups"| ge
    admin -->|"configures features, metrics, meetings,<br/>achievements, quizzes, rules"| ge
    ge -->|"reads / writes via Drizzle ORM"| db
    ge -.->|"optional single sign-on"| entra
```

## L2 — Containers

The main runtime building blocks inside the deployment. The Next.js app is a single server-side
container; the browser renders server components and invokes server actions.

```mermaid
flowchart TB
    user(["User / Admin browser"])
    entra["Microsoft Entra ID"]

    subgraph docker["Docker deployment"]
        subgraph next["Next.js application (standalone server)"]
            proxy["proxy.ts<br/>request guarding, locale and<br/>feature-route gating"]
            auth["auth.ts<br/>NextAuth v5 (JWT sessions)"]
            pages["Server Components<br/>(RSC pages + root layout)"]
            actions["Server Actions<br/>(colocated actions.ts)"]
            libs["Business logic (src/lib)<br/>point-calculation, level-system,<br/>streaks, achievements, role-raffle"]
            fflags["feature-flags and<br/>feature-config-server"]
            i18n["i18n dictionaries<br/>(en / de)"]
        end
        db[("PostgreSQL")]
    end

    user -->|"HTTP request"| proxy
    user -->|"invoke server action"| actions
    proxy --> auth
    proxy --> fflags
    proxy --> pages
    pages --> libs
    pages --> i18n
    pages --> fflags
    actions --> auth
    actions --> libs
    actions --> fflags
    libs --> db
    fflags --> db
    auth --> db
    auth -.-> entra
```

## L3 — Components (server side)

The server-side modules and how they collaborate. `point-calculation.loadUserPointTotals` (bold) is the
central scoring function reused across the app.

```mermaid
flowchart TB
    subgraph edge["Cross-cutting"]
        proxy["proxy.ts"]
        auth["auth.ts + lib/auth/*<br/>requireCurrentUserAdmin"]
    end

    subgraph config["Feature configuration"]
        catalog["feature-configuration.json<br/>(static catalog)"]
        fflags["feature-flags.ts<br/>merge + prerequisite fixpoint<br/>isRouteEnabled"]
        fcs["feature-config-server.ts<br/>loadCurrentFeatureConfig (cached)"]
    end

    subgraph actionsL["Server Actions (per route)"]
        aTrack["track-contributions/actions"]
        aLeader["leaderboard/actions"]
        aCoop["cooperative-progress/actions"]
        aProfile["user/[uuid]/actions<br/>openLootbox, usePowerup"]
        aAdmin["admin/* actions<br/>metrics, meetings, quizzes,<br/>achievements, manual points,<br/>feature-config, rules"]
    end

    subgraph domain["Domain logic (src/lib)"]
        pc["point-calculation.ts<br/><b>loadUserPointTotals</b>"]
        lvl["level-system.ts<br/>(+ lootbox award)"]
        streaks["streaks.ts<br/>(+ auto streak-freeze)"]
        rank["leaderboard-ranking.ts"]
        ach["achievement-evaluation(.core).ts"]
        raffle["role-raffle.ts"]
    end

    db[("PostgreSQL<br/>via Drizzle ORM")]

    proxy --> fflags
    proxy --> fcs
    fcs --> catalog
    fcs --> fflags
    fcs --> db

    aTrack --> db
    aLeader --> pc
    aLeader --> rank
    aLeader --> lvl
    aCoop --> pc
    aProfile --> lvl
    aProfile --> db
    aAdmin --> auth
    aAdmin --> db

    pc --> fcs
    pc --> db
    lvl --> pc
    lvl --> db
    streaks --> db
    ach --> pc
    ach --> rank
    ach --> db
    raffle --> db
```

## Point-calculation data flow

How `loadUserPointTotals` (in `src/lib/point-calculation.ts`) combines its inputs into a single total,
and which features consume that total.

```mermaid
flowchart LR
    subgraph inputs["Inputs (DB tables)"]
        pm["performance_metrics<br/>enum / integer + points"]
        tc["tracked_contributions<br/>per user and meeting"]
        gm["guild_meetings<br/>past meetings only"]
        pu["powerup_utilization<br/>point multipliers"]
        mp["manual_points"]
        qs["quiz_submissions"]
        q["quizzes (points)"]
    end

    subgraph calc["loadUserPointTotals() - one SQL CTE"]
        c1["tracked-contribution points<br/>enum: points at index value<br/>integer: perUnit x value<br/>x per-meeting multiplier factor"]
        c2["manual points<br/>sum(points)"]
        c3["quiz points<br/>sum(quiz.points)"]
        total["totalPoints per user"]
    end

    subgraph consumers["Consumers"]
        lb["Individual and Team<br/>leaderboards"]
        lv["Level system<br/>(+ lootboxes)"]
        co["Cooperative<br/>progress bar"]
        fa["Feature-based<br/>achievements"]
    end

    pm --> c1
    tc --> c1
    gm --> c1
    pu --> c1
    mp --> c2
    qs --> c3
    q --> c3
    c1 --> total
    c2 --> total
    c3 --> total
    total --> lb
    total --> lv
    total --> co
    total --> fa
```

## Request / auth / redirect flow (`proxy.ts`)

The decision tree applied to every matched request before a page renders.

```mermaid
flowchart TD
    start(["Incoming request"]) --> hasLocale{"Path has<br/>locale prefix?"}
    hasLocale -- no --> addLocale["Redirect: prepend defaultLocale"]
    hasLocale -- yes --> legacy{"/protocol-raffle ?"}
    legacy -- yes --> toRaffle["Redirect to /role-raffle"]
    legacy -- no --> authed{"Authenticated?"}
    authed -- no --> onLogin{"On /login ?"}
    onLogin -- no --> toLogin["Redirect to /login?next=..."]
    onLogin -- yes --> allow["Continue (render)"]
    authed -- yes --> registered{"Has user record?"}
    registered -- no --> onReg{"On /register ?"}
    onReg -- no --> toReg["Redirect to /register"]
    onReg -- yes --> allow
    registered -- yes --> onEntry{"On /login, /register<br/>or bare locale root ?"}
    onEntry -- yes --> toHome["Redirect to configured home page"]
    onEntry -- no --> routeEnabled{"isRouteEnabled?<br/>(feature flags)"}
    routeEnabled -- no --> notFound["Rewrite to /404"]
    routeEnabled -- yes --> allow
```

## Domain data model (entity–relationship)

The PostgreSQL schema (`src/db/schema.ts`). Foreign keys are shown as relationships. Note that
`performance_metrics` is linked to `tracked_contributions` only *logically* (metric ids are stored
inside the `tracked_contributions.data` JSONB array), not via a database foreign key.

```mermaid
erDiagram
    team {
        uuid id PK
        varchar name
    }
    users {
        uuid id PK
        varchar username
        varchar external_id
        boolean admin
        varchar preferred_lang
        uuid team_id FK
    }
    guild_meetings {
        uuid id PK
        timestamptz timestamp
    }
    performance_metrics {
        uuid id PK
        varchar short_name
        varchar question
        smallint type "0=enum, 1=integer"
        varchar enum_possibilities
        varchar points
    }
    tracked_contributions {
        uuid id PK
        uuid user_id FK
        uuid meeting_id FK
        jsonb data "array of metricId + value"
    }
    manual_points {
        uuid id PK
        uuid user_id FK
        smallint points
        text reason
    }
    quizzes {
        uuid id PK
        uuid modified_by FK
        varchar title
        timestamptz valid_from
        timestamptz valid_to
        smallint points
        jsonb data
    }
    quiz_submissions {
        uuid id PK
        uuid user_id FK
        uuid quiz_id FK
        timestamptz timestamp
    }
    achievements {
        uuid id PK
        varchar title
        text description
        varchar image
        jsonb criteria
    }
    user_achievements {
        uuid id PK
        uuid user_id FK
        uuid achievement_id FK
    }
    user_levels {
        uuid user_id PK
        integer current_level
        timestamptz last_level_up
    }
    user_powerups {
        uuid user_id PK
        smallint lootboxes
        smallint small_point_multiplicators
        smallint medium_point_multiplicators
        smallint large_point_multiplicators
        smallint streak_freezes
        smallint role_presents
        smallint role_shields
    }
    powerup_utilization {
        uuid id PK
        uuid meeting_id FK
        uuid user_id FK
        varchar powerup
        jsonb settings
    }
    activated_streak_freezes {
        uuid user_id PK "FK to users"
        uuid meeting_id PK "FK to guild_meetings"
        timestamptz timestamp
    }
    feature_config {
        uuid id PK
        timestamptz timestamp
        uuid modifying_user FK
        varchar home_page_path
    }
    rules {
        uuid id PK
        timestamptz timestamp
        varchar language_code
        text content
    }

    team ||--o{ users : "team_id"
    users ||--o{ tracked_contributions : "user_id"
    guild_meetings ||--o{ tracked_contributions : "meeting_id"
    users ||--o{ manual_points : "user_id"
    users ||--o{ quiz_submissions : "user_id"
    quizzes ||--o{ quiz_submissions : "quiz_id"
    users ||--o{ user_achievements : "user_id"
    achievements ||--o{ user_achievements : "achievement_id"
    users ||--|| user_levels : "user_id"
    users ||--|| user_powerups : "user_id"
    users ||--o{ powerup_utilization : "user_id"
    guild_meetings ||--o{ powerup_utilization : "meeting_id"
    users ||--o{ activated_streak_freezes : "user_id"
    guild_meetings ||--o{ activated_streak_freezes : "meeting_id"
    users ||--o{ feature_config : "modifying_user (nullable)"
    users ||--o{ quizzes : "modified_by (nullable)"
```

> `feature_config` also holds one boolean `*_enabled` column and one JSONB `*_config` column per
> feature (point-system, individual/team leaderboard, level-system, badges, cooperative-progress-bar,
> streaks, minigames, powerups); these are omitted from the diagram for brevity. Each save inserts a new
> row (append-only versioning).
