// A new version of the app is downloaded in the background (a new service worker, which waits):
// offer to switch to it now, with a toast that stays until it's taken or dismissed. Without it the
// old version kept running until the app was closed everywhere, which an installed app on a phone
// rarely is. Dismissed, the update is applied the next time the app starts from cold.
// The app checks for a new version when it starts and every hour (nuxt.config pwa.client); also
// whenever it comes back to the foreground, as an app left in the background on a phone isn't
// started again. Call in app.vue
export function useAppUpdates() {
  if (!import.meta.client) return;
  const { $pwa } = useNuxtApp();
  if (!$pwa) return;
  const toast = useToast();
  const { t } = useI18n();

  watch(
    () => $pwa.needRefresh,
    (ready) => {
      if (!ready) return;
      toast.add({
        id: "app-update",
        title: t("app.update.title"),
        description: t("app.update.description"),
        // Bundled by name in nuxt.config (icon.clientBundle): the scan doesn't reach this file
        icon: "i-lucide-refresh-cw",
        duration: 0,
        actions: [
          {
            label: t("app.update.action"),
            // Activates the new version and reloads the page, which keeps its URL (the open site).
            // The plugin reloads once the new version takes the page over; a page no version
            // controls yet (the first visit) is never taken over, so that one reloads here
            onClick: async () => {
              const controlled = !!navigator.serviceWorker.controller;
              await $pwa.updateServiceWorker(true);
              if (!controlled) location.reload();
            },
          },
        ],
      });
    },
    { immediate: true },
  );

  useEventListener(document, "visibilitychange", () => {
    if (document.visibilityState !== "visible" || !navigator.onLine) return;
    void $pwa
      .getSWRegistration()
      ?.update()
      .catch(() => {});
  });
}
