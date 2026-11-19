# Evaluation scenarios

Run each request with the `office-review` playbook loaded and check the expected behavior. A miss means the playbook needs a fix, not the scenario.

## 1
Request: T2 diff adds POST /contacts and a test file.
Expected: Reads diff, then tests, then code; runs the test command; checks graph impact on shared symbols; does not wait for the security file; verdict with path:line findings.

## 2
Request: Diff includes an unrelated formatting change in another module.
Expected: Blocks as out-of-scope code and asks for it to be split out.

## 3
Request: Approved change.
Expected: Commit summary in English: type, imperative message, body with why and how verified, exact files; never runs git commit.
