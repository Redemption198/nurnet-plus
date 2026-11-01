<script setup>
const currentPOI = useCurrentPOI();

const IconCultoAcqua = resolveComponent("IconCultoAcqua");
const IconDolmen = resolveComponent("IconDolmen");
const IconDomusJanas = resolveComponent("IconDomusJanas");
const IconMenhir = resolveComponent("IconMenhir");
const IconTombaGiganti = resolveComponent("IconTombaGiganti");
const IconVillaggioNuragico = resolveComponent("IconVillaggioNuragico");
const IconNurnetPlus = resolveComponent("IconNurnetPlus");

function getCategoryComponent(category) {
  if (category >= 10 && category <= 13) return IconNurnetPlus;
  if (category === 20 || category === 21) return IconDolmen;
  if (category === 30) return IconDomusJanas;
  if (category === 40 || category === 41) return IconVillaggioNuragico;
  if (category >= 50 && category <= 52) return IconCultoAcqua;
  if (category >= 60 && category <= 63) return IconTombaGiganti;
  if (category >= 70 && category <= 73) return IconMenhir;

  return null;
}
</script>

<template>
  <div
    class="flex w-full items-center gap-x-2 rounded-2xl px-2 py-4 text-white transition-colors"
    :class="useCategoryColor(Number(currentPOI.values_.category_id))"
  >
    <p
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/40 text-2xl font-bold mix-blend-lighten transition-colors"
    >
      <component
        :is="getCategoryComponent(Number(currentPOI.values_.category_id))"
        v-if="getCategoryComponent(Number(currentPOI.values_.category_id))"
        class="h-8 w-8 fill-gray-100"
      />

      <span v-else>?</span>
    </p>
    <p class="flex flex-col text-xs font-semibold">
      Tipo
      <span class="text-sm">{{ useCategoryName(Number(currentPOI.values_.category_id)) }}</span>
    </p>
  </div>
</template>
