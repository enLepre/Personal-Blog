import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const dated = (name: string) => defineCollection({
  loader: glob({ pattern: '**/*.md', base: `./src/content/${name}` }),
  schema: z.object({ title: z.string(), date: z.coerce.date(), preview: z.string().trim().default(''), status: z.string().optional(), publications: z.boolean().default(false) })
});
export const collections = {
  research: dated('research'), notes: dated('notes'), essays: dated('essays'),
  sections: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/sections' }),
    schema: z.object({ title: z.string(), lead: z.string(), preview: z.string().trim().default('') })
  })
};
