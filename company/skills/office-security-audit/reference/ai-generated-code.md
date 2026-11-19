# Failure modes of AI-generated code

Generated code tends to work on the happy path and look complete, so these gaps survive demos. On a first audit of a project, or when most of the code was generated, sweep this list before the area references: each line points to the reference with the full check.

| # | Typical failure | Quick check | Reference |
| --- | --- | --- | --- |
| 1 | API keys or service keys in front-end code or committed `.env` | search the client bundle and git history for key names and prefixes | secrets-config |
| 2 | Database tables with no row-level security, reachable with the public key | list tables with RLS off; query as anonymous on the local stack | access-control |
| 3 | Authorization only in the UI (hidden buttons, client route guards) | call the endpoint directly as another user | access-control |
| 4 | Records fetched by id without an ownership filter (IDOR) | change the id as user A to user B's | access-control |
| 5 | Validation only in the form, none on the server | send the request without the client | input-injection |
| 6 | No rate limit on login, sign-up, reset, AI or email endpoints | repeat the call quickly | secrets-config, auth-session |
| 7 | Hand-rolled auth: plain or fast-hashed passwords, tokens that never expire, JWT in `localStorage` | read the auth code and cookie flags | auth-session |
| 8 | Raw SQL built with string interpolation | search for template literals in queries | input-injection |
| 9 | HTML injected from data (`dangerouslySetInnerHTML`, `v-html`) | search for the sinks | input-injection |
| 10 | Wide-open CORS (`*` with credentials, reflected origin) | read the CORS config and response headers | secrets-config |
| 11 | Verbose errors and stack traces returned to the client; debug mode on | trigger an error | secrets-config |
| 12 | Invented or misspelled package names; unneeded dependencies with install scripts | check each new package exists and is the intended one | supply-chain |
| 13 | Webhooks accepted without signature verification | post a forged payload locally | input-injection |
| 14 | Payments: price, plan or amount trusted from the client | change the amount in the request | access-control |
| 15 | File uploads with no type or size limit, stored in a public bucket | upload an oversized or wrong-type file; request it anonymously | input-injection, access-control |
| 16 | Admin or seed accounts with default passwords; test routes left in | search for seed data and unreferenced routes | secrets-config |
| 17 | Tests that assert nothing, are skipped, or mock the thing under test | read the tests for the security-relevant paths | — |
| 18 | LLM features where the model's output is rendered or executed directly | read where the output goes | llm |

Report only what you proved. Every row that fails becomes a finding with the template from the playbook.
