<script setup>
const NuxtPage = resolveComponent("NuxtPage");
const SearchResults = resolveComponent("SearchResults");

const { data: mapData } = await useAsyncData("nurnet-dump", () =>
  $fetch("http://localhost:3000/nurnet-data.json")
);
</script>

<template>
  <div class="h-screen w-screen bg-slate-200">
    <TheMap :pois="mapData" />
    <TheDrawer>
      <component
        :is="$route.path === '/' ? SearchResults : NuxtPage"
        :map-data="mapData"
      ></component>
    </TheDrawer>
  </div>
</template>
