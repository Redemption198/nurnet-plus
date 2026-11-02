<script setup>
const currentPOI = useCurrentPOI();

// "341 m" up to a kilometre, then "25,6 km"
function formatDistance(metres) {
  if (metres < 1000) return `${metres} m`;
  return `${(metres / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`;
}

// From the NurNet Geoportale (matched by position): only the fields this site has
const facts = computed(() => {
  const poi = currentPOI.value.values_ ?? {};
  const list = [
    poi.typology && { icon: "i-lucide-landmark", label: "Tipologia", value: poi.typology },
    poi.period && { icon: "i-lucide-hourglass", label: "Periodo", value: poi.period },
    poi.elevation != null && {
      icon: "i-lucide-mountain",
      label: "Altitudine",
      value: `${poi.elevation.toLocaleString("it-IT")} m s.l.m.`,
    },
    poi.coastDistance != null && {
      icon: "i-lucide-sailboat",
      label: "Dal mare",
      value: formatDistance(poi.coastDistance),
    },
    poi.riverDistance != null && {
      icon: "i-lucide-waves",
      label: "Dal corso d'acqua",
      value: formatDistance(poi.riverDistance),
    },
    poi.springDistance != null && {
      icon: "i-lucide-droplet",
      label: "Dalla sorgente",
      value: formatDistance(poi.springDistance),
    },
    poi.lithology && {
      icon: "i-lucide-layers",
      label: "Geologia",
      value: poi.lithology,
      wide: true,
    },
    poi.landUse && {
      icon: "i-lucide-trees",
      label: "Uso del suolo",
      value: poi.landUse,
      wide: true,
    },
  ];
  return list.filter(Boolean);
});
</script>

<template>
  <section v-if="facts.length" class="mx-4 flex flex-col gap-y-2" aria-labelledby="poi-context">
    <h3 id="poi-context" class="text-sm font-semibold text-slate-700">Il sito</h3>
    <dl class="grid grid-cols-2 gap-2">
      <div
        v-for="fact in facts"
        :key="fact.label"
        class="flex flex-col gap-y-0.5 rounded-2xl bg-white/60 p-3 shadow-sm"
        :class="{ 'col-span-2': fact.wide }"
      >
        <dt class="flex items-center gap-x-1.5 text-xs font-semibold text-slate-600">
          <UIcon :name="fact.icon" class="size-3.5 shrink-0 text-terracotta" />
          {{ fact.label }}
        </dt>
        <dd class="text-sm font-semibold text-basalt first-letter:uppercase">{{ fact.value }}</dd>
      </div>
    </dl>
  </section>
</template>
