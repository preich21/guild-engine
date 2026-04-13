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

If necessary, you can stop the container with `pnpm db:down`.

### Getting Started

Now you can run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
