# zenn-docs-template

## Quick start

### Set up env

To test locally, save to `.env`.
To run on github actions, set them to repository secrets.

```toml
NOTCMS_SECRET_KEY=<your secret key>
NOTCMS_WORKSPACE_ID=<your workspace id>
```

Get them from NotCMS dashboard.

### Sync

`.github/workflows/sync-notcms.yml` uses the [NotCMS Sync Action](https://github.com/qqpann/notcms/tree/main/sync-action) to write each Notion page to `articles/{slug}.md` and commit it to `main`.

It runs daily at 04:00 JST. To sync right away, run the workflow from the Actions tab ("Run workflow").

Pages without a `slug` are skipped. Zenn requires slugs of 12-50 characters (`a-z0-9`, `-`, `_`).
