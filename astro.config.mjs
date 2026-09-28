// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://paduch.hu',
  devToolbar: { enabled: false },
  i18n: {
    defaultLocale: 'hu',
    locales: ['hu', 'en'],
    // magyar a gyökéren (paduch.hu/), angol a /en/ alatt
    routing: { prefixDefaultLocale: false },
  },
});
