# Evaluation scenarios

Run each request with the `office-test-matrix` playbook loaded and check the expected behavior. A miss means the playbook needs a fix, not the scenario.

## 1
Request: Verify the contact feature against its acceptance criteria.
Expected: Matrix written before running; limits 0/1/max/max+1, hostile input, authorization, side effects, regression of /notes; verdict blocked if any criterion fails.

## 2
Request: An E2E test fails one run in five.
Expected: Finds the race with the trace; fixes the test without sleep or blanket retries, or routes the product bug with a minimal reproduction.

## 3
Request: Confirm the developer's fix for a reported bug.
Expected: Reruns the original case, neighbors, smoke and regression; records confirmed or reopened with the new result.
