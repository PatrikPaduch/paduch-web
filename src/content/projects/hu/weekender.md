---
title: Weekender
eyebrow: Hosszú hétvége-figyelő
tagline: A legjobb hétvégi út, minden reggel hétkor.
order: 1
visual: flights
tags: [Python, Docker, SQLite, Cloudflare Workers, Tailscale]
---

Minden reggel végignézi a budapesti járatokat 116 úti célra, és pontozza őket. Nem csak az ár számít: a program kiszámolja, mennyi hasznos, napfényes idő marad a célállomáson a járatidők alapján, figyeli az időjárást és az árelőzményt.

Böngészős felületen szűrhető lista és hőtérkép mutatja az eredményt, jó ajánlatnál e-mailt küld. Egy Docker-konténerben fut, saját domainen, belépéssel védve.
