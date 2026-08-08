# GitHub Pages deployment

The site is built and deployed by `.github/workflows/deploy-pages.yml` whenever
`main` is updated. The production URL is:

<https://future-game-laboratory.github.io/FGL-Blog/>

## One-time repository setup

1. Open **Settings → Pages** in the GitHub repository.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push or merge a commit into `main`, or run the workflow manually from the
   **Actions** tab.

The workflow installs the exact dependency graph from `package-lock.json`, runs Astro's
type/content checks, builds the static site, and deploys the `dist` directory
with GitHub's official Pages actions.

## Local verification

Install Node.js 22 and run:

```bash
npm ci
npm run build
npm run preview
```

The repository is a project site, so Astro uses `/FGL-Blog` as its base path.
Internal links and public assets must continue to include this base path through
the shared link component or `import.meta.env.BASE_URL`.

## Changing the repository name

If the repository is renamed, update all of the following together:

- `base` and `site` in `astro.config.ts`
- `SITE.href` in `src/consts.ts`
- the two font URLs in `src/styles/global.css`

If the repository becomes `Future-Game-Laboratory.github.io`, use `/` as the
base path and `https://future-game-laboratory.github.io/` as the site URL.
