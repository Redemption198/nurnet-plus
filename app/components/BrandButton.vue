<script setup>
const infoOpen = useInfoOpen();
</script>

<template>
  <button
    type="button"
    class="flex cursor-pointer items-center gap-x-1.5 rounded-2xl bg-slate-200/75 py-1.5 pr-2.5 pl-1.5 shadow-md backdrop-blur-2xl transition active:scale-95"
    aria-label="NurNet+: informazioni e crediti"
    @click="infoOpen = true"
  >
    <BrandMark />
    <UIcon name="i-lucide-info" class="size-4 text-slate-500" />
  </button>
</template>
