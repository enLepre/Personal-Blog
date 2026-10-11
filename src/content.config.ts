import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const dated = (name: string) => defineCollection({
  loader: glob({ pattern: '**/*.md', base: `./src/content/${name}` }),
  schema: z.object({ title: z.string(), level: z.number().int().positive(), date: z.coerce.date(), preview: z.string().trim().default(''), status: z.string().optional(), publications: z.boolean().default(false) })
});
export const collections = {
  pages: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/pages' }),
    schema: z.object({ title: z.string(), level: z.number().int().positive(), image: z.string(), imageAlt: z.string(), footer: z.string() })
  }),
  research: dated('research'), notes: dated('notes'), essays: dated('essays'),
  sections: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/sections' }),
    schema: z.object({ title: z.string(), level: z.number().int().positive(), lead: z.string().default(''), preview: z.string().trim().default('') })
  })
};
