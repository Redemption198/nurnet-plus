<script setup>
const currentPOI = useCurrentPOI();

const router = useRouter();

function isURL(url) {
  try {
    const testURL = new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

if (!currentPOI.value.values_) router.push("/");

const drawerContent = useState("drawer-content");
const { y: contentY } = useScroll(drawerContent);
</script>

<template>
  <div v-if="currentPOI.values_" class="flex flex-col gap-y-2 pb-64">
    <DrawerHeader :scrolled="contentY > 0">
      <div class="flex items-center justify-between gap-x-3">
        <h2 class="font-display text-2xl leading-tight font-semibold text-basalt">
          {{ currentPOI.values_.name }}
        </h2>
        <NuxtLink
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-400/30 text-slate-600 backdrop-blur-md transition hover:bg-slate-400/45 active:scale-95"
          to="/"
          aria-label="Chiudi"
        >
          <IconCancel class="h-4.5 w-4.5" />
        </NuxtLink>
      </div>
    </DrawerHeader>

    <!-- Only when explicitly unverified: sites added in later data refreshes have no value -->
    <LazyPOIUnverifiedBanner v-if="currentPOI.values_.verified === false" class="mx-4" />

    <div class="mx-4 flex gap-x-4">
      <POITypeCard />

      <POIStatusCard v-if="currentPOI.values_.detailsStatus !== 'loading'" />
      <!-- Placeholder while the details file is still loading (only right after startup) -->
      <div
        v-else
        class="w-full animate-pulse rounded-2xl bg-slate-300/60"
        role="status"
        aria-label="Caricamento dei dettagli"
      />
    </div>

    <p v-if="currentPOI.values_.comune" class="mx-4 flex flex-col text-lg font-semibold">
      <span class="text-sm text-slate-700">Comune</span>{{ currentPOI.values_.comune }}
    </p>

    <p v-if="currentPOI.values_.localita" class="mx-4 flex flex-col text-lg font-semibold">
      <span class="text-sm text-slate-700">Località</span>{{ currentPOI.values_.localita }}
    </p>

    <div
      v-if="currentPOI.values_.detailsStatus === 'loading'"
      class="mx-4 flex animate-pulse flex-col gap-y-2"
      aria-hidden="true"
    >
      <div class="h-4 w-1/3 rounded-full bg-slate-300/60" />
      <div class="h-4 w-full rounded-full bg-slate-300/60" />
      <div class="h-4 w-5/6 rounded-full bg-slate-300/60" />
    </div>

    <p v-if="currentPOI.values_.detailsStatus === 'error'" class="mx-4 text-sm text-slate-600">
      Foto e descrizione non disponibili al momento. Controlla la connessione e riprova.
    </p>

    <p
      v-if="currentPOI.values_.source && !isURL(currentPOI.values_.source)"
      class="mx-4 flex flex-col wrap-break-word text-lg font-semibold"
    >
      <span class="text-sm text-slate-700">Fonte</span>{{ currentPOI.values_.source }}
    </p>

    <div
      v-if="currentPOI.values_.description"
      class="mx-4 flex flex-col gap-y-2 text-base text-slate-700"
    >
      <span class="text-sm font-semibold text-slate-700">Descrizione</span>
      <p v-for="(paragraph, i) in currentPOI.values_.description.split('\n\n')" :key="i">
        {{ paragraph }}
      </p>
    </div>

    <POIPhotoSlider v-if="currentPOI.values_.photos?.length > 0" />

    <POIVideo v-if="currentPOI.values_.youtube" />

    <a
      v-if="currentPOI.values_.photos?.length > 0"
      :href="`https://www.nurnet.net/mediateca/?s=${currentPOI.values_.content_id}`"
      target="_blank"
      rel="noopener"
      class="mx-4 my-2 flex min-w-max items-center justify-center gap-x-2 rounded-2xl bg-terracotta fill-white px-4 py-2 font-semibold text-white transition-transform hover:scale-95"
      >Vai alla Mediateca NurNet<IconOpenOutside />
    </a>

    <a
      v-if="isURL(currentPOI.values_.source)"
      :href="currentPOI.values_.source"
      target="_blank"
      rel="noopener"
      class="mx-4 min-w-max rounded-2xl px-4 py-2 text-center font-semibold text-terracotta-dark transition-transform hover:scale-95"
    >
      Fonte
    </a>

    <p v-if="currentPOI.values_.date" class="self-center text-sm text-slate-700">
      Aggiunto il
      {{ useDateFormat(new Date(currentPOI.values_.date), "DD/MM/YYYY").value.replace('"', "") }}
    </p>
  </div>
</template>
