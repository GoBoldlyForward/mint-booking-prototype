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
