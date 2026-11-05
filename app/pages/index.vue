<script setup lang="ts">
const NuxtPage = resolveComponent("NuxtPage");
const SearchResults = resolveComponent("SearchResults");
const route = useRoute();

const { items: mapData, error, reload } = useNurnetData();

// Structured data: Nuxt SEO adds WebSite and WebPage; this says the page is a free web app, built
// on the NurNet data (CC BY 4.0)
useSchemaOrg([
  defineSoftwareApp({
    name: "NurNet+",
    applicationCategory: "TravelApplication",
    operatingSystem: "Web, Android, iOS",
    offers: { price: 0, priceCurrency: "EUR" },
    isAccessibleForFree: true,
    isBasedOn: {
      "@type": "Dataset",
      name: "Geoportale NurNet",
      url: "https://nurnet.crs4.it/nurnetgeo/",
      license: "https://creativecommons.org/licenses/by/4.0/",
    },
  }),
]);
</script>

<template>
  <main class="h-screen w-screen bg-sand">
    <!-- Outside ClientOnly: part of the prerendered HTML, so it shows before the app loads -->
    <AppSplash :ready="!!mapData || !!error" />

    <ClientOnly>
      <!-- On desktop the brand is at the top of the drawer instead. Under the drawer (z-2) when
           it's raised; clear of the notch/status bar -->
      <BrandButton
        compact
        class="absolute top-[max(1rem,env(safe-area-inset-top))] left-4 z-1 lg:hidden"
      />
      <InfoSheet />

      <TheDrawer>
        <component
          :is="route.path === '/' ? SearchResults : NuxtPage"
          v-if="mapData"
          :map-data="mapData"
        ></component>
        <div v-else data-drawer-drag class="h-full pt-4">
          <DrawerHandle />
          <div
            class="flex h-5/6 w-full flex-col items-center justify-center gap-y-4 px-8 text-center text-sm font-semibold text-muted"
            :class="{ 'animate-pulse': !error }"
          >
            <p v-if="error">I siti non si sono caricati. Controlla la connessione.</p>
            <p v-else>Caricamento…</p>
            <UButton v-if="error" icon="i-lucide-rotate-cw" @click="reload">Riprova</UButton>
          </div>
        </div>
      </TheDrawer>

      <!-- After the drawer in the page, so keyboard users reach the search before the map -->
      <TheMap v-if="mapData" :pois="mapData" />
    </ClientOnly>
  </main>
</template>
