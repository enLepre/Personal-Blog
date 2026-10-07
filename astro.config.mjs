import { defineConfig } from 'astro/config';
import { aboutSections } from './src/lib/about-sections.mjs';
export default defineConfig({ site: 'https://enlepre.github.io', base: '/Personal-Blog', output: 'static', markdown: { rehypePlugins: [aboutSections] }, build: { format: 'file' } });
