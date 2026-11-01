<script setup>
const currentPOI = useCurrentPOI();
</script>

<template>
  <div
    class="flex w-full items-center gap-x-2 rounded-2xl fill-white p-2 text-white"
    :class="useStatusColor(currentPOI.values_.stato.toLowerCase())"
  >
    <p
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/40 text-2xl font-bold mix-blend-lighten"
    >
      <IconHidden
        v-if="currentPOI.values_.stato.toLowerCase() === 'non visibile'"
        class="h-5 w-5"
      />
      <IconChecked
        v-else-if="
          currentPOI.values_.stato.toLowerCase() === 'manutenuto' ||
          currentPOI.values_.stato.toLowerCase() === 'mantenuto' ||
          currentPOI.values_.stato.toLowerCase() === 'buono'
        "
        class="h-5 w-5"
      />
      <IconRuin
        v-else-if="currentPOI.values_.stato.toLowerCase() === 'diroccato'"
        class="h-5 w-5"
      />
      <span v-else>?</span>
    </p>
    <p class="flex flex-col text-sm font-semibold">
      <span class="text-xs">Stato</span>{{ currentPOI.values_.stato || "Sconosciuto" }}
      <!--
                Mantenuto
                Buono
                Non Visibile
                Diroccato
                Sconosciuto
              -->
    </p>
  </div>
</template>
