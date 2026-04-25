# Minimal Astro Blog

A text-first Astro blog with Markdown/MDX posts, full-content RSS, simple share links, and Cusdis Cloud comments.

## Writing posts

Add posts under `src/content/blog` as Markdown or MDX files.

Required frontmatter:

```yaml
---
title: "Post title"
description: "Short summary for lists, metadata, and RSS."
pubDate: 2026-04-24
tags: ["example"]
---
```

Set `draft: true` to exclude a post from production pages and RSS.

## Deployment

The GitHub Actions workflow builds the site and uploads `dist/` by FTPS. Configure these repository secrets:

- `FTPS_HOST`
- `FTPS_USER`
- `FTPS_PASSWORD`
- `FTPS_PORT` (optional, defaults to `21`)
- `FTPS_TARGET` (remote directory, with a trailing `/`)

Configure these repository variables:

- `PUBLIC_CUSDIS_HOST`
- `PUBLIC_CUSDIS_APP_ID`
- `PUBLIC_BUTTONDOWN_USERNAME`
