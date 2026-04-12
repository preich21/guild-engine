# Guild Engine

A gamification tool for voluntary workplace meetings.
Built with Next.js and PostgreSQL.


## Local Development

### Prerequisites

Have the following installed:

- Node.js with pnpm
- Docker

### Database setup

1. Copy the environment template and adjust credentials if needed:

```bash
cp .env.example .env
```

2. Start PostgreSQL with Docker Compose:

```bash
pnpm db:up
```

3. Verify Drizzle can connect:

```bash
pnpm db:check
```

Notes:

- The connection lives in `src/lib/db.ts` and uses `DATABASE_URL`.
- Drizzle is configured in `drizzle.config.ts`.
- No tables or migrations are created yet.
- Stop containers with `pnpm db:down`.

### Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
