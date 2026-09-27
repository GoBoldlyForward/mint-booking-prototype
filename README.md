# Mint booking prototype

A clickable prototype of the proposed booking flow for Mint Mobile Detail. Static HTML,
CSS and JavaScript with no build step, so it runs from any file server and deploys to
GitHub Pages straight from `main`.

Run locally:

```
python3 -m http.server 8123
```

Everything is mocked in the browser: prices and vehicle sizes come from `data.js`,
the zip lookup uses ipapi.co when reachable, the "use my location" button calls the
browser geolocation API and then substitutes a demo address, and payment never leaves
the page. Progress is kept in localStorage so a refresh or a closed tab resumes where
the customer left off, which is the retargeting story.

The "Prototype" bar at the top lets you pretend it is before noon (to show the
same-day upsell) and reset the flow.

## Versions

- `/` is v1: the flow as first agreed.
- `/v2/` is v1 plus seven conversion changes: zip is only prefilled when it is in the
  service area, an unlisted vehicle can be added by picking a size, new members get
  their percentage discount on today's detail with the savings shown in dollars, trust
  signals on the first and last screens, the deposit leads on the pay screen, the
  arrival-window promise names a time, and every row of the order review has an Edit
  link that returns to the review.

Each version keeps its own localStorage key, and the bar at the top switches between them.
