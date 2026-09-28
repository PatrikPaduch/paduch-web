---
title: Weekender
eyebrow: Long-weekend finder
tagline: The best weekend trip, every morning at seven.
order: 1
visual: flights
tags: [Python, Docker, SQLite, Cloudflare Workers, Tailscale]
---

Every morning it scans flights from Budapest to 116 destinations and scores them. Price is only part of it: the app works out how much useful daylight you actually get at the destination from the flight times, and it tracks the weather and the price history.

A filterable list and a heatmap show the results in the browser, and it sends an email when a great deal appears. It runs in a Docker container on its own domain, behind a login.
