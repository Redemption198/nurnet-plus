<script setup lang="ts">
// The (i) sheet: how to read the map, how to use the app, privacy, and the credits
const infoOpen = useInfoOpen();
const { t, locale, setLocale } = useI18n();

// Like the drawer: the header floats over the content, which scrolls under it, and turns into a
// blurred bar once there is something under it
const body = useTemplateRef("body");
const { y: bodyY } = useScroll(body);
const headerEl = useTemplateRef("headerEl");
const { height: headerHeight } = useElementSize(headerEl, undefined, { box: "border-box" });

// The privacy details, folded: most visitors open the sheet for the legend
const privacyOpen = ref(false);

const link = "font-semibold text-terracotta-dark underline underline-offset-2";
const pill =
  "flex min-h-11 items-center justify-center gap-x-2 rounded-full bg-surface/80 px-4 font-semibold text-basalt shadow-[0_1px_3px_rgb(49_37_40/0.12)] transition hover:bg-surface press";

// The status values in the data, with the icons the site page uses (see statusOf)
const STATUSES = ["mantenuto", "diroccato", "non visibile"].map((value) => statusOf(value)!);

// Mac or not: the rotation tip names its keys and gestures
const isMac = useIsMac();
const isDark = useIsDark();
const isDesktop = useIsDesktop();

// Light or dark: the system's (the default), or the visitor's own, kept on the device. At dusk
// the system may turn dark while the light map still reads better outdoors
const colorMode = useColorMode();
const APPEARANCES = computed(() => [
  { value: "system", label: t("info.appearanceSystem"), icon: "i-lucide-sun-moon" },
  { value: "light", label: t("info.appearanceLight"), icon: "i-lucide-sun" },
  { value: "dark", label: t("info.appearanceDark"), icon: "i-lucide-moon" },
]);

// The UI's language, each named in its own. The choice is kept on the device (utils/locale.ts),
// and switches to the same page in that language (/en/ or the root)
const LANGUAGES: { code: AppLocale; label: string; lang: string }[] = [
  { code: "it", label: "Italiano", lang: "it" },
  { code: "en", label: "English", lang: "en" },
];
function chooseLanguage(code: AppLocale) {
  rememberLocale(code);
  void setLocale(code);
}

const TIPS = computed(() => [
  { icon: "i-lucide-search", text: t("info.tips.search") },
  { icon: "i-lucide-dices", text: t("info.tips.random") },
  {
    icon: "i-lucide-mountain",
    // On phones there is no 3D button until the map is tilted: the gesture tilts it
    text: t(isDesktop.value ? "info.tips.tilt3d" : "info.tips.tiltGesture"),
  },
  { icon: "i-lucide-rotate-3d", text: t(isMac.value ? "info.tips.rotateMac" : "info.tips.rotate") },
  { icon: "i-lucide-navigation", text: t("info.tips.directions") },
]);
</script>

<template>
  <!-- Custom content in the app's own style; title and description stay for screen readers -->
  <UModal
    v-model:open="infoOpen"
    title="NurNet+"
    :description="t('info.description')"
    :ui="{
      overlay: 'bg-basalt/25 backdrop-blur-[2px] dark:bg-black/50',
      content:
        'max-w-md divide-y-0 rounded-3xl bg-panel/90 shadow-[0_6px_24px_rgb(49_37_40/0.16)] ring-0 backdrop-blur-2xl',
    }"
  >
    <template #content="{ close }">
      <div class="relative flex max-h-[85dvh] flex-col rounded-[inherit]">
        <header
          ref="headerEl"
          class="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-x-3 rounded-t-3xl p-4 pb-2 transition-[background-color,box-shadow] duration-200"
          :class="
            bodyY > 0 ? 'bg-panel/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl' : ''
          "
        >
          <div class="flex flex-col gap-y-1">
            <BrandMark class="text-2xl" />
            <p class="text-sm text-muted">{{ t("info.tagline") }}</p>
          </div>
          <button
            type="button"
            class="-mr-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-well press"
            :aria-label="t('common.close')"
            @click="close"
          >
            <span class="flex size-9 items-center justify-center rounded-full bg-well/70">
              <UIcon name="i-lucide-x" class="size-5" aria-hidden="true" />
            </span>
          </button>
        </header>

        <div
          ref="body"
          class="scrollbar-hidden flex flex-col gap-y-6 overflow-y-auto overscroll-contain rounded-[inherit] px-4 pb-6 text-sm text-basalt"
          :style="{ paddingTop: `${headerHeight + 8}px` }"
        >
          <i18n-t keypath="info.intro" tag="p" class="text-pretty text-muted">
            <template #project>
              <a :class="link" href="https://www.nurnet.net/" target="_blank" rel="noopener">{{
                t("info.introProject")
              }}</a>
            </template>
          </i18n-t>

          <section class="flex flex-col gap-y-3" aria-labelledby="info-legend">
            <h3 id="info-legend" class="text-base font-semibold">{{ t("info.legend") }}</h3>
            <ul class="grid grid-cols-2 gap-x-4 gap-y-2">
              <li
                v-for="category in CATEGORIES"
                :key="category.name"
                class="flex items-center gap-x-2"
              >
                <CategoryIcon :category-id="category.ids[0]" class="size-5 shrink-0" />
                {{ t(`categories.${category.key}`) }}
              </li>
            </ul>

            <h4 class="pt-2 text-xs font-semibold text-muted">{{ t("info.status") }}</h4>
            <ul class="flex flex-wrap gap-x-4 gap-y-1.5">
              <li
                v-for="status in STATUSES"
                :key="status.label"
                class="flex items-center gap-x-1.5"
              >
                <UIcon
                  :name="status.icon"
                  class="size-4.5 shrink-0 text-muted"
                  aria-hidden="true"
                />
                {{ t(`status.${status.key}`) }}
              </li>
            </ul>

            <h4 class="pt-2 text-xs font-semibold text-muted">{{ t("info.sightLines") }}</h4>
            <ul class="flex flex-col gap-y-1.5">
              <li
                v-for="level in VISIBILITY_LEVELS"
                :key="level.label"
                class="flex items-center gap-x-2"
              >
                <svg class="h-2 w-8 shrink-0" viewBox="0 0 32 8" aria-hidden="true">
                  <line
                    x1="2"
                    y1="4"
                    x2="30"
                    y2="4"
                    :stroke="isDark ? level.darkColor : level.color"
                    stroke-width="3"
                    stroke-linecap="round"
                    :stroke-dasharray="level.dashed ? '5 4' : undefined"
                  />
                </svg>
                {{ t(`visibilityLevels.${level.key}`) }}
              </li>
            </ul>
            <p class="text-pretty text-muted">{{ t("info.sightLinesNote") }}</p>
          </section>

          <section class="flex flex-col gap-y-3" aria-labelledby="info-appearance">
            <h3 id="info-appearance" class="text-base font-semibold">{{ t("info.appearance") }}</h3>
            <div
              class="grid grid-cols-3 gap-x-1 rounded-full bg-well/70 p-1"
              role="radiogroup"
              aria-labelledby="info-appearance"
            >
              <button
                v-for="appearance in APPEARANCES"
                :key="appearance.value"
                type="button"
                role="radio"
                :aria-checked="colorMode.preference === appearance.value"
                class="flex min-h-11 cursor-pointer items-center justify-center gap-x-1.5 rounded-full px-2 font-semibold transition press press-subtle"
                :class="
                  colorMode.preference === appearance.value
                    ? 'bg-surface text-basalt shadow-[0_1px_3px_rgb(49_37_40/0.12)]'
                    : 'text-muted hover:text-basalt'
                "
                @click="colorMode.preference = appearance.value"
              >
                <UIcon :name="appearance.icon" class="size-4.5 shrink-0" aria-hidden="true" />
                {{ appearance.label }}
              </button>
            </div>
            <p v-if="colorMode.preference === 'system'" class="text-pretty text-muted">
              {{ t("info.appearanceHint") }}
            </p>
          </section>

          <section class="flex flex-col gap-y-3" aria-labelledby="info-language">
            <h3 id="info-language" class="text-base font-semibold">{{ t("info.language") }}</h3>
            <div
              class="grid grid-cols-2 gap-x-1 rounded-full bg-well/70 p-1"
              role="radiogroup"
              aria-labelledby="info-language"
            >
              <button
                v-for="language in LANGUAGES"
                :key="language.code"
                type="button"
                role="radio"
                :lang="language.lang"
                :aria-checked="locale === language.code"
                class="flex min-h-11 cursor-pointer items-center justify-center rounded-full px-2 font-semibold transition press press-subtle"
                :class="
                  locale === language.code
                    ? 'bg-surface text-basalt shadow-[0_1px_3px_rgb(49_37_40/0.12)]'
                    : 'text-muted hover:text-basalt'
                "
                @click="chooseLanguage(language.code)"
              >
                {{ language.label }}
              </button>
            </div>
          </section>

          <section class="flex flex-col gap-y-3" aria-labelledby="info-tips">
            <h3 id="info-tips" class="text-base font-semibold">{{ t("info.tips.title") }}</h3>
            <ul class="flex flex-col gap-y-2">
              <li v-for="tip in TIPS" :key="tip.icon" class="flex gap-x-2">
                <UIcon
                  :name="tip.icon"
                  class="mt-0.5 size-4.5 shrink-0 text-muted"
                  aria-hidden="true"
                />
                <span class="text-pretty">{{ tip.text }}</span>
              </li>
            </ul>
          </section>

          <!-- What leaves the device and where to. Keep in step with the code: the location
               (TheMap), the services the map and the site pages load from, the videos (POIVideo),
               the offline cache (nuxt.config pwa) -->
          <section class="flex flex-col gap-y-2" aria-labelledby="info-privacy">
            <h3 id="info-privacy" class="text-base font-semibold">
              {{ t("info.privacy.title") }}
            </h3>
            <p class="text-pretty">{{ t("info.privacy.summary") }}</p>
            <dl v-show="privacyOpen" id="info-privacy-details" class="flex flex-col">
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">{{ t("info.privacy.location") }}</dt>
                <i18n-t keypath="info.privacy.locationText" tag="dd" class="text-pretty">
                  <template #button>
                    <UIcon
                      name="i-lucide-locate-fixed"
                      class="inline-block size-4 align-[-0.2em]"
                      aria-hidden="true"
                    /><span class="sr-only">{{ t("info.privacy.locationButton") }}</span>
                  </template>
                </i18n-t>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">{{ t("info.privacy.map") }}</dt>
                <i18n-t keypath="info.privacy.mapText" tag="dd" class="text-pretty">
                  <template #policy>
                    <a
                      :class="link"
                      href="https://openfreemap.org/privacy/"
                      target="_blank"
                      rel="noopener"
                      >{{ t("info.privacy.mapPolicy") }}</a
                    >
                  </template>
                </i18n-t>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">{{ t("info.privacy.video") }}</dt>
                <i18n-t keypath="info.privacy.videoText" tag="dd" class="text-pretty">
                  <template #youtube>
                    <a
                      :class="link"
                      :href="`https://support.google.com/youtube/answer/171780?hl=${locale}`"
                      target="_blank"
                      rel="noopener"
                      >YouTube (Google)</a
                    >
                  </template>
                  <template #facebook>
                    <a
                      :class="link"
                      href="https://www.facebook.com/privacy/policy/"
                      target="_blank"
                      rel="noopener"
                      >Facebook</a
                    >
                  </template>
                </i18n-t>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">{{ t("info.privacy.directions") }}</dt>
                <dd class="text-pretty">{{ t("info.privacy.directionsText") }}</dd>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">{{ t("info.privacy.device") }}</dt>
                <dd class="text-pretty">{{ t("info.privacy.deviceText") }}</dd>
              </div>
            </dl>
            <button
              type="button"
              class="inline-flex min-h-11 cursor-pointer items-center gap-x-1 self-start font-semibold text-terracotta-dark"
              :aria-expanded="privacyOpen"
              aria-controls="info-privacy-details"
              @click="privacyOpen = !privacyOpen"
            >
              {{ privacyOpen ? t("common.showLess") : t("info.privacy.more") }}
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 transition-transform"
                :class="{ 'rotate-180': privacyOpen }"
                aria-hidden="true"
              />
            </button>
          </section>

          <section class="flex flex-col gap-y-2" aria-labelledby="info-credits">
            <h3 id="info-credits" class="text-base font-semibold">
              {{ t("info.credits.title") }}
            </h3>
            <dl class="flex flex-col">
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">{{ t("info.credits.data") }}</dt>
                <i18n-t keypath="info.credits.dataText" tag="dd">
                  <template #geoportal>
                    <a
                      :class="link"
                      href="https://nurnet.crs4.it/nurnetgeo/"
                      target="_blank"
                      rel="noopener"
                      >Geoportale NurNet</a
                    >
                  </template>
                  <template #license>
                    <a
                      :class="link"
                      :href="`https://creativecommons.org/licenses/by/4.0/deed.${locale}`"
                      target="_blank"
                      rel="noopener"
                      >CC BY 4.0</a
                    >
                  </template>
                </i18n-t>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">{{ t("info.credits.photos") }}</dt>
                <i18n-t keypath="info.credits.photosText" tag="dd">
                  <template #mediateca>
                    <a
                      :class="link"
                      href="https://www.nurnet.net/mediateca/"
                      target="_blank"
                      rel="noopener"
                      >Mediateca NurNet</a
                    >
                  </template>
                </i18n-t>
              </div>
              <div class="border-t border-line py-2.5">
                <dt class="text-xs font-semibold text-muted">{{ t("info.credits.map") }}</dt>
                <i18n-t keypath="info.credits.mapText" tag="dd">
                  <template #openfreemap>
                    <a :class="link" href="https://openfreemap.org/" target="_blank" rel="noopener"
                      >OpenFreeMap</a
                    >
                  </template>
                  <template #openmaptiles>
                    <a :class="link" href="https://openmaptiles.org/" target="_blank" rel="noopener"
                      >© OpenMapTiles</a
                    >
                  </template>
                  <template #openstreetmap>
                    <a
                      :class="link"
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noopener"
                      >© OpenStreetMap</a
                    >
                  </template>
                  <template #terrain>
                    <a
                      :class="link"
                      href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md"
                      target="_blank"
                      rel="noopener"
                      >Terrain Tiles</a
                    >
                  </template>
                  <template #maplibre>
                    <a :class="link" href="https://maplibre.org/" target="_blank" rel="noopener"
                      >MapLibre</a
                    >
                  </template>
                </i18n-t>
              </div>
            </dl>
          </section>

          <div class="flex flex-wrap items-center justify-center gap-2 self-center">
            <a
              :class="pill"
              href="https://github.com/Redemption198/nurnet-plus"
              target="_blank"
              rel="noopener"
            >
              <UIcon name="i-lucide-github" class="size-4" aria-hidden="true" />
              {{ t("info.sourceCode") }}
            </a>
            <a
              :class="pill"
              href="https://github.com/Redemption198/nurnet-plus/issues/new"
              target="_blank"
              rel="noopener"
            >
              <UIcon name="i-lucide-bug" class="size-4" aria-hidden="true" />
              {{ t("info.reportProblem") }}
            </a>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
