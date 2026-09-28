import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Egy projekt = egy Markdown fájl: src/content/projects/<nyelv>/<név>.md
// A fájl eleje (frontmatter) az adatok, alatta a leírás szövege.
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    eyebrow: z.string(), // kis felirat a cím fölött
    tagline: z.string(), // nagy, egymondatos összefoglaló
    order: z.number(), // sorrend az oldalon
    visual: z.enum(['flights', 'network', 'mail', 'rack', 'cards']),
    tags: z.array(z.string()),
    link: z.object({ label: z.string(), href: z.string() }).optional(),
  }),
});

export const collections = { projects };
