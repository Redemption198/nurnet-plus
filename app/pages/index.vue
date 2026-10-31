<script setup>
const NuxtPage = resolveComponent("NuxtPage");
const SearchResults = resolveComponent("SearchResults");

const { items: mapData } = useNurnetData();
</script>

<template>
  <div class="h-screen w-screen bg-slate-200">
    <ClientOnly>
      <TheMap v-if="mapData" :pois="mapData" />
      <TheDrawer>
        <component
          :is="$route.path === '/' ? SearchResults : NuxtPage"
          v-if="mapData"
          :map-data="mapData"
        ></component>
        <div v-else data-drawer-drag class="h-full">
          <DrawerHandle />
          <div
            class="flex h-5/6 w-full animate-pulse items-center justify-center text-sm font-bold text-slate-700"
          >
            Caricando
          </div>
        </div>
      </TheDrawer>
    </ClientOnly>
  </div>
</template>
