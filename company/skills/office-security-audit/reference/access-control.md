# Access control

Broken access control is the first item of the OWASP Top 10. Most real leaks are here: the user is logged in, and nobody checked whether *this* record is theirs.

## Check

- [ ] Every protected route and server action checks authorization **on the server**. Hidden buttons and client route guards are not access control.
- [ ] Ownership is checked per resource: the query filters by the authenticated user or tenant (`WHERE id = ? AND owner_id = ?`), or a policy does. Changing an id in the URL or body must not return another user's record (IDOR).
- [ ] The user or tenant id comes from the session, never from the request body, query or a client header.
- [ ] Deny by default: a new route is protected unless explicitly made public.
- [ ] Role and plan checks happen on the server for every admin or paid action. A user cannot set their own role, plan, price or `is_admin` through any writable field (mass assignment): input schemas allow only expected fields.
- [ ] List and search endpoints are scoped to what the user may see; no "fetch all then filter in the client".
- [ ] File and object storage: private by default; downloads go through an authorization check or short-lived signed URLs; no guessable public paths for private files.
- [ ] Unauthorized access to a resource that exists returns the same response as one that does not (404), where existence itself is sensitive.
- [ ] `L2` Multi-tenant: every table carrying tenant data has the tenant key and every query or policy filters on it; background jobs and caches are tenant-scoped too.
- [ ] `L2` Admin actions are logged with who, what and when.

## Supabase and other row-level-security databases

- [ ] RLS is **enabled on every table** in exposed schemas. A table without RLS is readable and writable by anyone holding the public anon key.
- [ ] Each table has explicit policies per operation (`select`, `insert`, `update`, `delete`). `update` policies have both `using` and `with check`, so a row cannot be moved to another owner.
- [ ] Policies compare against `auth.uid()` (or the tenant claim), not against a column the client can set freely.
- [ ] No policy of the form `using (true)` on a table with private data.
- [ ] The `service_role` key is used only on the server and never shipped to the browser or committed.
- [ ] Storage buckets have policies; private buckets are not public.
- [ ] Database functions exposed through the API are reviewed: `security definer` functions validate the caller.
- [ ] Views do not bypass RLS (use `security_invoker` where supported).

## How to prove

- Two test users, A and B. As A, request B's resource by id: read, update, delete. Each must fail.
- As a normal user, call an admin endpoint directly.
- Send extra fields (`role`, `owner_id`, `price`) in a create/update body; they must be ignored or rejected.
- Supabase: with only the anon key and no session, query each table through the REST endpoint of the **local** stack; private tables must return nothing. List tables with RLS disabled from the catalog (`pg_tables.rowsecurity`).
