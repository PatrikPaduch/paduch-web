// Az oldal fix szövegei, nyelvenként. A projektek szövege a src/content/projects alatt van.
export const languages = { hu: 'Magyar', en: 'English' } as const;
export type Lang = keyof typeof languages;

export const ui = {
  hu: {
    'meta.title': 'Paduch Patrik · Hálózatok, rendszerek, automatizálás',
    'meta.description':
      'IT rendszerüzemeltető. Hálózatok, monitoring és automatizálás, meg a saját projektjeim.',
    'nav.work': 'Amivel foglalkozom',
    'nav.projects': 'Projektek',
    'nav.contact': 'Kapcsolat',
    'nav.switch': 'EN',
    'nav.switchLabel': 'Switch to English',

    'hero.eyebrow': 'Paduch Patrik',
    'hero.title1': 'Hálózatok.',
    'hero.title2': 'Rendszerek.',
    'hero.title3': 'Automatizálás.',
    'hero.lead':
      'IT rendszerüzemeltető vagyok. Olyan infrastruktúrát építek és tartok karban, amire nem kell gondolni, mert egyszerűen működik.',
    'hero.cta': 'Nézd meg a projektjeimet',
    'hero.scroll': 'Görgess',

    statement:
      'A jó rendszer csendben teszi a dolgát. Ha mégis baj van, szól, mielőtt bárki észrevenné. Ezen dolgozom minden nap.',

    'work.eyebrow': 'Amivel foglalkozom',
    'work.title': 'Négy terület, egy cél.',
    'work.lead':
      'Nappal hálózatokat, szervereket és monitoringot felügyelek. Szabadidőmben olyan eszközöket építek, amikre nekem is szükségem van.',
    'work.net.title': 'Hálózat',
    'work.net.text': 'Többtelephelyes vállalati hálózatok, VLAN-ok, dinamikus routing, tűzfal és DMZ.',
    'work.mon.title': 'Monitoring',
    'work.mon.text': 'Riasztások, naplógyűjtés és dashboardok, hogy a hiba előbb derüljön ki, mint a panasz.',
    'work.auto.title': 'Automatizálás',
    'work.auto.text': 'Scriptek az unalmas, ismétlődő munkára: lekérdezések, jelentések, onboarding.',
    'work.web.title': 'Web és felhő',
    'work.web.text': 'Konténerek, saját domain, zero-trust belépés és e-mail-hitelesítés. Ez az oldal is.',

    'projects.eyebrow': 'Projektek',
    'projects.title': 'Amit építettem.',

    'stack.title': 'Eszközök, amikkel dolgozom',

    'contact.eyebrow': 'Kapcsolat',
    'contact.title': 'Írj nekem.',
    'contact.lead': 'Kérdés, ötlet vagy közös projekt? Szívesen válaszolok.',

    'footer.built': 'Astro · Cloudflare Pages',
  },
  en: {
    'meta.title': 'Patrik Paduch · Networks, systems, automation',
    'meta.description':
      'IT systems administrator. Networks, monitoring and automation, plus my own side projects.',
    'nav.work': 'What I do',
    'nav.projects': 'Projects',
    'nav.contact': 'Contact',
    'nav.switch': 'HU',
    'nav.switchLabel': 'Váltás magyarra',

    'hero.eyebrow': 'Patrik Paduch',
    'hero.title1': 'Networks.',
    'hero.title2': 'Systems.',
    'hero.title3': 'Automation.',
    'hero.lead':
      'I am an IT systems administrator. I build and run infrastructure you never have to think about, because it simply works.',
    'hero.cta': 'See my projects',
    'hero.scroll': 'Scroll',

    statement:
      'A good system does its job quietly. And when something does go wrong, it speaks up before anyone notices. That is what I work on every day.',

    'work.eyebrow': 'What I do',
    'work.title': 'Four areas, one goal.',
    'work.lead':
      'By day I look after networks, servers and monitoring. In my spare time I build the tools I wish I had.',
    'work.net.title': 'Networking',
    'work.net.text': 'Multi-site enterprise networks, VLANs, dynamic routing, firewalls and DMZs.',
    'work.mon.title': 'Monitoring',
    'work.mon.text': 'Alerts, log collection and dashboards, so problems surface before the complaints do.',
    'work.auto.title': 'Automation',
    'work.auto.text': 'Scripts for the boring, repetitive work: queries, reports, onboarding.',
    'work.web.title': 'Web & cloud',
    'work.web.text': 'Containers, a custom domain, zero-trust access and email authentication. This site too.',

    'projects.eyebrow': 'Projects',
    'projects.title': 'Things I have built.',

    'stack.title': 'Tools I work with',

    'contact.eyebrow': 'Contact',
    'contact.title': 'Get in touch.',
    'contact.lead': 'A question, an idea or a project together? I am happy to reply.',

    'footer.built': 'Astro · Cloudflare Pages',
  },
} as const;

export function t(lang: Lang) {
  return (key: keyof (typeof ui)['hu']) => ui[lang][key];
}
