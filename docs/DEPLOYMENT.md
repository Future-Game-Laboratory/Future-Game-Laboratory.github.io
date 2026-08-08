# GitHub Pages deployment

The site is built and deployed by `.github/workflows/deploy-pages.yml` whenever
`main` is updated. The production URL is:

<https://future-game-laboratory.github.io/>

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

The repository is the organization site, so Astro uses `/` as its base path.
Internal links and public assets resolve directly from the root domain through
the shared link component or `import.meta.env.BASE_URL`.

## Hosting as a project site instead

If the Blog later moves back to a normal project repository, update all of the
following together:

- `base` and `site` in `astro.config.ts`
- `SITE.href` in `src/consts.ts`
- the two font URLs in `src/styles/global.css`

For example, a repository named `FGL-Blog` would use `/FGL-Blog` as the base
path and `https://future-game-laboratory.github.io/FGL-Blog/` as the site URL.
