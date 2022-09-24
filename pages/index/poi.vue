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
</script>

<template>
  <div v-if="currentPOI.values_" class="flex flex-col gap-y-2 pb-64">
    <div class="mx-4 flex items-center justify-between">
      <p class="text-xl font-bold">{{ currentPOI.values_.name }}</p>
      <NuxtLink
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-400/75 fill-white"
        to="/"
      >
        <IconCancel class="h-4 w-4" />
      </NuxtLink>
    </div>

    <LazyPOIUnverifiedBanner v-if="!currentPOI.values_.verified" class="mx-4" />

    <div class="mx-4 flex gap-x-2">
      <POITypeCard />

      <POIStatusCard />
    </div>

    <p
      v-if="currentPOI.values_.comune"
      class="mx-4 flex flex-col text-lg font-semibold"
    >
      <span class="text-sm text-slate-700">Comune</span
      >{{ currentPOI.values_.comune }}
    </p>

    <p
      v-if="currentPOI.values_.localita"
      class="mx-4 flex flex-col text-lg font-semibold"
    >
      <span class="text-sm text-slate-700">Localita</span
      >{{ currentPOI.values_.localita }}
    </p>

    <p
      v-if="currentPOI.values_.source && !isURL(currentPOI.values_.source)"
      class="mx-4 flex flex-col break-words text-lg font-semibold"
    >
      <span class="text-sm text-slate-700">Fonte</span
      >{{ currentPOI.values_.source }}
    </p>

    <POIPhotoSlider v-if="currentPOI.values_.photos.length > 0" />

    <POIVideo v-if="currentPOI.values_.youtube" />

    <a
      v-if="currentPOI.values_.photos.length > 0"
      :href="`https://www.nurnet.net/mediateca/?s=${currentPOI.values_.content_id}`"
      target="_blank"
      rel="noopener"
      class="mx-4 my-2 flex min-w-max items-center justify-center gap-x-2 rounded-lg bg-blue-400 fill-white px-4 py-2 font-semibold text-white transition-transform hover:scale-95"
      >Vai alla Mediateca NurNet<IconOpenOutside />
    </a>

    <a
      v-if="isURL(currentPOI.values_.source)"
      :href="currentPOI.values_.source"
      target="_blank"
      rel="noopener"
      class="mx-4 min-w-max rounded-lg px-4 py-2 text-center font-semibold text-blue-400 transition-transform hover:scale-95"
    >
      Fonte
    </a>

    <p class="self-center text-sm text-slate-700">
      Aggiunto il
      {{
        useDateFormat(
          new Date(currentPOI.values_.date),
          "DD/MM/YYYY"
        ).value.replace('"', "")
      }}
    </p>
  </div>
</template>
