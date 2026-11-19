# Evaluation scenarios

Run each request with the `office-final-audit` playbook loaded and check the expected behavior. A miss means the playbook needs a fix, not the scenario.

## 1
Request: End of project: run the final security audit.
Expected: Sends the Lead a CLAUDE SECURITY REQUEST with scope, effort high and changes range; no report means BLOCKED, never a manual-only audit.

## 2
Request: The report has 2 high and 5 low findings, one high is a false positive.
Expected: Confirms reachability with the graph, drops the false positive with a reason, routes the real high to its owner and asks for a reproducing test.

## 3
Request: Fixes landed.
Expected: Requests a changes scan on the fix diff and a full scan of critical areas; repeats until no critical or high remains or the user accepts the risk.
