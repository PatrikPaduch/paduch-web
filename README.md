# paduch.hu

A személyes oldalam. [Astro](https://astro.build) statikus oldal, kétnyelvű (magyar a `/`, angol az `/en/` alatt),
a Cloudflare Pages minden `git push` után magától lebuildeli és kiteszi.

## Helyi futtatás

```bash
npm install      # első alkalommal
npm run dev      # http://localhost:4321, mentésre magától frissül
npm run build    # a kész oldal a dist/ mappába kerül
```

## Hol mit szerkessz

| Mit | Hol |
|---|---|
| Projektek (szöveg, címkék, sorrend) | `src/content/projects/hu/*.md` és `src/content/projects/en/*.md` |
| Fix szövegek (menü, címek, kapcsolat) | `src/i18n/ui.ts` |
| Szakaszok kinézete | `src/components/*.astro` |
| Színek, betűk, közös stílus | `src/styles/global.css` |

### Új projekt hozzáadása

1. Másold le egy meglévő projekt `.md` fájlját mindkét nyelvi mappában, új néven.
2. Írd át a fájl elején lévő adatokat (`title`, `eyebrow`, `tagline`, `order`, `tags`) és alatta a leírást.
3. A `visual` mező az illusztráció: `flights`, `network`, `mail`, `rack` vagy `cards`.
4. `git add`, `git commit`, `git push`, és pár perc múlva élesben van.

A projektek sorban váltakozva sötét és világos hátteret kapnak, a képük jobbra vagy balra kerül.
