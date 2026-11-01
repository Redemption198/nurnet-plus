<script setup>
const NuxtPage = resolveComponent("NuxtPage");
const SearchResults = resolveComponent("SearchResults");

const { items: mapData, error } = useNurnetData();
</script>

<template>
  <main class="h-screen w-screen bg-[#f1e9dc]">
    <!-- Outside ClientOnly: part of the prerendered HTML, so it shows before the app loads -->
    <AppSplash :ready="!!mapData || !!error" />

    <ClientOnly>
      <TheMap v-if="mapData" :pois="mapData" />

      <!-- On desktop the brand is at the top of the drawer instead -->
      <BrandButton class="absolute top-4 left-4 z-1 lg:hidden" />
      <InfoSheet />

      <TheDrawer>
        <component
          :is="$route.path === '/' ? SearchResults : NuxtPage"
          v-if="mapData"
          :map-data="mapData"
        ></component>
        <div v-else data-drawer-drag class="h-full pt-4">
          <DrawerHandle />
          <p
            class="flex h-5/6 w-full items-center justify-center px-8 text-center text-sm font-semibold text-slate-700"
            :class="{ 'animate-pulse': !error }"
          >
            {{
              error
                ? "Impossibile caricare i siti. Controlla la connessione e riprova."
                : "Caricamento…"
            }}
          </p>
        </div>
      </TheDrawer>
    </ClientOnly>
  </main>
</template>
