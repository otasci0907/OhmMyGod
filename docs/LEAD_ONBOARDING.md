# Lead onboarding checklist

Use this once when deploying Ohm My God for your electrical subteam.

## Before first use

- [ ] Change the default lead PIN (`1234`) in **Settings → Lead PIN**
- [ ] Choose a storage backend:
  - **GitHub** for team-wide access via GitHub Pages (recommended)
  - **Shared folder** for offline use at the car (Chrome + File System Access API)
- [ ] If using GitHub: create a PAT with `repo` scope, enter owner/repo/branch, **Test connection**, then **Save**
- [ ] Walk through each subsystem branch in **Diagnose** to confirm nothing is broken
- [ ] Run `npm run validate` locally (also runs in CI before Pages deploy)

## Install git pre-commit hook (optional, recommended)

```bash
npm run setup
```

This validates `tree.json` whenever you commit changes to it.

## GitHub Pages setup

1. Push this repo to GitHub
2. **Settings → Pages → Build and deployment → GitHub Actions**
3. Push to `main` — the workflow validates the tree and deploys the static site
4. Share the Pages URL with the team
5. Lead enters GitHub storage credentials once per browser (PAT is never committed)

## Monthly maintenance

Open **Maintenance** in lead mode each month:

1. Process all items in **Review Queue**
2. Mark remaining **unreviewed cases** as one-off or wait for promotion via proposals
3. Review **dead-end hotspots** (3+ cases) — add tree depth there first
4. Review **solutions often tried but not fixing** — edit text in **Edit Tree**
5. Confirm `tree.json` version was bumped after structural edits

## Rules to remember

- Never delete node IDs — retire them instead
- Let the case log drive tree depth, not speculation
- Never commit PATs or tokens to the repo
