# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Visitors in the field:** people out in Sardinia, on their phone, finding the sites near them and getting there. Signal is often weak or absent away from towns.
- **Enthusiasts and locals:** people who already know the nuragic world and want a fast, complete map of the NurNet census, with details such as sight lines between nuraghi and the state of conservation.
- **Students and researchers:** people using it as a quick reference to the census data. The official NurNet geoportal remains the full record.

## Product Purpose

NurNet+ is a map of the sites of nuragic Sardinia: nuraghi, domus de janas, tombe dei giganti, sacred wells, villages, menhir, dolmen and others. Its data comes from the NurNet census. It exists so that the census can be used comfortably on a phone, in the field as well as at home. It succeeds when someone can find a site, understand what it is, and reach it in a few taps.

## Positioning

An independent, unofficial app built on NurNet's open data (CC BY 4.0). It has its own brand. It credits NurNet, the Fondazione Nurnet and the CRS4 clearly, and it must never look like official NurNet material. What sets it apart from the geoportal is speed and ease on a phone, offline use, and showing the sight lines between nuraghi on the map.

## Operating Context

- An installable PWA that works offline: the site data is precached with the app.
- Hosted on GitHub Pages at `/nurnet-plus/`, built with `nuxt generate`.
- Used one-handed outdoors on a phone (a bottom drawer over the map) and on desktop (a side panel).
- Search engines index only the map page. A single site's page is shareable but `noindex`: it is an app, not a catalogue.

## Capabilities and Constraints

- Search by site name or comune, with results highlighted on the map. Filter by type. "A caso" opens a random site.
- A site page shows its type, place, state of conservation, photos and video from the NurNet Mediateca, sight lines to other nuraghi, directions in the visitor's maps app, a share button (the system's share sheet, or a copied link), and copyable coordinates.
- A 2D/3D map with terrain. "Show my location" runs only when the visitor taps it.
- Privacy: no accounts, no cookies, no analytics. Location stays on the device. Videos load only when the visitor asks.
- Terminology: the site categories and conservation states use the census's own names, such as "Nuraghe", "Domus de janas", "Tombe dei giganti", "Mantenuto", "Diroccato" and "Non visibile".
- Language: Italian (the default, at the root) and English (at `/en/`), both prerendered and indexed. The UI's copy lives in `i18n/locales`, never in the components. The census's closed vocabularies (typologies, periods, geology, land use) are translated there too, the Italian kept exactly as the census writes it; names, places and sources are never translated. The descriptions are machine translated by nurnet-dumper (a local model first, then a larger hosted one), checked automatically, and a site whose translation failed the checks keeps its Italian description. A language's descriptions are downloaded the first time a visitor opens a site in it, then kept for offline use, not precached for everyone, so more languages can be added. No redirect by browser language: the other language is offered once, and a visitor's choice is kept on the device.

## Brand Commitments

- Name: **NurNet+**. The plus marks it as an add-on to NurNet, not NurNet itself.
- Logo: five circles. It reads both as a nuraghe seen from above (a central tower and four around it) and as a plus sign. It also stands in for the "+" in the wordmark. Source: `app/assets/nurnet-plus.svg`.
- Credits and disclaimer: the data comes from the Geoportale NurNet (CRS4 with the Fondazione Nurnet, CC BY 4.0) and the photos from the Mediateca NurNet. NurNet+ is independent and unofficial. Both statements stay visible in the app's info sheet.

## Evidence on Hand

- `public/nurnet-index.json`, `public/nurnet-details.json` and `public/nurnet-visibility.json`: the real census, about 7,500 sites, with details and sight lines computed by the CRS4.
- Photos and videos: linked from the NurNet Mediateca, credited to their authors.
- There are no testimonials, usage figures, press or endorsements. Do not invent any.

## Product Principles

1. **The map is the product.** Everything else serves finding a site on it and getting there.
2. **Honest about the source.** Credit NurNet and its partners, keep the census's wording, and never pass as official.
3. **Works where the sites are.** Offline-first, quick on a phone, usable one-handed outdoors.
4. **Nothing taken from the visitor.** No accounts, tracking or data collection beyond what showing the map strictly needs.

## Accessibility & Inclusion

The app is checked against WCAG AA during development: axe through `@nuxt/a11y`, AA contrast in the palette, keyboard and screen-reader labels. Outdoor use in bright sunlight makes contrast and target size matter more than usual.
