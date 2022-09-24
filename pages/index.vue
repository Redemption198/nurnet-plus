<script setup>
const NuxtPage = resolveComponent("NuxtPage");
const SearchResults = resolveComponent("SearchResults");

const config = useRuntimeConfig();

const { data: mapData, pending } = useLazyFetch("/nurnet-data.json", {
  baseURL: config.public.baseURL,
  server: false,
});
</script>

<template>
  <div class="h-screen w-screen bg-slate-200">
    <TheMap v-if="!pending && mapData" :pois="mapData" />
    <TheDrawer>
      <component
        :is="$route.path === '/' ? SearchResults : NuxtPage"
        v-if="mapData"
        :map-data="mapData"
      ></component>
      <div
        v-else
        class="flex h-5/6 w-full items-center justify-center text-sm font-bold text-slate-700"
      >
        Caricando
      </div>
    </TheDrawer>
  </div>
</template>
