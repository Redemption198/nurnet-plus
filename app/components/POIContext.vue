<script setup lang="ts">
// "Il sito": the setting of the site, from the NurNet Geoportale (matched by position). Only the
// facts this site has; the first few always, the rest on request. The typology is in the meta line
const site = useCurrentSite();
const { t, locale } = useI18n();

interface Fact {
  icon: string;
  label: string;
  value: string;
  wide?: boolean;
}

const facts = computed(() => {
  const poi = site.value;
  if (!poi) return [];
  // Each entry is a fact or a falsy value for a field the site lacks
  const list: (Fact | false | "" | undefined)[] = [
    poi.period && { icon: "i-lucide-hourglass", label: t("context.period"), value: poi.period },
    poi.elevation != null && {
      icon: "i-lucide-mountain",
      label: t("context.elevation"),
      value: t("context.elevationValue", { metres: poi.elevation.toLocaleString(locale.value) }),
    },
    poi.coastDistance != null && {
      icon: "i-lucide-sailboat",
      label: t("context.coast"),
      value: formatDistance(poi.coastDistance, locale.value),
    },
    poi.riverDistance != null && {
      icon: "i-lucide-waves",
      label: t("context.river"),
      value: formatDistance(poi.riverDistance, locale.value),
    },
    poi.springDistance != null && {
      icon: "i-lucide-droplet",
      label: t("context.spring"),
      value: formatDistance(poi.springDistance, locale.value),
    },
    poi.lithology && {
      icon: "i-lucide-layers",
      label: t("context.geology"),
      value: poi.lithology,
      wide: true,
    },
    poi.landUse && {
      icon: "i-lucide-trees",
      label: t("context.landUse"),
      value: poi.landUse,
      wide: true,
    },
  ];
  return list.filter((fact): fact is Fact => !!fact);
});

const FIRST = 4;
const showAll = ref(false);
watch(
  () => site.value?.content_id,
  () => (showAll.value = false),
);
const shown = computed(() => (showAll.value ? facts.value : facts.value.slice(0, FIRST)));
</script>

<template>
  <section v-if="facts.length" class="flex flex-col gap-y-2 px-4" aria-labelledby="poi-context">
    <h3 id="poi-context" class="text-base font-semibold text-basalt">
      {{ t("context.title") }}
    </h3>
    <dl id="poi-context-facts" class="grid grid-cols-2 gap-x-4">
      <div
        v-for="fact in shown"
        :key="fact.label"
        class="flex flex-col gap-y-0.5 border-t border-line py-2.5"
        :class="{ 'col-span-2': fact.wide }"
      >
        <dt class="flex items-center gap-x-1.5 text-xs font-semibold text-muted">
          <UIcon :name="fact.icon" class="size-3.5 shrink-0 text-subtle" aria-hidden="true" />
          {{ fact.label }}
        </dt>
        <dd class="text-[0.9375rem] font-semibold text-basalt first-letter:uppercase">
          {{ fact.value }}
        </dd>
      </div>
    </dl>
    <button
      v-if="facts.length > FIRST"
      type="button"
      class="inline-flex min-h-11 items-center gap-x-1 self-start text-sm font-semibold text-terracotta-dark"
      :aria-expanded="showAll"
      aria-controls="poi-context-facts"
      @click="showAll = !showAll"
    >
      {{ showAll ? t("context.fewer") : t("context.more", { count: facts.length - FIRST }) }}
      <UIcon
        name="i-lucide-chevron-down"
        class="size-4 transition-transform"
        :class="{ 'rotate-180': showAll }"
        aria-hidden="true"
      />
    </button>
  </section>
</template>
