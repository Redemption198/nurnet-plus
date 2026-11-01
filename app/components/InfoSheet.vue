<script setup>
const infoOpen = useInfoOpen();

const link = "font-semibold text-terracotta-dark underline underline-offset-2";
</script>

<template>
  <!-- Custom content in the app's own style; title and description stay for screen readers -->
  <UModal
    v-model:open="infoOpen"
    title="NurNet+"
    description="Informazioni e crediti"
    :ui="{
      overlay: 'bg-slate-900/20 backdrop-blur-[2px]',
      content: 'max-w-md divide-y-0 rounded-3xl bg-slate-200/85 shadow-xl ring-0 backdrop-blur-2xl',
    }"
  >
    <template #content="{ close }">
      <div class="flex max-h-[85dvh] flex-col">
        <header class="flex items-center justify-between gap-x-3 p-4 pb-3">
          <div class="flex flex-col gap-y-1">
            <BrandMark />
            <p class="text-sm text-slate-600">Esplora i siti della Sardegna nuragica</p>
          </div>
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center self-start rounded-full bg-slate-400/30 text-slate-600 backdrop-blur-md transition hover:bg-slate-400/45 focus-visible:ring-2 focus-visible:ring-terracotta/60 focus-visible:outline-none active:scale-95"
            aria-label="Chiudi"
            @click="close"
          >
            <IconCancel class="h-4.5 w-4.5" />
          </button>
        </header>

        <div class="flex flex-col gap-y-2 overflow-y-auto px-4 pb-4 text-sm text-slate-700">
          <p class="px-1 pb-1">
            Un client non ufficiale per esplorare nuraghi, domus de janas, tombe dei giganti, pozzi
            sacri e gli altri siti censiti dal
            <a :class="link" href="https://www.nurnet.net/" target="_blank" rel="noopener"
              >progetto NurNet</a
            >, su una mappa veloce anche da telefono.
          </p>

          <section class="rounded-2xl bg-white/60 p-3 shadow-sm">
            <h3 class="mb-1 flex items-center gap-x-2 font-semibold text-basalt">
              <UIcon name="i-lucide-database" class="size-4 text-terracotta" /> Dati
            </h3>
            <p>
              Dal
              <a
                :class="link"
                href="https://nurnet.crs4.it/nurnetgeo/"
                target="_blank"
                rel="noopener"
                >Geoportale NurNet</a
              >, realizzato dal CRS4 con la Fondazione Nurnet e rilasciato con licenza Creative
              Commons.
            </p>
          </section>

          <section class="rounded-2xl bg-white/60 p-3 shadow-sm">
            <h3 class="mb-1 flex items-center gap-x-2 font-semibold text-basalt">
              <UIcon name="i-lucide-camera" class="size-4 text-terracotta" /> Foto
            </h3>
            <p>
              Dei rispettivi autori, pubblicate nella
              <a
                :class="link"
                href="https://www.nurnet.net/mediateca/"
                target="_blank"
                rel="noopener"
                >Mediateca NurNet</a
              >.
            </p>
          </section>

          <section class="rounded-2xl bg-white/60 p-3 shadow-sm">
            <h3 class="mb-1 flex items-center gap-x-2 font-semibold text-basalt">
              <UIcon name="i-lucide-map" class="size-4 text-terracotta" /> Mappa
            </h3>
            <p>
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
            </p>
          </section>

          <a
            class="mt-1 flex items-center justify-center gap-x-2 self-center rounded-full bg-white/80 px-4 py-1.5 font-semibold text-basalt shadow-sm transition hover:bg-white active:scale-95"
            href="https://github.com/Redemption198/nurnet-plus"
            target="_blank"
            rel="noopener"
          >
            <UIcon name="i-lucide-github" class="size-4" /> Codice sorgente
          </a>
        </div>
      </div>
    </template>
  </UModal>
</template>
