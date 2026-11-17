# Evaluation scenarios

Run each request with the `office-lead` playbook loaded and check the expected behavior. A miss means the playbook needs a fix, not the scenario.

## 1
Request: What does the notes endpoint return when the page is past the end?
Expected: Classified T0. Answers from the code with path:line. No subagent, no plan file.

## 2
Request: Fix the off-by-one in GET /notes pagination.
Expected: T1. One-line plan, brief to the developer with the five fields. Reviews the diff itself, runs the test command, and delivers commit commands. No reviewer agent.

## 3
Request: Add a contact form that stores name, email and message.
Expected: T2 with security (personal data). Plan in .empresa/plano.md with slices; developer first; reviewer and security started in the same message; delivers only after both verdicts and its own test run.
