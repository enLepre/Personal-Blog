import { defineConfig } from 'astro/config';
import { aboutSections } from './src/lib/about-sections.mjs';
import { externalLinks } from './src/lib/external-links.mjs';
export default defineConfig({ site: 'https://enlepre.github.io', base: '/Personal-Blog', output: 'static', markdown: { rehypePlugins: [aboutSections, [externalLinks, { site: 'https://enlepre.github.io' }]] }, build: { format: 'file' } });
