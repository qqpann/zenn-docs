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

### Set up webhook

```txt
URL: https://api.notcms.com/beta/forward_github_actions/OWNER/REPO?event_type=sync_zenn
KEY:
  Authorization: Bearer github_pat_***
```

Replace `OWNER` and `REPO` with your actual repo name.

Create a key by yourself with permission to trigger webhook.
