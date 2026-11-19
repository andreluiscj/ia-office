# Project structure (new projects only)

Principle: group by domain, keep each module's surface small, and make the dependency direction obvious. `app`/routes depend on modules; modules depend on `lib`; nothing depends on `app`.

## Web app (Next.js App Router)

```
src/
  app/                  routes, layouts, server actions: thin, call modules
  modules/
    <domain>/           e.g. billing, auth, projects
      index.ts          the only file other modules import
      service.ts        business rules
      repo.ts           database access for this domain
      schema.ts         Zod schemas and types
      components/       UI used only by this domain
      *.test.ts         unit tests next to the code
  components/ui/        shared, presentational components (shadcn)
  lib/                  cross-cutting: db client, env, logger, errors
tests/e2e/              Playwright
supabase/migrations/    or db/migrations/
.empresa/               plan, ADRs, handoff, lessons (Office working files)
```

## API service

```
src/
  routes/               HTTP only: parse, call module, map errors to status codes
  modules/<domain>/     index.ts, service.ts, repo.ts, schema.ts, tests
  lib/                  db, env, logger, errors, auth middleware
tests/integration/
db/migrations/
```

## Monorepo (only when there are really two deployables sharing code)

```
apps/web  apps/api  packages/shared (schemas, types)  packages/ui
```

Do not start with a monorepo for a single app.

## Rules

- A module imports another module only through its `index.ts`.
- Routes and components never query the database directly.
- Validation schemas live with the module and are reused by client forms and server handlers.
- One error type hierarchy in `lib/errors`; routes translate it to the contract's error format.
- No `utils/` dumping ground: a helper lives in the module that uses it until a second module needs it.
