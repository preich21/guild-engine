# Guild Engine Showcase

A self-contained demo stack, pre-loaded with sample data.

## Prerequisites

Please make sure you have `docker` installed on your system.

If not, see [the official installation guide](https://docs.docker.com/engine/install/).

## Start

From the root of the repository, run:

```bash
docker compose -f showcase/showcase-compose.yaml up -d --build
```

Then open [http://localhost:3000](http://localhost:3000).

This uses the same ports as the regular dev `compose.yaml` (3000 / 5432), so
stop that stack first if it's running (`docker compose down`).

## Reset

```bash
docker compose -f showcase/showcase-compose.yaml down -v
```

## Login

Use one of the following two users to log in to the showcase:

| Username   | Password   | What you get                                                            |
|------------|------------|-------------------------------------------------------------------------|
| `testuser` | `Start123` | Regular member view - points, quizzes, achievements                     |
| `admin`    | `Start123` | Full admin access - configure quizzes, achievements, teams, rules, etc. |
