import { defineConfig } from 'astro/config';
import { aboutSections } from './src/lib/about-sections.mjs';
import { externalLinks } from './src/lib/external-links.mjs';
export default defineConfig({ site: 'https://enlepre.github.io', base: '/Personal-Blog', output: 'static', redirects: {
  '/essays': '/Personal-Blog/notes.html',
  '/essays/good-song': '/Personal-Blog/notes/good-song.html',
  '/essays/mistakes': '/Personal-Blog/notes/mistakes.html',
}, markdown: { rehypePlugins: [aboutSections, [externalLinks, { site: 'https://enlepre.github.io' }]] }, build: { format: 'file' } });
