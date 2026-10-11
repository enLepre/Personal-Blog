# Enrico Lepre — Personal Blog

Static Astro website, published at https://enlepre.github.io/Personal-Blog/.

## Develop

Use Node.js 24 or newer. Run `corepack enable` and `pnpm install --frozen-lockfile`, then `pnpm run dev`.
Run `pnpm test` and `pnpm run build` before publishing. `pnpm run preview` previews the production build.

## Edit content

- `src/content/pages/home.md`: Home title, separate `menuTitle`, image, footer, optional Markdown body, and hierarchy.
- `src/content/research/*.md`: research entries.
- `src/content/notes/*.md`: notes, with optional `status`.
- `src/content/essays/*.md`: essays.
- `src/content/sections/*.md`: section titles and introductions; `about.md` also contains the biography and contact text.

Every page Markdown file requires a positive integer `level` in its YAML frontmatter. Use `level: 1` for Home, `level: 2` for sections, and `level: 3` for articles. A larger destination level slides upward; a smaller destination level slides downward, even when going directly from an article to Home or using browser history. Equal levels retain the router’s normal direction. Change these numbers to customize hierarchy; URLs do not determine the animation.

Each page also supports `reading: true` or `reading: false`. All current level 3 articles use `reading: true`; Home and sections use `false`. This setting is independent of `level`, so you can change either later. On reading pages, the rhombus and footer appear at the top, fade away after scrolling more than 48 pixels, and reappear when you return to the top area. Hidden controls cannot receive clicks or keyboard focus. On other pages they stay visible. A page opened or restored partway down starts with the controls hidden.

Use standard YAML `level: 3` (one colon), not `level:: 3`.

Each dated entry has `title` and `date` (YYYY-MM-DD) in its YAML frontmatter, followed by its Markdown body. Research, Notes and Essays are automatically sorted newest first. Equal dates use the optional `order` number (smaller first), then the filename as a stable tie-breaker. Articles without `order` come after numbered articles on the same date. Dates are metadata and are not displayed, preserving the original design.

Use a `preview` field in the frontmatter to control the short description shown on the homepage and section lists:

```yaml
---
title: "Current work"
level: 3
reading: true
date: 2026-10-05
preview: "Exploring electric fields at material and electrolyte interfaces."
---
```

Write the full article below the closing `---`. Lists display only the title, preview and optional note status; clicking the title opens the full Markdown article. Preview text is plain text, not Markdown or HTML. If `preview` is missing or blank, no description is shown; the article body is never used as a fallback. For a longer sentence, YAML's `preview: >-` folded style can span multiple lines.

Section files supply each section’s title, optional `lead`, and hierarchy. Write Markdown below their frontmatter to add content above the article list; About displays its complete Markdown biography and contact text. Home keeps the name and image by default; its Markdown body is empty and can be filled if you want additional text. Home’s `image` path starts with `/assets/`, and `imageAlt` controls its accessible description.

The existing placeholders all use 2026-10-05, the day they were first committed; they are not new publications. Replace these dates when publishing real content. About uses level-two headings to separate its blocks.

The homepage shows only the name and landscape. A top-left rhombus rotates into a square on hover or focus; clicking or activating it expands the square into the navigation panel. Navigation uses the Markdown `level` values: increasing slides upward, decreasing slides downward (Home → section → article). Same-level navigation follows the router’s normal direction, including browser Back/Forward. The footer stays stationary. Reduced-motion preferences disable the page animation. The original `.html` section and article URLs are preserved. Shared styling lives in `src/styles/global.css`.

## Automatic publications

The Publications article (`research/publications.html`) displays all public works from Enrico Lepre's ORCID record, `0000-0003-4252-3056`. Its Markdown frontmatter enables the list with `publications: true`; the homepage retains only its short preview.

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

## Content templates and filenames

Each content folder (`pages`, `sections`, `research`, `notes`, `essays`) contains a `template.md` with fields and writing examples specific to that folder. The content loaders explicitly exclude these template files: they never become pages, menu entries, or list entries. For a new article, copy the appropriate template to a descriptive filename, replace its sample fields, and write below the frontmatter. For Home or an existing section, use the template as a guide when editing its existing file; additional sections or standalone pages need routes.

Numeric filename prefixes have been removed. Their tie-breaking order is stored in each article’s `order` field. The optional `legacySlug` field preserves a previous URL through a redirect (for example `01-first-essay` redirects to `first-essay.html`); keep it on the renamed article and omit it on new articles. Current site links use the clean filenames.

External web links in Markdown (including HTML links) and the publication list open in a new browser tab or window. Internal links retain normal page navigation. No extra Markdown properties are required for this behavior.

The About page uses `portrait` and `portraitAlt` in `src/content/sections/about.md` to display a photograph beside the title at the top-right. Its local image was copied from `WebsiteTest/website/public/people/enrico-lepre-profile.webp`; removing `portrait` restores the text-only heading.
