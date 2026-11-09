# NurNet+ Test Plan

## Application Overview

NurNet+ is a Nuxt PWA map of ~7516 Sardinian nuraghi and archaeological sites (UI default language: Italian). Features: map with markers, search box + results list, type filter chips, "A caso" (random site) button, per-site info sheet at /nurnet-plus/poi/<ID>/ (photos, directions, share, coordinates, description, line-of-sight list "Visibili da qui", "Il sito" data, extra data), settings sheet (theme Automatico/Chiaro/Scuro, language Italiano/English, Legenda, Come si usa, Privacy, Informazioni), map controls (zoom, 3D, compass, locate). Unknown site IDs redirect to / with a "Sito non trovato" toast. All scenarios assume a fresh browser context (no stored settings) starting at http://localhost:3000/nurnet-plus/. Seed: e2e/seed.spec.ts.

## Test Scenarios

### 1. Map loading and filters

**Seed:** `e2e/seed.spec.ts`

#### 1.1. Map loads with site markers and count

**File:** `tests/map/load.spec.ts`

**Steps:**

1. Navigate to /nurnet-plus/ and wait for the 'Caricamento dei siti' status to disappear - expect: Page title is 'NurNet+' - expect: Region 'Map' is visible - expect: Text '7516 siti nella mappa' is shown - expect: Result list has the accessible name '7516 siti nella mappa' and contains site links to /nurnet-plus/poi/<ID>/ - expect: No console errors
2. Verify the map controls: Ingrandisci, Riduci, 3D, Bussola, Mostra la mia posizione - expect: All five controls are visible and enabled

#### 1.2. Type filter chips narrow the sites

**File:** `tests/map/filters.spec.ts`

**Steps:**

1. Click the 'Nuraghe' filter chip - expect: The count text changes to a number lower than 7516 - expect: The chip appears pressed/active - expect: List items are only nuraghi
2. Click the same chip again - expect: The filter is removed and the count returns to 7516 siti nella mappa
3. Click 'Menhir', then 'Dolmen' - expect: the chips select one type at a time, so 'Dolmen' replaces 'Menhir' and the count is the Dolmen sites only

#### 1.3. Map controls: zoom, 3D toggle, compass

**File:** `tests/map/controls.spec.ts`

**Steps:**

1. Click 'Ingrandisci' then 'Riduci' - expect: Map zoom changes without errors and the page stays on /nurnet-plus/
2. Click 'Vista 3D con il rilievo' - expect: The 3D button state changes (pressed/label update) and the map tilts
3. Click the compass button - expect: Map bearing resets to north with no errors

### 2. Search

**Seed:** `e2e/seed.spec.ts`

#### 2.1. Search by site name or municipality narrows results

**File:** `tests/search/results.spec.ts`

**Steps:**

1. Type 'Barumini' in the searchbox 'Cerca un sito o un comune' - expect: Text '29 siti trovati' is shown - expect: All listed items show 'Barumini · Marmilla' as subtitle - expect: Results include 'Casa Zapata e Nuraxi 'e Cresia'
2. Click the result 'Casa Zapata e Nuraxi 'e Cresia' - expect: URL becomes /nurnet-plus/poi/NUR5023/ - expect: The info sheet with that heading opens and the title becomes 'Casa Zapata e Nuraxi 'e Cresia · NurNet+'

#### 2.2. Search with no results

**File:** `tests/search/no-results.spec.ts`

**Steps:**

1. Type 'zzzzqqqq' in the searchbox - expect: No result links are listed - expect: An empty-state / '0 siti' message is displayed instead of an error - expect: The page does not crash and no console errors appear
2. Clear the search using the clear button inside the searchbox - expect: The searchbox is empty and the count returns to 7516 siti nella mappa

#### 2.3. Search is case- and accent-insensitive and trims whitespace

**File:** `tests/search/normalisation.spec.ts`

**Steps:**

1. Type ' BARUMINI ' in the searchbox - expect: The same 29 results as for 'Barumini' are shown
2. Replace the text with 'Allee couverte' (no accent) - expect: Sites named 'Allée couverte …' appear in the results

#### 2.4. Search combined with a type filter

**File:** `tests/search/with-filter.spec.ts`

**Steps:**

1. Type 'Barumini' then enable the 'Nuraghe' chip - expect: Count is lower than or equal to 29 and all items are nuraghi in Barumini
2. Clear the search text - expect: The Nuraghe filter remains active and the count shows all nuraghi

### 3. Site info sheet

**Seed:** `e2e/seed.spec.ts`

#### 3.1. Info sheet shows all main sections

**File:** `tests/site/sections.spec.ts`

**Steps:**

1. Navigate to /nurnet-plus/poi/NUR5023/ - expect: Heading 'Casa Zapata e Nuraxi 'e Cresia' is visible - expect: Subtitle 'Nuraghe complesso · Barumini, Marmilla' is shown - expect: Regions 'Foto di …', 'Descrizione', 'Visibili da qui · 36' and 'Il sito' are visible - expect: Links 'Indicazioni' (geo: URL) and 'Foto nella Mediateca NurNet' are present - expect: Button 'Copia le coordinate: 39.70283, 8.99986' is present

#### 3.2. Photo gallery opens full screen

**File:** `tests/site/photos.spec.ts`

**Steps:**

1. On /poi/NUR5023/ click 'Apri la foto 1 di 20 a schermo intero' - expect: A full-screen viewer opens showing photo 1 of 20
2. Navigate to the next photo and then press Escape - expect: Photo 2 is shown, then the viewer closes and the info sheet remains open

#### 3.3. Line-of-sight list: expand and show on map

**File:** `tests/site/visibility.spec.ts`

**Steps:**

1. On /poi/NUR5023/ click 'Mostra tutti (36)' - expect: The list expands to 36 items with visibility labels (Ben visibile, Visibile, Poco visibile)
2. Click 'Mostra sulla mappa' - expect: Sight lines are drawn on the map and the legend 'Legenda delle linee di vista' is visible
3. Click the first visible site 'Su Nuraxi' - expect: URL changes to /nurnet-plus/poi/NUR4974/ and the sheet updates to that site

#### 3.4. Expand 'Altri dati' and copy coordinates

**File:** `tests/site/details.spec.ts`

**Steps:**

1. Click 'Altri dati (3)' in the 'Il sito' region - expect: Three additional data rows are revealed
2. Click the coordinates button - expect: Coordinates are copied to the clipboard and a confirmation toast/feedback appears

#### 3.5. Close the info sheet

**File:** `tests/site/close.spec.ts`

**Steps:**

1. On /poi/NUR5023/ click 'Chiudi' - expect: URL becomes /nurnet-plus/ - expect: The sheet closes and the search/list UI is visible again
2. Use browser Back - expect: The info sheet for NUR5023 reopens

### 4. Random site

**Seed:** `e2e/seed.spec.ts`

#### 4.1. 'A caso' opens a random site

**File:** `tests/random/random.spec.ts`

**Steps:**

1. Click the 'A caso' button - expect: URL changes to /nurnet-plus/poi/<ID>/ - expect: The info sheet shows a site heading and the map centres on it
2. Close the sheet and click 'A caso' again - expect: A site sheet opens again (may differ from the first) without errors

#### 4.2. 'A caso' respects the active type filter

**File:** `tests/random/random-filter.spec.ts`

**Steps:**

1. Enable the 'Menhir' chip and click 'A caso' several times - expect: Each opened site is of type Menhir

### 5. Settings sheet

**Seed:** `e2e/seed.spec.ts`

#### 5.1. Open and close settings sheet

**File:** `tests/settings/open-close.spec.ts`

**Steps:**

1. Click the 'NurNet+: impostazioni e informazioni' button - expect: Dialog 'NurNet+' opens with sections Aspetto, Lingua and the entries Legenda, Come si usa, Privacy, Informazioni e crediti
2. Click 'Chiudi' - expect: Dialog closes and focus returns to the settings button

#### 5.2. Switch theme light/dark and persist

**File:** `tests/settings/theme.spec.ts`

**Steps:**

1. Open settings; verify 'Automatico' radio is checked by default - expect: Automatico is checked
2. Select 'Scuro' - expect: The document switches to dark appearance (dark class/colour-scheme) and 'Scuro' is checked
3. Select 'Chiaro', then reload the page - expect: Light appearance applies and 'Chiaro' is still selected after reload

#### 5.3. Switch language to English and persist

**File:** `tests/settings/language.spec.ts`

**Steps:**

1. Open settings and select 'English' in the Lingua radiogroup - expect: UI labels change to English (e.g. searchbox, 'Random' button, counts) and 'English' is checked
2. Open /poi/NUR5023/ - expect: Section headings and descriptions are shown in English where translations exist, with a fallback to Italian otherwise
3. Reload the page - expect: English remains selected
4. Switch back to 'Italiano' - expect: UI returns to Italian

#### 5.4. Info sub-pages (Legenda, Come si usa, Privacy, Crediti)

**File:** `tests/settings/info-pages.spec.ts`

**Steps:**

1. Open settings and click each of 'Legenda', 'Come si usa', 'Privacy' and 'Informazioni e crediti' in turn - expect: Each opens a content panel with a heading and non-empty text - expect: A back/close control returns to the settings list

### 6. URL and deep-link state

**Seed:** `e2e/seed.spec.ts`

#### 6.1. Deep link to a site opens its sheet directly

**File:** `tests/url/deeplink.spec.ts`

**Steps:**

1. Open /nurnet-plus/poi/NUR5023/ in a fresh context - expect: The sheet for 'Casa Zapata e Nuraxi 'e Cresia' is shown and the map is centred on the site - expect: Page title includes the site name

#### 6.2. Unknown site ID shows 'Sito non trovato'

**File:** `tests/url/unknown-site.spec.ts`

**Steps:**

1. Open /nurnet-plus/poi/NUR999999/ - expect: URL is redirected to /nurnet-plus/ - expect: A toast 'Sito non trovato — Il link non corrisponde a nessun sito della mappa.' appears and can be dismissed with 'Chiudi' - expect: The map and all 7516 sites load normally

#### 6.3. Malformed poi URL is handled gracefully

**File:** `tests/url/malformed.spec.ts`

**Steps:**

1. Open /nurnet-plus/poi/%00%3Cscript%3E/ and /nurnet-plus/poi/ - expect: No crash or unhandled error; the app falls back to the map home (with the not-found toast where applicable) and no script executes

### 7. Keyboard and mobile viewport

**Seed:** `e2e/seed.spec.ts`

#### 7.1. Keyboard navigation and focus handling

**File:** `tests/a11y/keyboard.spec.ts`

**Steps:**

1. Press Tab repeatedly from page load - expect: Focus moves in logical order: settings button, searchbox, 'A caso', filter chips, result links, map controls, each with a visible focus indicator
2. Focus a result link and press Enter - expect: The site sheet opens
3. Press Escape inside the open settings dialog - expect: Dialog closes

#### 7.2. Map compass keyboard rotation

**File:** `tests/a11y/compass-keys.spec.ts`

**Steps:**

1. Focus the compass button and press ArrowLeft then ArrowRight - expect: The map rotates left and right; the compass icon reflects the bearing
2. Click the compass - expect: Bearing resets to north

#### 7.3. Mobile viewport layout (390x844)

**File:** `tests/mobile/layout.spec.ts`

**Steps:**

1. Set viewport to 390x844 and load /nurnet-plus/ - expect: Search, filter chips and map are usable with no horizontal scroll
2. Open a site via search result - expect: The info sheet appears as a bottom sheet that does not hide the whole map and can be closed with 'Chiudi'
3. Open settings - expect: The settings dialog fits the viewport and is scrollable if needed
