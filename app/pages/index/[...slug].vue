<script setup lang="ts">
// Any other address under the map: the map, with a notice that the page doesn't exist, as for a
// link to a site that isn't in the data (poi/[id].vue), rather than Nuxt's 404 page. Done in
// middleware: the map renders its pages only in the browser, and this one would never show (an
// address without a site is the drawer's home). Search engines still get a 404
definePageMeta({
  middleware: () => {
    if (import.meta.server) {
      setResponseStatus(useRequestEvent()!, 404);
      return;
    }
    const { $i18n } = useNuxtApp();
    const toast = useToast();
    const splashVisible = useSplashVisible();
    // Once the map is there: under the splash it would come and go unseen
    void until(splashVisible)
      .toBe(false)
      .then(() =>
        toast.add({
          title: $i18n.t("app.notFound.title"),
          description: $i18n.t("app.notFound.description"),
          icon: "i-lucide-signpost",
        }),
      );
    return navigateTo(useLocalePath()("index"), { replace: true });
  },
});
</script>

<template>
  <div hidden />
</template>
