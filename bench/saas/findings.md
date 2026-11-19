## What we found

**Both sides built a correct, secure product.** On the independent probes (53 functional and security checks, including path traversal, prototype pollution, tenant isolation, race conditions, CSRF, brute force, enumeration and timing) every build scored 52/53. All of them miss the same low-severity item: they accept a `text/plain` body when the CSRF header is present, which the header already makes hard to abuse. In a real browser (headless Edge, 9 UI checks) plain and Office+skills passed 9/9, the plain Office run 8/9.

**On a task this size, the team costs about 2.7x more and takes about 1.7x longer for the same measured quality.** Claude Code alone built InvoiceDesk in 8.6 minutes for $2.13; the Office team needed 14.9 minutes and $5.76 (12.2 minutes and $6.03 with skills preloaded).

**Where the Office team's extra money goes.** In round 2, 73% of all tokens processed (5.8M of 7.9M) were the Lead's own calls, not the specialists': the Lead coordinates six agents over 67 API calls, each carrying a large and growing context. Coordination, not specialist work, is the main cost driver and the first thing to optimize.

**What the team did that a single session did not do.**
- It produced longer security documentation (167 lines against 62) and a full threat-model-per-finding record, including findings it fixed itself (a login lockout that parallel requests could bypass, a missing per-IP limit).
- QA found a UI bug that would have broken every invoice created from the screen (the form sent the client id as text) and it was fixed before delivery.
- It wrote down what it could not verify instead of claiming success (rounds 1 and 2).

**What the team got wrong.** In round 2, nobody opened the UI in a real browser, and the delivered dashboard rendered its content twice after sign-up (a visible defect that Claude Code alone did not have, because it tested in a browser itself). With key skills preloaded (round 3) a test drove the UI in headless Chrome and the defect was gone.

**Skills: asking is not enough.** Even with the rule "call the mandatory skills of your role on a medium or large task", no agent called a skill in round 2: the Lead wrote that a team brief was enough. Preloading 1 to 2 skills per agent in its configuration (round 3) made them part of the agents' context and the Lead reported which agent applied which skill. The preloading cost about 5% more than round 2 and the run produced more tests (37 against 20) and the full UI pass, but with one run per variant this is a signal, not proof.

**Memory.** The Office agents wrote 5 to 8 memory files per build; plain Claude Code wrote none. These are one-shot runs, so they cannot show the benefit yet: it only appears on the second and later tasks in the same project.

**Honest limits.** One run per variant and round. Tiny scope (a 500-line product). Prices are list prices. The acceptance tests were written by the same people who wrote the prompt and are public in this repository, so inspect them. The task rewards a single capable session; the team is expected to pay off on larger, longer or recurring work (monitoring, daily check-ups), which this benchmark does not cover.
