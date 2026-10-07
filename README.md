# Enrico Lepre — Personal Blog

Static Astro website, published at https://enlepre.github.io/Personal-Blog/.

## Develop

Use Node.js 24 or newer. Run `corepack enable` and `pnpm install --frozen-lockfile`, then `pnpm run dev`.
Run `pnpm test` and `pnpm run build` before publishing. `pnpm run preview` previews the production build.

## Edit content

- `src/content/research/*.md`: research entries.
- `src/content/notes/*.md`: notes, with optional `status`.
- `src/content/essays/*.md`: essays.
- `src/content/sections/*.md`: section titles and introductions; `about.md` also contains the biography and contact text.

Each dated entry has `title` and `date` (YYYY-MM-DD) in its YAML frontmatter, followed by its Markdown body. Research, Notes and Essays are automatically sorted newest first. Equal dates use the filename as a stable tie-breaker. Dates are metadata and are not displayed, preserving the original design.

The existing placeholders all use 2026-10-05, the day they were first committed; they are not new publications. Replace these dates when publishing real content. About uses level-two headings to separate its blocks.

The homepage remains scrollable, with a fixed header and the original active-label crossfade when a section title reaches two-thirds of the viewport. The original `.html` section URLs are also generated. Shared styling lives in `src/styles/global.css`.

## Publish

Every push to `main` runs `.github/workflows/pages.yml`: install from the lockfile, test, build Astro, upload only `dist`, deploy to GitHub Pages. Pages must use **GitHub Actions** as its source. A manual workflow run is also supported.
