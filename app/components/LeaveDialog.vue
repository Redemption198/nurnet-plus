<script setup lang="ts">
// Before leaving the app for a site the census cites (useLeaveConfirm): which site, its whole
// address, and that it isn't part of NurNet+. In the info sheet's material, narrower and a little
// more opaque: small over a busy page, the colours under it would show through
const leaveUrl = useLeaveUrl();
const { t } = useI18n();

const open = computed({
  get: () => !!leaveUrl.value,
  set: (value) => {
    if (!value) leaveUrl.value = null;
  },
});
// The last site asked about, kept after closing: the tap on "Open site" also closes the dialog,
// and Vue updates the page before the browser follows the link, so a link that lost its address
// with the dialog would open nothing. It also keeps the title while the dialog fades out
const url = ref<string | null>(null);
watch(leaveUrl, (value) => {
  if (value) url.value = value;
});
const host = computed(() =>
  url.value && URL.canParse(url.value) ? new URL(url.value).hostname.replace(/^www\./, "") : "",
);
// The address as people read it, without its scheme
const address = computed(() => url.value?.replace(/^https?:\/\//, "").replace(/\/$/, ""));
</script>

<template>
  <!-- The title and the address are the dialog's name and description. "Open site" is a real
       link, so the browser takes it as the visitor's own tap, not a pop-up -->
  <UModal
    v-model:open="open"
    :title="t('leave.title', { host })"
    :description="address"
    :close="false"
    :ui="{
      overlay: 'bg-basalt/25 backdrop-blur-[2px] dark:bg-black/50',
      content:
        'max-w-sm divide-y-0 rounded-3xl bg-panel/95 shadow-[0_6px_24px_rgb(49_37_40/0.16)] ring-0 backdrop-blur-2xl',
      header: 'min-h-0 flex-col items-start gap-y-1 px-5 pt-5 pb-0 sm:px-5',
      title: 'font-display text-xl leading-tight font-semibold text-balance text-basalt',
      description: 'text-sm break-all text-muted',
      body: 'px-5 py-3 sm:px-5 sm:py-3',
      footer: 'justify-end gap-x-2 px-5 pt-1 pb-5 sm:px-5',
    }"
  >
    <template #body>
      <p class="text-sm text-pretty text-basalt/85">{{ t("leave.notice") }}</p>
    </template>
    <template #footer="{ close }">
      <button
        type="button"
        class="inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-semibold text-basalt transition hover:bg-well press press-subtle"
        @click="close"
      >
        {{ t("leave.cancel") }}
      </button>
      <a
        :href="url ?? undefined"
        target="_blank"
        rel="noopener"
        class="inline-flex min-h-11 items-center gap-x-1.5 rounded-full bg-terracotta px-5 font-semibold text-white shadow-[0_2px_6px_rgb(154_62_1/0.3)] transition hover:bg-brand-deep press press-subtle"
        @click="close"
      >
        {{ t("leave.open")
        }}<UIcon name="i-lucide-arrow-up-right" class="size-4" aria-hidden="true" />
      </a>
    </template>
  </UModal>
</template>
