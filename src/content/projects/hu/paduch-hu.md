---
title: paduch.hu
eyebrow: Saját infrastruktúra
tagline: Saját domain, zárt ajtókkal.
order: 3
visual: mail
tags: [Cloudflare, Zero Trust, DNS, SPF, DKIM, DMARC]
---

A domain mögött több réteg dolgozik. A saját appjaim Cloudflare Workeren és Tailscale Funnelen át érhetők el, e-mailes belépéssel és aláírt tokenekkel védve, nyitott port nélkül.

A levelezés is saját: a címre érkező leveleket továbbítás viszi a postafiókomba, a kimenőket SPF, DKIM és DMARC hitelesíti. Az ellenőrzések mind átmennek.
