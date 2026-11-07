// The visitor's language. Each page is prerendered in the language of its URL (Italian at the
// root, English at /en/) and nothing redirects by the browser's language, as search engines
// advise (their crawlers would be bounced too). Instead, once the app is up:
// - a language the visitor chose (info sheet, or the offer below) is applied, in place of the
//   page's: the same page in that language, the history entry replaced
// - otherwise, if the browser asks for the other language, a toast offers it, in that language.
//   Its close button counts as a choice too (this one), so it isn't offered again
export default defineNuxtPlugin({
  name: "locale",
  dependsOn: ["i18n:plugin"],
  setup(nuxtApp) {
    const i18n = nuxtApp.$i18n;
    const toast = useToast();
    const splashVisible = useSplashVisible();

    async function offer(wanted: AppLocale, current: AppLocale) {
      // After the splash, which would cover it
      await until(splashVisible).toBe(false);
      await i18n.loadLocaleMessages(wanted);
      const t = (key: string) => i18n.t(key, {}, { locale: wanted });
      toast.add({
        id: "locale-offer",
        title: t("locale.offer"),
        icon: "i-lucide-languages",
        duration: 0,
        actions: [
          {
            label: t("locale.switch"),
            onClick: () => {
              rememberLocale(wanted);
              void i18n.setLocale(wanted);
            },
          },
        ],
        // Closed with its button (an action also closes it, after choosing): stay as it is
        "onUpdate:open": (open: boolean) => {
          if (!open && readLocaleChoice() === null) rememberLocale(current);
        },
      });
    }

    nuxtApp.hook("app:mounted", () => {
      const current = i18n.locale.value as AppLocale;
      const chosen = readLocaleChoice();
      if (chosen) {
        if (chosen !== current)
          void navigateTo(nuxtApp.$switchLocalePath(chosen), { replace: true });
        return;
      }
      const wanted = preferredLocale(navigator.languages);
      if (wanted !== current) void offer(wanted, current);
    });
  },
});
