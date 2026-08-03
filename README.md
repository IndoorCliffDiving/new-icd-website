# new-icd-website

The website for [Indoor Cliff Diving](https://www.indoorcliffdiving.com/), a cliff diving,
high diving and X-diving club at Sloterparkbad in Amsterdam.

A static single-page site in Dutch and English, with a small Node build step that pulls the
event calendar from a Google Sheet and generates the structured data before deploy.

## Getting started

```sh
npm install
npm run build     # writes output/
```

To preview the built site locally:

```sh
python3 -m http.server 8000 --directory output
```

## What to edit

| I want to change… | Edit |
| --- | --- |
| Page copy, layout, sections | `template.html` (Dutch) **and** `template-en.html` (English) |
| Prices, address, opening hours, FAQ answers | `seo-data.js` **and** the matching visible copy in both templates |
| Event calendar | the Google Sheet (see the CSV URL in `script.js`) |
| Images, CSS, JS, PDFs | the corresponding folder in `output/` |

Everything in `output/` that isn't a static asset is **generated** — `index.html`, `en.html`,
`sitemap.xml`, `llms.txt` and `llms-full.txt` are overwritten by `npm run build`. Don't hand-edit
them; a scheduled CI run will replace them anyway.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`, every two hours, and on demand.
It builds, commits any `output/**` changes back to `main`, and publishes `output/` to the
`gh-pages` branch. The custom domain comes from `output/CNAME`.

Because the workflow runs on a schedule, the event calendar and the event structured data
refresh themselves whenever the Google Sheet changes — no deploy needed.

## Search and AI discoverability

The site is built to be read by search engines *and* by AI answer engines and agents:

- schema.org JSON-LD (`SportsClub`, `PublicSwimmingPool`, `WebSite`, `FAQPage`, `SportsEvent`)
  generated from `seo-data.js`, so the markup can't contradict the visible page
- canonical + `hreflang` links across the Dutch and English pages
- `sitemap.xml`, and a `robots.txt` that explicitly welcomes AI search crawlers
- `llms.txt` and `llms-full.txt`, so an agent can read every fact about the club in one fetch
- all content server-rendered into the HTML — nothing important is loaded by JavaScript

See `CLAUDE.md` for the details and the rules to follow when changing any of it.
