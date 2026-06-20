# Ohm My God

FSAE Electrical Subsystem Diagnostic & Failure Tracking Tool — a single-page web app for guided failure diagnosis, case logging, and tree maintenance with a lead-reviewed staging workflow.

All data lives in JSON files. No backend required for read-only use; writes use the GitHub Contents API (recommended) or the File System Access API for offline shared-drive use.

## Quick start

```bash
# Validate the decision tree
npm run validate

# Install git pre-commit hook (validates tree.json on commit)
npm run setup

# Serve locally (required — fetch() needs HTTP, not file://)
npm run serve
# Open http://localhost:8080
```

## File structure

```
ohmmygod/
  index.html           # Single-page app (HTML, CSS, JS)
  js/storage.js        # Persistence layer (fetch / GitHub / shared folder)
  js/tree-ops.js       # Tree ID generation, approval wiring, path preview
  js/lead-tools.js     # Lead editing, retire nodes, maintenance analytics
  tree.json            # Live decision tree (lead-controlled)
  pending.json         # Staged node proposals (member-submitted)
  cases.json           # Case log of resolved/unresolved sessions
  changelog.json       # Tree edit history
  docs/
    LEAD_ONBOARDING.md # Deployment checklist for the electrical lead
    MEMBER_GUIDE.md    # User manual for team members
  scripts/
    validate-tree.js
    generate-debug-tree.py  # Regenerate tree.json from PDF/outline structure
    install-hooks.sh
  .github/workflows/
    pages.yml          # GitHub Pages deploy + tree validation
```

## Modes

| Mode   | Access        | Capabilities                                              |
|--------|---------------|-----------------------------------------------------------|
| Member | Default       | Diagnose, log cases, propose nodes                        |
| Lead   | PIN in settings | Member + review queue, edit tree, maintenance dashboard |

Default lead PIN is `1234` — change it before deployment. See [docs/LEAD_ONBOARDING.md](docs/LEAD_ONBOARDING.md).

**Team members:** see [docs/MEMBER_GUIDE.md](docs/MEMBER_GUIDE.md) for how to diagnose, log, and search cases.

## Hosting

**GitHub Pages (recommended):** Push to `main` — the GitHub Actions workflow validates `tree.json` and deploys the static site. Reads work via `fetch()`. Writes require a GitHub Personal Access Token (repo scope) stored in localStorage by the lead — never commit tokens.

**Shared drive (offline):** Open via Chrome and grant folder access with the File System Access API.

### Configuring storage (lead mode)

1. Enter lead mode (default PIN `1234`).
2. Open **Settings** in the header.
3. Choose a backend:
   - **Local (read-only)** — default for `npm run serve`; diagnosis only.
   - **GitHub** — enter owner, repo, branch, and a PAT with `repo` scope. Use **Test connection** before saving.
   - **Shared folder** — select the folder containing the JSON files (Chrome required).

When shared-folder mode is enabled, any member can click **Connect shared folder** if access expired for the session.

PATs and folder handles stay in the browser (`localStorage` / IndexedDB) — never commit them.

## Tree maintenance

- Never delete node IDs — mark retired nodes with `"retired": true` via **Edit Tree**
- Run `npm run validate` before committing tree changes
- Increment `tree.json` `version` after structural edits (automatic on lead edits and approvals)
- Use **Maintenance** monthly — see checklist in app and [docs/LEAD_ONBOARDING.md](docs/LEAD_ONBOARDING.md)

## App panels

| Panel | Who | Purpose |
|-------|-----|---------|
| Diagnose | All | Walk the decision tree |
| Browse Cases | All | Search case history |
| Review Queue | Lead | Approve/reject node proposals |
| Edit Tree | Lead | Edit or retire nodes directly |
| Maintenance | Lead | Monthly checklist, hotspots, unreviewed cases |

## Implementation status

All spec phases are implemented:

- **Phase 1–4:** Foundation, session flow, persistence, case logging
- **Phase 5–7:** Node proposals, review queue, auto-wiring on approval
- **Phase 8:** Lead tree editing and node retirement
- **Phase 9:** GitHub Pages workflow, pre-commit hook, lead onboarding doc
- **Phase 10:** Maintenance dashboard with hotspots and review workflow

## Spec reference

Built from the FSAE Electrical Subsystem Diagnostic & Failure Tracking Tool Implementation Specification v1.0.
