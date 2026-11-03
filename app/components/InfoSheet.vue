<script setup lang="ts">
// The (i) sheet: how to read the map, how to use the app, privacy, and the credits
const infoOpen = useInfoOpen();

// Like the drawer: the header floats over the content, which scrolls under it, and turns into a
// blurred bar once there is something under it
const body = ref<HTMLElement | null>(null);
const { y: bodyY } = useScroll(body);
const headerEl = ref<HTMLElement | null>(null);
const { height: headerHeight } = useElementSize(headerEl, undefined, { box: "border-box" });

// The privacy details, folded: most visitors open the sheet for the legend
const privacyOpen = ref(false);

const link = "font-semibold text-terracotta-dark underline underline-offset-2";
const pill =
  "flex min-h-11 items-center justify-center gap-x-2 rounded-full bg-white/80 px-4 font-semibold text-basalt shadow-[0_1px_3px_rgb(49_37_40/0.12)] transition hover:bg-white active:scale-95";

// The status values in the data, with the icons the site page uses (see statusOf)
const STATUSES = ["mantenuto", "diroccato", "non visibile"].map((value) => statusOf(value)!);

const TIPS = [
  {
    icon: "i-lucide-search",
    text: "Cerca per nome del sito o del comune; la mappa mette in risalto i risultati.",
  },
  {
    icon: "i-lucide-dices",
    text: "«A caso» apre un sito qualsiasi, del tipo scelto se ne hai selezionato uno.",
  },
  {
    icon: "i-lucide-mountain",
    text: "«3D» inclina la mappa e mostra il rilievo: le linee di vista corrono da torre a torre.",
  },
  {
    icon: "i-lucide-navigation",
    text: "«Indicazioni» apre il sito nell'app di mappe che usi, per partire da lì.",
  },
];
</script>

<template>
  <!-- Custom content in the app's own style; title and description stay for screen readers -->
  <UModal
    v-model:open="infoOpen"
    title="NurNet+"
    description="Come leggere la mappa, come usarla, privacy e crediti"
    :ui="{
      overlay: 'bg-basalt/25 backdrop-blur-[2px]',
      content: 'max-w-md divide-y-0 rounded-3xl bg-panel/90 shadow-xl ring-0 backdrop-blur-2xl',
    }"
  >
    <template #content="{ close }">
      <div class="relative flex max-h-[85dvh] flex-col rounded-[inherit]">
        <header
          ref="headerEl"
          class="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-x-3 rounded-t-3xl p-4 pb-2 transition-[background-color,box-shadow] duration-200"
          :class="
            bodyY > 0 ? 'bg-panel/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl' : ''
          "
        >
          <div class="flex flex-col gap-y-1">
            <BrandMark />
            <p class="text-sm text-muted">Esplora i siti della Sardegna nuragica</p>
          </div>
          <button
            type="button"
            class="-mr-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-well active:scale-95"
            aria-label="Chiudi"
            @click="close"
          >
            <span class="flex size-9 items-center justify-center rounded-full bg-well/70">
              <IconCancel class="size-4.5" />
            </span>
          </button>
        </header>

        <div
          ref="body"
          class="scrollbar-hidden flex flex-col gap-y-6 overflow-y-auto overscroll-contain rounded-[inherit] px-4 pb-6 text-sm text-basalt"
          :style="{ paddingTop: `${headerHeight + 8}px` }"
        >
          <p class="text-pretty text-muted">
            Un client non ufficiale per esplorare nuraghi, domus de janas, tombe dei giganti, pozzi
            sacri e gli altri siti censiti dal
            <a :class="link" href="https://www.nurnet.net/" target="_blank" rel="noopener"
              >progetto NurNet</a
            >, su una mappa veloce anche da telefono.
          </p>

          <section class="flex flex-col gap-y-3" aria-labelledby="info-legend">
            <h3 id="info-legend" class="text-base font-semibold">Legenda</h3>
            <ul class="grid grid-cols-2 gap-x-4 gap-y-2">
              <li
                v-for="category in CATEGORIES"
                :key="category.name"
                class="flex items-center gap-x-2"
              >
                <CategoryIcon :category-id="category.ids[0]" class="size-5 shrink-0" />
                {{ category.name }}
              </li>
            </ul>

            <h4 class="pt-2 text-xs font-semibold text-muted">Stato di conservazione</h4>
            <ul class="flex flex-wrap gap-x-4 gap-y-1.5">
              <li
                v-for="status in STATUSES"
                :key="status.label"
                class="flex items-center gap-x-1.5"
              >
                <UIcon
                  :name="status.icon"
                  class="size-4.5 shrink-0 text-muted"
                  aria-hidden="true"
                />
                {{ status.label }}
              </li>
            </ul>

            <h4 class="pt-2 text-xs font-semibold text-muted">Linee di vista tra nuraghi</h4>
            <ul class="flex flex-col gap-y-1.5">
              <li
                v-for="level in VISIBILITY_LEVELS"
                :key="level.label"
                class="flex items-center gap-x-2"
              >
                <svg class="h-2 w-8 shrink-0" viewBox="0 0 32 8" aria-hidden="true">
                  <line
                    x1="2"
                    y1="4"
                    x2="30"
                    y2="4"
                    :stroke="level.color"
                    stroke-width="3"
                    stroke-linecap="round"
                    :stroke-dasharray="level.dashed ? '5 4' : undefined"
                  />
                </svg>
                {{ level.label }}
              </li>
            </ul>
            <p class="text-pretty text-muted">
              Calcolate da CRS4 sul modello del terreno: quanto si vede di una torre alta 15 m
              dall'altra. Si aprono dalla pagina di un nuraghe.
            </p>
          </section>

          <section class="flex flex-col gap-y-3" aria-labelledby="info-tips">
            <h3 id="info-tips" class="text-base font-semibold">Come si usa</h3>
            <ul class="flex flex-col gap-y-2">
              <li v-for="tip in TIPS" :key="tip.icon" class="flex gap-x-2">
                <UIcon
                  :name="tip.icon"
                  class="mt-0.5 size-4.5 shrink-0 text-muted"
                  aria-hidden="true"
                />
                <span class="text-pretty">{{ tip.text }}</span>
              </li>
            </ul>
          </section>

          <!-- What leaves the device and where to. Keep in step with the code: the location
               (TheMap), the services the map and the site pages load from, the videos (POIVideo),
               the offline cache (nuxt.config pwa) -->
          <section class="flex flex-col gap-y-2" aria-labelledby="info-privacy">
            <h3 id="info-privacy" class="text-base font-semibold">Privacy</h3>
            <p class="text-pretty">
              NurNet+ non ha account, cookie né statistiche e non raccoglie nulla su di te. Per
              mostrarti mappa, foto e video il browser si collega ad altri servizi, che vedono il
              tuo indirizzo IP.
            </p>
            <dl v-show="privacyOpen" id="info-privacy-details" class="flex flex-col">
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">La tua posizione</dt>
                <dd class="text-pretty">
                  Solo quando tocchi
                  <UIcon
                    name="i-lucide-locate-fixed"
                    class="inline-block size-4 align-[-0.2em]"
                    aria-hidden="true"
                  /><span class="sr-only">il pulsante «Mostra la mia posizione»</span> sulla mappa e
                  dai il permesso al browser. Serve a mostrarti sulla mappa e resta sul dispositivo:
                  non viene inviata a nessuno né salvata.
                </dd>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">Mappa, foto e dati</dt>
                <dd class="text-pretty">
                  La mappa arriva da OpenFreeMap (<a
                    :class="link"
                    href="https://openfreemap.org/privacy/"
                    target="_blank"
                    rel="noopener"
                    >informativa</a
                  >) e il rilievo da Amazon Web Services: vedono la zona che stai guardando, non la
                  tua posizione. Le foto arrivano da NurNet, che vede quali siti apri; l'app e i
                  dati dei siti da GitHub Pages.
                </dd>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">Video</dt>
                <dd class="text-pretty">
                  Solo quando tocchi «Carica il video»; da lì valgono le regole di YouTube (Google)
                  o Facebook. La scelta vale finché non chiudi l'app.
                </dd>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">Indicazioni</dt>
                <dd class="text-pretty">
                  Passano la posizione del sito all'app di mappe che usi. Il percorso lo calcola
                  lei, con le sue regole sulla privacy.
                </dd>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">Sul dispositivo</dt>
                <dd class="text-pretty">
                  Per funzionare offline, l'app tiene una copia di sé e dei dati dei siti nella
                  memoria del browser. La cancelli dalle impostazioni del browser per questo sito.
                </dd>
              </div>
            </dl>
            <button
              type="button"
              class="inline-flex min-h-11 cursor-pointer items-center gap-x-1 self-start font-semibold text-terracotta-dark"
              :aria-expanded="privacyOpen"
              aria-controls="info-privacy-details"
              @click="privacyOpen = !privacyOpen"
            >
              {{ privacyOpen ? "Meno dettagli" : "Cosa passa ad altri servizi" }}
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 transition-transform"
                :class="{ 'rotate-180': privacyOpen }"
                aria-hidden="true"
              />
            </button>
          </section>

          <section class="flex flex-col gap-y-2" aria-labelledby="info-credits">
            <h3 id="info-credits" class="text-base font-semibold">Crediti</h3>
            <dl class="flex flex-col">
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">Dati</dt>
                <dd>
                  Dal
                  <a
                    :class="link"
                    href="https://nurnet.crs4.it/nurnetgeo/"
                    target="_blank"
                    rel="noopener"
                    >Geoportale NurNet</a
                  >, realizzato dal CRS4 con la Fondazione Nurnet, con licenza
                  <a
                    :class="link"
                    href="https://creativecommons.org/licenses/by/4.0/deed.it"
                    target="_blank"
                    rel="noopener"
                    >CC BY 4.0</a
                  >. NurNet+ è un'app indipendente, non ufficiale.
                </dd>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">Foto</dt>
                <dd>
                  Dei rispettivi autori, pubblicate nella
                  <a
                    :class="link"
                    href="https://www.nurnet.net/mediateca/"
                    target="_blank"
                    rel="noopener"
                    >Mediateca NurNet</a
                  >.
                </dd>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">Mappa</dt>
                <dd>
                  <a :class="link" href="https://openfreemap.org/" target="_blank" rel="noopener"
                    >OpenFreeMap</a
                  >,
                  <a :class="link" href="https://openmaptiles.org/" target="_blank" rel="noopener"
                    >© OpenMapTiles</a
                  >, dati
                  <a
                    :class="link"
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noopener"
                    >© OpenStreetMap</a
                  >, rilievo
                  <a
                    :class="link"
                    href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md"
                    target="_blank"
                    rel="noopener"
                    >Terrain Tiles</a
                  >. Realizzata con MapLibre.
                </dd>
              </div>
            </dl>
          </section>

          <div class="flex flex-wrap items-center justify-center gap-2 self-center">
            <a
              :class="pill"
              href="https://github.com/Redemption198/nurnet-plus"
              target="_blank"
              rel="noopener"
            >
              <UIcon name="i-lucide-github" class="size-4" aria-hidden="true" /> Codice sorgente
            </a>
            <a
              :class="pill"
              href="https://github.com/Redemption198/nurnet-plus/issues/new"
              target="_blank"
              rel="noopener"
            >
              <UIcon name="i-lucide-bug" class="size-4" aria-hidden="true" /> Segnala un problema
            </a>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
