# Stack defaults (new projects only)

An existing project keeps its stack. These are defaults, not rules: deviate when a requirement says so, and write the reason in the ADR. Confirm current versions and APIs through Context7 before writing them into a design.

| Concern | Default | Why |
| --- | --- | --- |
| Language | TypeScript, `strict: true` | one language front and back, errors caught at compile time |
| Web app | Next.js (App Router) or Vite + React for a pure SPA | mainstream, well documented |
| Styling and components | Tailwind CSS + shadcn/ui; 21st.dev components adapted to project tokens | accessible primitives, owned code |
| Validation | Zod schemas at every boundary, shared between client and server | one source of truth for shapes |
| Database | PostgreSQL; Supabase when auth/storage/realtime are needed | relational integrity by default |
| Supabase rule | **RLS enabled on every table, with policies, before any client code touches it**; `service_role` key never leaves the server | the most common leak in generated apps |
| Migrations | versioned SQL files in the repo; never edited after being applied | reproducible, reviewable |
| Auth | the platform's auth (Supabase Auth, Auth.js); never hand-rolled password storage | fewer ways to get it wrong |
| Tests | Vitest (unit/component), Playwright (E2E) | fast, standard |
| Lint/format | ESLint + Prettier, or Biome | one command, no debate |
| Config | environment variables validated at startup with a schema; `.env.example` committed, `.env` ignored | fail fast, no secrets in git |
| Logs | structured JSON, no personal data or secrets | searchable, safe |

Other ecosystems the project may already use: Laravel (Eloquent, Form Requests, policies), Python (FastAPI + Pydantic, or Django). Follow the framework's conventions rather than importing patterns from another stack.

## Non-functional defaults

- Performance (web): LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 at the 75th percentile on mobile.
- Accessibility: WCAG 2.2 AA.
- API: every list endpoint paginated; every mutation validated server-side; timeouts on every outbound call.
