# Personal data (LGPD, technical checks)

This is a technical review, not legal advice. Questions about legal basis, contracts or the data protection officer go to the Lead, who takes them to the user.

Personal data: anything that identifies or can identify a person (name, email, phone, CPF, IP, device id, location, photo). Sensitive data (health, biometrics, religion, political opinion, sexual life, racial or ethnic origin) and children's data need stricter handling: flag them explicitly.

## Map (answer each in one line)

1. What personal data does the change collect or touch?
2. Why is each field needed for the feature? A field with no purpose should not be collected (data minimization).
3. Where does it live: database tables, cache, logs, analytics, error tracker, backups, exports, third-party services, LLM context?
4. Who can read it: which roles, which services?
5. How long is it kept, and what deletes it?

## Check

- [ ] Only the fields the feature needs are collected.
- [ ] Access is limited by role and enforced on the server (see access-control).
- [ ] Encrypted in transit; sensitive fields and backups encrypted at rest.
- [ ] Personal data is absent from logs, error messages, analytics events and URLs.
- [ ] A user can obtain their data, correct it and have it deleted; deletion actually removes or anonymizes it across the stores in the map (or the gaps are documented).
- [ ] Retention is defined; expired data is removed by a job or policy.
- [ ] Third parties that receive the data are listed, with what they receive. Nothing is sent to a new third party without the Lead's approval.
- [ ] Consent, where the feature depends on it, is recorded with timestamp and can be withdrawn; non-essential cookies and trackers wait for it.
- [ ] Test data and fixtures are artificial; no production data in development or in the repository.
- [ ] `L2` Access to personal data by staff or admin tools is logged.
- [ ] `L2` There is a way to detect and report a breach: what was accessed, when, by whom.

## Report

Under privacy, list the data map, each failed check with `path:line`, and open questions for the Lead. A leak of personal data to unauthorized users, logs shipped to third parties, or a public bucket is critical or high.
