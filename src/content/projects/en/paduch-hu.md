---
title: paduch.hu
eyebrow: My own infrastructure
tagline: A domain of my own, with the doors locked.
order: 3
visual: mail
tags: [Cloudflare, Zero Trust, DNS, SPF, DKIM, DMARC]
---

Several layers work behind this domain. My apps are reachable through a Cloudflare Worker and Tailscale Funnel, protected by email login and signed tokens, without a single open port.

Email is my own too: incoming mail is forwarded to my inbox, and outgoing mail is authenticated with SPF, DKIM and DMARC. Every check passes.
