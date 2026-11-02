<script setup lang="ts">
const infoOpen = useInfoOpen();
</script>

<template>
  <button
    type="button"
    class="flex min-h-11 cursor-pointer items-center gap-x-1.5 rounded-2xl bg-panel/80 py-1.5 pr-2.5 pl-1.5 shadow-[0_4px_16px_rgb(49_37_40/0.14)] backdrop-blur-2xl transition active:scale-95"
    aria-label="NurNet+: guida, legenda e crediti"
    @click="infoOpen = true"
  >
    <BrandMark />
    <UIcon name="i-lucide-info" class="size-4 text-subtle" aria-hidden="true" />
  </button>
</template>
