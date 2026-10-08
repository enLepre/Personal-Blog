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

Use a `preview` field in the frontmatter to control the short description shown on the homepage and section lists:

```yaml
---
title: "Current work"
date: 2026-10-05
preview: "Exploring electric fields at material and electrolyte interfaces."
---
```

Write the full article below the closing `---`. Lists display only the title, preview and optional note status; clicking the title opens the full Markdown article. Preview text is plain text, not Markdown or HTML. If `preview` is missing or blank, no description is shown; the article body is never used as a fallback. For a longer sentence, YAML's `preview: >-` folded style can span multiple lines.

`src/content/sections/about.md` also supports `preview`: the homepage shows this short description, while `about.html` shows the complete biography and contact text. Section `lead` fields remain the introductory text above the previews.

The existing placeholders all use 2026-10-05, the day they were first committed; they are not new publications. Replace these dates when publishing real content. About uses level-two headings to separate its blocks.

The homepage remains scrollable, with a fixed header and the original active-label crossfade when a section title reaches two-thirds of the viewport. The original `.html` section URLs are also generated. Shared styling lives in `src/styles/global.css`.

## Automatic publications

The Publications article (`research/02-publications.html`) displays all public works from Enrico Lepre's ORCID record, `0000-0003-4252-3056`. Its Markdown frontmatter enables the list with `publications: true`; the homepage retains only its short preview.

`src/data/publication-sync.json` selects the ORCID record. `pnpm sync:publications` fetches the public works and their details, selects ORCID's preferred record in each group, deduplicates DOIs, and saves newest-first titles, authors, journals, years and links to `src/data/publications.json`. Works without DOIs, journal names, authors or dates remain included using the available metadata. Only public ORCID works can be shown; add missing publications to your ORCID record and make them public. This is not a Google Scholar mirror.

The Pages workflow refreshes on every push to `main`, on a manual run, and each Monday at 06:17 UTC. A complete successful refresh replaces the saved list, so edits, removals and visibility changes in ORCID are reflected. Tests and the production build run before the updated cache is committed and published. Workflow-token commits do not trigger another push run. The workflow requires permission to write repository contents.

If ORCID fails or sends incomplete data, the saved list is preserved and the blog can still deploy using that cache. A first sync without any cached works must succeed. Ordinary `pnpm run build` is offline and uses the saved list. Changing the ORCID also requires replacing its cache to avoid showing another person's works.

## Publish

Every push to `main` runs `.github/workflows/pages.yml`: install from the lockfile, test, build Astro, upload only `dist`, deploy to GitHub Pages. A manual workflow run is also supported. The existing branch-based Pages configuration is supported: the Astro deployment waits for any legacy build of the same commit to finish before publishing, preventing it from overwriting the built site. Switching Pages to **GitHub Actions** removes that redundant legacy build.

## Individual article pages

Every Markdown entry in Research, Notes and Essays generates its own URL:
`/Personal-Blog/<collection>/<filename-without-md>.html`.
Click its title from the homepage or section page to read it separately.
The section Markdown files have their existing `research.html`, `notes.html`,
`essays.html` and `about.html` pages. Section titles on the homepage link to them.
Paragraph spacing and justification are shared between previews and full articles.
