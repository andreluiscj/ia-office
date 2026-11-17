# Dependencies and supply chain

## Check

- [ ] A lockfile exists, is committed and matches the manifest. CI installs from the lockfile (`npm ci`, `pnpm install --frozen-lockfile`).
- [ ] The audit tool reports no high or critical advisory that is **reachable** in this project. For each one: is the vulnerable function actually used, and with attacker-controlled input?
- [ ] Every dependency added by this change was justified and approved by the Lead: what it is for, why not the standard library or an existing dependency.
- [ ] New packages are checked for: exact name (typosquatting), maintainer and repository, age and download volume, recent releases, license compatible with the project, install scripts (`preinstall`/`postinstall`) and what they do.
- [ ] No dependency fetched from a URL, a git branch or an unpinned tag.
- [ ] Unused dependencies are removed.
- [ ] CI workflows: third-party actions pinned to a commit or a trusted version; secrets not exposed to workflows triggered by forks; no script piping a download into a shell.
- [ ] Containers: pinned base image, non-root user, no secrets baked into layers.
- [ ] `L2` Third-party scripts loaded in the browser are few, justified, and use Subresource Integrity when served from a CDN.

## Commands (run only what is installed; never fix or update)

```
npm audit --audit-level=high      pnpm audit --audit-level high
composer audit                    pip-audit
```

Tool absent: record it and review the manifest by hand.

## Reporting

A scanner hit is a lead. Report it as a finding only with: package and version, advisory id, where the project calls the vulnerable code (`path:line`), and whether input reaches it. Otherwise list it under "to verify" with the upgrade the owner should evaluate. You never run the upgrade.
