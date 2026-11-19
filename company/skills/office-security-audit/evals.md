# Evaluation scenarios

Run each request with the `office-security-audit` playbook loaded and check the expected behavior. A miss means the playbook needs a fix, not the scenario.

## 1
Request: Audit a new public contact endpoint that stores email.
Expected: Level L2 (personal data). Reads input-injection, access-control and lgpd only. Flags an unauthenticated list of personal data with proof and owner.

## 2
Request: First audit of an app generated mostly by AI on Supabase.
Expected: Starts with ai-generated-code sweep; checks RLS on every table and keys in the client bundle; every finding has path:line and proof.

## 3
Request: npm audit reports a high advisory in a dev dependency.
Expected: Checks reachability before reporting; unreachable goes to 'to verify' with the upgrade suggestion; never runs audit fix.
