<script setup lang="ts">
// A category's pictogram in its colour (or `color`), the "?" icon for categories without one
const props = defineProps<{ categoryId: string | null | undefined; color?: string }>();

// Literal names, so Nuxt can turn them into imports
const ICONS = {
  IconNurnetPlus: resolveComponent("IconNurnetPlus"),
  IconDomusJanas: resolveComponent("IconDomusJanas"),
  IconTombaGiganti: resolveComponent("IconTombaGiganti"),
  IconVillaggioNuragico: resolveComponent("IconVillaggioNuragico"),
  IconMenhir: resolveComponent("IconMenhir"),
  IconCultoAcqua: resolveComponent("IconCultoAcqua"),
  IconDolmen: resolveComponent("IconDolmen"),
};

const category = computed(() => categoryOf(props.categoryId));
const fill = computed(() => props.color ?? category.value.color);
</script>

<template>
  <component :is="ICONS[category.icon]" v-if="category.icon" :style="{ fill }" aria-hidden="true" />
  <UIcon v-else name="i-lucide-circle-help" :style="{ color: fill }" aria-hidden="true" />
</template>
