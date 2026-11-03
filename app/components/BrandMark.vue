<script setup lang="ts">
withDefaults(defineProps<{ wordmark?: boolean }>(), { wordmark: true });
</script>

<template>
  <span class="inline-flex items-center gap-x-2">
    <span class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand shadow-sm">
      <IconNurnetPlus class="size-5 fill-white" aria-hidden="true" />
    </span>
    <span v-if="wordmark" class="font-display text-xl font-semibold tracking-tight text-basalt">
      NurNet+
    </span>
  </span>
</template>
