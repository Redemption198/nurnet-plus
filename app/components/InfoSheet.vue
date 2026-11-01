<script setup>
const infoOpen = useInfoOpen();
</script>

<template>
  <UModal
    v-model:open="infoOpen"
    title="NurNet+"
    description="Esplora i siti archeologici della Sardegna nuragica"
    :ui="{ title: 'font-display text-2xl text-basalt', content: 'rounded-3xl' }"
  >
    <template #body>
      <div class="flex flex-col gap-y-4 text-sm text-slate-700">
        <p>
          NurNet+ è un client non ufficiale per consultare i dati del
          <a
            class="font-semibold text-terracotta underline"
            href="https://www.nurnet.net/"
            target="_blank"
            rel="noopener"
            >progetto NurNet</a
          >: nuraghi, domus de janas, tombe dei giganti, pozzi sacri e altri siti, su una mappa
          veloce anche da telefono.
        </p>

        <section>
          <h3 class="font-semibold text-basalt">Dati</h3>
          <p>
            Siti e foto dal
            <a
              class="text-terracotta underline"
              href="https://nurnet.crs4.it/nurnetgeo/"
              target="_blank"
              rel="noopener"
              >Geoportale NurNet</a
            >
            realizzato dal CRS4 con la Fondazione Nurnet, rilasciati con licenza Creative Commons.
            Le foto appartengono ai rispettivi autori e sono pubblicate nella
            <a
              class="text-terracotta underline"
              href="https://www.nurnet.net/mediateca/"
              target="_blank"
              rel="noopener"
              >Mediateca NurNet</a
            >.
          </p>
        </section>

        <section>
          <h3 class="font-semibold text-basalt">Mappa</h3>
          <p>
            <a
              class="text-terracotta underline"
              href="https://openfreemap.org/"
              target="_blank"
              rel="noopener"
              >OpenFreeMap</a
            >,
            <a
              class="text-terracotta underline"
              href="https://openmaptiles.org/"
              target="_blank"
              rel="noopener"
              >© OpenMapTiles</a
            >, dati
            <a
              class="text-terracotta underline"
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener"
              >© OpenStreetMap</a
            >, rilievo da
            <a
              class="text-terracotta underline"
              href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md"
              target="_blank"
              rel="noopener"
              >Terrain Tiles</a
            >. Realizzata con MapLibre.
          </p>
        </section>

        <p class="text-xs text-slate-500">
          Codice sorgente su
          <a
            class="underline"
            href="https://github.com/Redemption198/nurnet-plus"
            target="_blank"
            rel="noopener"
            >GitHub</a
          >.
        </p>
      </div>
    </template>
  </UModal>
</template>
