import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
const dated = (name: string) => defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/template.md'], base: `./src/content/${name}` }),
  schema: z.object({ title: z.string(), subtitle: z.string().optional(), order: z.number().int().positive().optional(), legacySlug: z.string().regex(/^[a-z0-9-]+$/).optional(), level: z.number().int().positive(), reading: z.boolean().default(false), date: z.coerce.date(), preview: z.string().trim().default(''), status: z.string().optional(), publications: z.boolean().default(false) })
});
export const collections = {
  pages: defineCollection({
    loader: glob({ pattern: ['*.md', '!template.md'], base: './src/content/pages' }),
    schema: z.object({ title: z.string(), subtitle: z.string().optional(), level: z.number().int().positive(), reading: z.boolean().default(false), homepageAnimation: z.boolean().default(true), menuTitle: z.string().default('Enrico Lepre'), image: z.string(), imageAlt: z.string(), footer: z.string(), career: z.array(z.object({ city:z.string(), longitude:z.number().min(-180).max(180), latitude:z.number().min(-85).max(85), title:z.string(), topic:z.string() })).length(4).default([
      {city:'Trieste',longitude:13.7768,latitude:45.6495,title:'Bachelor’s and Master’s',topic:'Chemistry'},
      {city:'Potsdam',longitude:13.0645,latitude:52.3906,title:'PhD',topic:'Materials Science'},
      {city:'Heidelberg',longitude:8.6724,latitude:49.3988,title:'Postdoc',topic:'Sustainable Chemical Processes'},
      {city:'Zurich',longitude:8.5417,latitude:47.3769,title:'Postdoc',topic:'Physical Chemistry'}
    ]) })
  }),
  research: dated('research'), notes: dated('notes'),
  sections: defineCollection({
    loader: glob({ pattern: ['*.md', '!template.md'], base: './src/content/sections' }),
    schema: z.object({ title: z.string(), subtitle: z.string().optional(), level: z.number().int().positive(), reading: z.boolean().default(false), portrait: z.string().optional(), portraitAlt: z.string().default('Portrait'), lead: z.string().default(''), preview: z.string().trim().default('') })
  })
};
