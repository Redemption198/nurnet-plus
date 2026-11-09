<script setup lang="ts">
// The settings sheet (the brand button's gear). Home: the two settings people change, appearance
// and language, then one row each for the rest (the map's legend, how to use the app, privacy,
// about and credits), which opens as its own page inside the sheet
const infoOpen = useInfoOpen();
const { t, locale, setLocale } = useI18n();

// Like the drawer: the header floats over the content, which scrolls under it, and turns into a
// blurred bar once there is something under it
const body = useTemplateRef("body");
const { y: bodyY } = useScroll(body);
const headerEl = useTemplateRef("headerEl");
const { height: headerHeight } = useElementSize(headerEl, undefined, { box: "border-box" });

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

// The sheet's pages, opened from the home page's rows
type Page = "legend" | "tips" | "privacy" | "about";
const PAGES = computed(() => [
  {
    page: "legend" as const,
    icon: "i-lucide-map",
    label: t("info.legend"),
    hint: t("info.rows.legend"),
  },
  {
    page: "tips" as const,
    icon: "i-lucide-circle-help",
    label: t("info.tips.title"),
    hint: t("info.rows.tips"),
  },
  {
    page: "privacy" as const,
    icon: "i-lucide-shield-check",
    label: t("info.privacy.title"),
    hint: t("info.rows.privacy"),
  },
  {
    page: "about" as const,
    icon: "i-lucide-info",
    label: t("info.about"),
    hint: t("info.rows.about"),
  },
]);
const page = ref<Page | null>(null);
const pageTitle = computed(() => PAGES.value.find((entry) => entry.page === page.value)?.label);

// Each time the sheet opens, it opens on its home page
watch(infoOpen, (open) => {
  if (open) page.value = null;
});

// Going into a page, the content comes in from the right; back, from the left. Once it's in, the
// body starts from the top and focus goes where the reader carries on: the page's title, or, back
// home, the row they came from
const forward = ref(true);
let cameFrom: Page | null = null;
const pageHeading = useTemplateRef("pageHeading");
const rows = useTemplateRef("rows");
function openPage(next: Page) {
  forward.value = true;
  cameFrom = next;
  page.value = next;
}
function goBack() {
  forward.value = false;
  page.value = null;
}
function settle() {
  body.value?.scrollTo({ top: 0 });
  if (page.value) pageHeading.value?.focus();
  else rows.value?.find((row) => row.dataset.page === cameFrom)?.focus();
}
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
      <!-- One height for every page, so the sheet doesn't grow and shrink as they change: the home
           page fits in it, a longer page scrolls -->
      <div class="relative flex h-[min(85dvh,44rem)] flex-col rounded-[inherit]">
        <header
          ref="headerEl"
          class="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-x-3 rounded-t-3xl p-4 pb-2 transition-[background-color,box-shadow] duration-200"
          :class="
            bodyY > 0 ? 'bg-panel/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl' : ''
          "
        >
          <!-- A page: back to the home page, and the page's name -->
          <div v-if="page" class="flex min-w-0 items-center gap-x-1">
            <button
              type="button"
              class="-ml-1 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-well press"
              :aria-label="t('common.back')"
              @click="goBack"
            >
              <span class="flex size-9 items-center justify-center rounded-full bg-well/70">
                <UIcon name="i-lucide-chevron-left" class="size-5" aria-hidden="true" />
              </span>
            </button>
            <h3
              ref="pageHeading"
              tabindex="-1"
              class="truncate text-lg font-semibold text-basalt outline-none"
            >
              {{ pageTitle }}
            </h3>
          </div>
          <div v-else class="flex flex-col gap-y-1">
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
          class="scrollbar-hidden flex-1 overflow-y-auto overscroll-contain rounded-[inherit] px-4 pb-6 text-sm text-basalt"
          :style="{ paddingTop: `${headerHeight + 8}px` }"
        >
          <Transition
            mode="out-in"
            enter-active-class="transition duration-200 ease-out motion-reduce:transition-none"
            leave-active-class="transition duration-150 ease-in motion-reduce:transition-none"
            :enter-from-class="`opacity-0 ${forward ? 'translate-x-4' : '-translate-x-4'}`"
            :leave-to-class="`opacity-0 ${forward ? '-translate-x-4' : 'translate-x-4'}`"
            @after-enter="settle"
          >
            <!-- Home: the settings, then the pages -->
            <div v-if="!page" key="home" class="flex flex-col gap-y-6">
              <section class="flex flex-col gap-y-3" aria-labelledby="info-appearance">
                <h3 id="info-appearance" class="text-base font-semibold">
                  {{ t("info.appearance") }}
                </h3>
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
                <h3 id="info-language" class="text-base font-semibold">
                  {{ t("info.language") }}
                </h3>
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

              <!-- Rows and separators across the sheet's full width, as the drawer's lists -->
              <nav :aria-label="t('info.more')">
                <ul class="-mx-4 border-b border-line">
                  <li v-for="entry in PAGES" :key="entry.page">
                    <button
                      ref="rows"
                      type="button"
                      :data-page="entry.page"
                      class="flex min-h-15 w-full cursor-pointer items-center gap-x-3 border-t border-line px-4 py-2.5 text-left transition hover:bg-well/50"
                      @click="openPage(entry.page)"
                    >
                      <UIcon
                        :name="entry.icon"
                        class="size-5 shrink-0 text-muted"
                        aria-hidden="true"
                      />
                      <span class="flex min-w-0 flex-1 flex-col gap-y-0.5">
                        <span class="text-[0.9375rem] font-semibold text-basalt">
                          {{ entry.label }}
                        </span>
                        <span class="text-pretty text-muted">{{ entry.hint }}</span>
                      </span>
                      <UIcon
                        name="i-lucide-chevron-right"
                        class="size-4.5 shrink-0 text-subtle"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                </ul>
              </nav>
            </div>

            <!-- The map's legend -->
            <div v-else-if="page === 'legend'" key="legend" class="flex flex-col gap-y-3">
              <h4 class="text-xs font-semibold text-muted">{{ t("info.siteTypes") }}</h4>
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

              <h4 class="pt-3 text-xs font-semibold text-muted">{{ t("info.status") }}</h4>
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

              <h4 class="pt-3 text-xs font-semibold text-muted">{{ t("info.sightLines") }}</h4>
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
            </div>

            <!-- How to use the app -->
            <ul v-else-if="page === 'tips'" key="tips" class="flex flex-col gap-y-3">
              <li v-for="tip in TIPS" :key="tip.icon" class="flex gap-x-2.5">
                <UIcon
                  :name="tip.icon"
                  class="mt-0.5 size-4.5 shrink-0 text-muted"
                  aria-hidden="true"
                />
                <span class="text-pretty">{{ tip.text }}</span>
              </li>
            </ul>

            <!-- What leaves the device and where to. Keep in step with the code: the location
                 (TheMap), the services the map and the site pages load from, the videos
                 (POIVideo), the offline cache (nuxt.config pwa) -->
            <div v-else-if="page === 'privacy'" key="privacy" class="flex flex-col gap-y-3">
              <p class="text-pretty">{{ t("info.privacy.summary") }}</p>
              <dl class="flex flex-col">
                <div class="border-t border-line py-2.5">
                  <dt class="text-xs font-semibold text-muted">
                    {{ t("info.privacy.location") }}
                  </dt>
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
                  <dt class="text-xs font-semibold text-muted">
                    {{ t("info.privacy.directions") }}
                  </dt>
                  <dd class="text-pretty">{{ t("info.privacy.directionsText") }}</dd>
                </div>
                <div class="border-t border-line py-2.5">
                  <dt class="text-xs font-semibold text-muted">{{ t("info.privacy.device") }}</dt>
                  <dd class="text-pretty">{{ t("info.privacy.deviceText") }}</dd>
                </div>
              </dl>
            </div>

            <!-- The project, the credits, the code -->
            <div v-else key="about" class="flex flex-col gap-y-5">
              <i18n-t keypath="info.intro" tag="p" class="text-pretty">
                <template #project>
                  <a :class="link" href="https://www.nurnet.net/" target="_blank" rel="noopener">{{
                    t("info.introProject")
                  }}</a>
                </template>
              </i18n-t>

              <section class="flex flex-col gap-y-2" aria-labelledby="info-credits">
                <h4 id="info-credits" class="text-xs font-semibold text-muted">
                  {{ t("info.credits.title") }}
                </h4>
                <dl class="flex flex-col">
                  <div class="border-t border-line py-2.5">
                    <dt class="text-xs font-semibold text-muted">
                      {{ t("info.credits.data") }}
                    </dt>
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
                    <dt class="text-xs font-semibold text-muted">
                      {{ t("info.credits.photos") }}
                    </dt>
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
                        <a
                          :class="link"
                          href="https://openfreemap.org/"
                          target="_blank"
                          rel="noopener"
                          >OpenFreeMap</a
                        >
                      </template>
                      <template #openmaptiles>
                        <a
                          :class="link"
                          href="https://openmaptiles.org/"
                          target="_blank"
                          rel="noopener"
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

              <div class="flex flex-wrap items-center gap-2">
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
          </Transition>
        </div>
      </div>
    </template>
  </UModal>
</template>
