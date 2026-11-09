<script setup lang="ts">
import type { NuxtError } from "#app";

// What shows in place of the app when it fails: an error while loading or a page that crashed.
// An address that isn't a page doesn't get here: it opens the map with a notice
// (pages/index/[...slug].vue). On the map's sand, with the logo's tile, as the app itself
const props = defineProps<{ error: NuxtError }>();
const { t } = useI18n();
const localePath = useLocalePath();

const notFound = computed(() => props.error.status === 404);
const title = computed(() => (notFound.value ? t("app.notFound.title") : t("app.error.title")));
useSeoMeta({ title, robots: "noindex, nofollow" });

const toMap = () => clearError({ redirect: localePath("index") });
// A full reload: also what a missing piece of the app (gone after a new version) needs
const retry = () => reloadNuxtApp({ force: true });
const dev = import.meta.dev;
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-sand px-6 py-12 text-basalt">
    <div class="w-full max-w-sm">
      <BrandMark variant="symbol" class="shadow-[0_4px_16px_rgb(49_37_40/0.14)]" />
      <h1
        class="mt-8 font-display text-[1.75rem] leading-tight font-semibold tracking-tight text-balance"
      >
        {{ title }}
      </h1>
      <p class="mt-3 text-pretty text-muted">
        {{ notFound ? t("app.notFound.description") : t("app.error.description") }}
      </p>
      <!-- For the developer only: what failed -->
      <p v-if="dev" class="mt-4 font-mono text-xs break-all text-subtle">
        {{ error.status }} · {{ error.message }}
      </p>
      <div class="mt-8 flex flex-wrap items-center gap-2">
        <button
          v-if="!notFound"
          type="button"
          class="inline-flex min-h-11 cursor-pointer items-center gap-x-1.5 rounded-full bg-terracotta px-5 font-semibold text-white shadow-[0_2px_6px_rgb(154_62_1/0.3)] transition hover:bg-brand-deep press press-subtle"
          @click="retry"
        >
          <UIcon name="i-lucide-rotate-cw" class="size-4" aria-hidden="true" />{{
            t("common.retry")
          }}
        </button>
        <button
          type="button"
          class="inline-flex min-h-11 cursor-pointer items-center gap-x-1.5 rounded-full px-5 font-semibold transition press press-subtle"
          :class="
            notFound
              ? 'bg-terracotta text-white shadow-[0_2px_6px_rgb(154_62_1/0.3)] hover:bg-brand-deep'
              : 'text-basalt hover:bg-well'
          "
          @click="toMap"
        >
          <UIcon name="i-lucide-map" class="size-4" aria-hidden="true" />{{ t("app.error.toMap") }}
        </button>
      </div>
    </div>
  </main>
</template>
