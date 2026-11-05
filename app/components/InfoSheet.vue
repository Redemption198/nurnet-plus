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
  "flex min-h-11 items-center justify-center gap-x-2 rounded-full bg-surface/80 px-4 font-semibold text-basalt shadow-[0_1px_3px_rgb(49_37_40/0.12)] transition hover:bg-surface press";

// The status values in the data, with the icons the site page uses (see statusOf)
const STATUSES = ["mantenuto", "diroccato", "non visibile"].map((value) => statusOf(value)!);

// Mac or not: the rotation tip names its keys and gestures
const isMac = useIsMac();
const isDark = useIsDark();
const isDesktop = useIsDesktop();

// Light or dark: the system's (the default), or the visitor's own, kept on the device. At dusk
// the system may turn dark while the light map still reads better outdoors
const colorMode = useColorMode();
const APPEARANCES = [
  { value: "system", label: "Automatico", icon: "i-lucide-sun-moon" },
  { value: "light", label: "Chiaro", icon: "i-lucide-sun" },
  { value: "dark", label: "Scuro", icon: "i-lucide-moon" },
];
const TIPS = computed(() => [
  {
    icon: "i-lucide-search",
    text: "Cerca un sito per nome o per comune: i risultati vengono evidenziati sulla mappa.",
  },
  {
    icon: "i-lucide-dices",
    text: "«A caso» ti propone un sito qualsiasi, del tipo selezionato se ne hai scelto uno.",
  },
  {
    icon: "i-lucide-mountain",
    // On phones there is no 3D button until the map is tilted: the gesture tilts it
    text: isDesktop.value
      ? "«3D» inclina la mappa e fa emergere il rilievo, con le linee di vista tese da una torre all'altra."
      : "Trascina in su con due dita per inclinare la mappa e far emergere il rilievo, con le linee di vista tese da una torre all'altra; «2D» la riporta in piano.",
  },
  {
    icon: "i-lucide-rotate-3d",
    text: isMac.value
      ? "Per ruotare la mappa usa due dita sul telefono; sul Mac trascina la bussola, ruota due dita sul trackpad (in Safari) o trascina la mappa tenendo premuto Control. Tocca la bussola per rimettere il nord in alto."
      : "Per ruotare la mappa usa due dita sul telefono; al computer trascina la bussola, oppure la mappa con il tasto destro o tenendo premuto Ctrl. Tocca la bussola per rimettere il nord in alto.",
  },
  {
    icon: "i-lucide-navigation",
    text: "«Indicazioni» apre il sito nella tua app di mappe, da cui puoi avviare il percorso.",
  },
]);
</script>

<template>
  <!-- Custom content in the app's own style; title and description stay for screen readers -->
  <UModal
    v-model:open="infoOpen"
    title="NurNet+"
    description="Come leggere la mappa, come usarla, privacy e crediti"
    :ui="{
      overlay: 'bg-basalt/25 backdrop-blur-[2px] dark:bg-black/50',
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
            <BrandMark class="text-2xl" />
            <p class="text-sm text-muted">Esplora i siti della Sardegna nuragica</p>
          </div>
          <button
            type="button"
            class="-mr-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-well press"
            aria-label="Chiudi"
            @click="close"
          >
            <span class="flex size-9 items-center justify-center rounded-full bg-well/70">
              <UIcon name="i-lucide-x" class="size-5" aria-hidden="true" />
            </span>
          </button>
        </header>

        <div
          ref="body"
          class="scrollbar-hidden flex flex-col gap-y-6 overflow-y-auto overscroll-contain rounded-[inherit] px-4 pb-6 text-sm text-basalt"
          :style="{ paddingTop: `${headerHeight + 8}px` }"
        >
          <p class="text-pretty text-muted">
            Un'app non ufficiale per esplorare nuraghi, domus de janas, tombe dei giganti, pozzi
            sacri e gli altri siti censiti dal
            <a :class="link" href="https://www.nurnet.net/" target="_blank" rel="noopener"
              >progetto NurNet</a
            >, su una mappa agile anche dal telefono.
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
                    :stroke="isDark ? level.darkColor : level.color"
                    stroke-width="3"
                    stroke-linecap="round"
                    :stroke-dasharray="level.dashed ? '5 4' : undefined"
                  />
                </svg>
                {{ level.label }}
              </li>
            </ul>
            <p class="text-pretty text-muted">
              Calcolate dal CRS4 sul modello digitale del terreno, indicano quanto di una torre alta
              15 m sia visibile dall'altra. Le trovi nella scheda di ogni nuraghe, con «Mostra sulla
              mappa».
            </p>
          </section>

          <section class="flex flex-col gap-y-3" aria-labelledby="info-appearance">
            <h3 id="info-appearance" class="text-base font-semibold">Aspetto</h3>
            <div
              class="grid grid-cols-3 gap-x-1 rounded-full bg-well/70 p-1"
              role="radiogroup"
              aria-labelledby="info-appearance"
            >
              <button
                v-for="appearance in APPEARANCES"
                :key="appearance.value"
                type="button"
                role="radio"
                :aria-checked="colorMode.preference === appearance.value"
                class="flex min-h-11 cursor-pointer items-center justify-center gap-x-1.5 rounded-full px-2 font-semibold transition press press-subtle"
                :class="
                  colorMode.preference === appearance.value
                    ? 'bg-surface text-basalt shadow-[0_1px_3px_rgb(49_37_40/0.12)]'
                    : 'text-muted hover:text-basalt'
                "
                @click="colorMode.preference = appearance.value"
              >
                <UIcon :name="appearance.icon" class="size-4.5 shrink-0" aria-hidden="true" />
                {{ appearance.label }}
              </button>
            </div>
            <p v-if="colorMode.preference === 'system'" class="text-pretty text-muted">
              Chiaro o scuro come il dispositivo. All'aperto, al tramonto, «Chiaro» può leggersi
              meglio.
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
              NurNet+ non ha account, non usa cookie né statistiche e non raccoglie alcun dato su di
              te. Per mostrarti mappa, foto e video, però, il browser si collega ad altri servizi,
              che ricevono il tuo indirizzo IP.
            </p>
            <dl v-show="privacyOpen" id="info-privacy-details" class="flex flex-col">
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">La tua posizione</dt>
                <dd class="text-pretty">
                  Viene usata solo se tocchi
                  <UIcon
                    name="i-lucide-locate-fixed"
                    class="inline-block size-4 align-[-0.2em]"
                    aria-hidden="true"
                  /><span class="sr-only">il pulsante «Mostra la mia posizione»</span> sulla mappa e
                  lo consenti al browser. Serve a mostrarti dove sei: rimane sul dispositivo e non
                  viene né inviata né conservata.
                </dd>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">Mappa, foto e dati</dt>
                <dd class="text-pretty">
                  La mappa è fornita da OpenFreeMap (<a
                    :class="link"
                    href="https://openfreemap.org/privacy/"
                    target="_blank"
                    rel="noopener"
                    >informativa</a
                  >) e il rilievo da Amazon Web Services: conoscono la zona che stai guardando, non
                  la tua posizione. Le foto provengono da NurNet, che sa quali siti nuragici apri;
                  l'app e i dati dei siti sono ospitati su GitHub Pages.
                </dd>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">Video</dt>
                <dd class="text-pretty">
                  Vengono caricati solo se tocchi «Carica il video»; da quel momento si applicano le
                  regole di
                  <a
                    :class="link"
                    href="https://support.google.com/youtube/answer/171780?hl=it"
                    target="_blank"
                    rel="noopener"
                    >YouTube (Google)</a
                  >
                  o di
                  <a
                    :class="link"
                    href="https://www.facebook.com/privacy/policy/"
                    target="_blank"
                    rel="noopener"
                    >Facebook</a
                  >. La scelta resta valida fino alla chiusura dell'app.
                </dd>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">Indicazioni</dt>
                <dd class="text-pretty">
                  La posizione del sito viene inviata alla tua app di mappe, che calcola il percorso
                  secondo le proprie regole sulla privacy.
                </dd>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">Sul dispositivo</dt>
                <dd class="text-pretty">
                  Per funzionare anche offline, l'app conserva una copia di sé e dei dati dei siti
                  nella memoria del browser, insieme all'aspetto scelto (chiaro o scuro), se ne hai
                  scelto uno. Puoi eliminarla dalle impostazioni del browser relative a questo sito.
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
              {{ privacyOpen ? "Mostra meno" : "Cosa viene condiviso con altri servizi" }}
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
                  >, realizzato dal CRS4 con la Fondazione Nurnet e distribuito con licenza
                  <a
                    :class="link"
                    href="https://creativecommons.org/licenses/by/4.0/deed.it"
                    target="_blank"
                    rel="noopener"
                    >CC BY 4.0</a
                  >. NurNet+ è un'app indipendente e non ufficiale.
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
                  >. Realizzata con
                  <a :class="link" href="https://maplibre.org/" target="_blank" rel="noopener"
                    >MapLibre</a
                  >.
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
