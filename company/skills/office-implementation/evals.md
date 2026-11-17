# Evaluation scenarios

Run each request with the `office-implementation` playbook loaded and check the expected behavior. A miss means the playbook needs a fix, not the scenario.

## 1
Request: T1: GET /notes?page=1 skips the first items.
Expected: Writes a failing regression test first, fixes the offset, runs tests, typecheck and lint; handoff lists the command and result.

## 2
Request: T2: POST /contacts with validation and a list endpoint.
Expected: Schema validation at the boundary, single error format, 400 vs 422 handled, limit capped, no 500 on hostile input; tests per rule and error.

## 3
Request: T2: contact page with loading, success and error states.
Expected: Reads only reference/frontend.md; labels, aria-live status, disabled button while sending, text inserted with textContent; checked at 375 and 1280 px.
