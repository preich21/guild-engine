# Guild Engine — Documentation

Reference documentation for the **Guild Engine**, a configurable gamification tracking tool for a
voluntary workplace knowledge-sharing meeting (Next.js + PostgreSQL). These documents were written as
factual context for the accompanying master's thesis.

## Contents

| Document | What it covers |
| --- | --- |
| [`app-description.md`](./app-description.md) | Functional/domain description: purpose, users, the core loop, the feature catalogue (gamification mechanics), the highly-configurable nature, and a page walkthrough. |
| [`architecture.md`](./architecture.md) | Technical architecture: technology stack, routing/rendering/i18n, authentication and request guarding, the data layer, the feature-configuration system, the server-side business logic (incl. the central `loadUserPointTotals`), testing, and deployment. |
| [`architecture-diagrams.md`](./architecture-diagrams.md) | Mermaid diagrams at C4 abstraction levels (Context → Container → Component), plus the point-calculation data flow, the `proxy.ts` request/redirect flow, and the entity–relationship data model. |
| [`architecture-decisions.md`](./architecture-decisions.md) | Deliberate architectural decisions inferred from the code, `AGENTS.md`, and the feature-configuration catalog, in a lightweight ADR format. |

## Notes on accuracy

- Statements are grounded in the current source tree (paths relative to the repository root) and in the
  running, seeded *showcase* instance. Values that are only *example configuration* of the seeded
  instance (rather than code defaults) are labelled as such.
- The diagrams are Mermaid; render them in any Mermaid-capable viewer (e.g. a Mermaid live editor, or a
  Markdown preview with Mermaid support).
- Anything that could not be verified from the code is marked `[TODO:unclear]`.
