import type { Component } from "vue";
import { UIcon } from "#components";

// The visitor's language. Each page is prerendered in the language of its URL (Italian at the
// root, English at /en/) and nothing redirects by the browser's language, as search engines
// advise (their crawlers would be bounced too). Instead, once the app is up:
// - a language the visitor chose (info sheet, or the offer below) is applied, in place of the
//   page's: the same page in that language, the history entry replaced
// - otherwise, if the browser asks for the other language, a toast offers it, in that language,
//   with both answers as buttons. Only an answer is kept: closing it (×, Esc) is "not now", and
//   it is offered again on the next visit
export default defineNuxtPlugin({
  name: "locale",
  dependsOn: ["i18n:plugin"],
  setup(nuxtApp) {
    const i18n = nuxtApp.$i18n;
    const toast = useToast();
    const splashVisible = useSplashVisible();
    // A pause in the visitor's use of the map, rather than the first frame after the splash
    const { idle, reset } = useIdle(2500);

    async function offer(wanted: AppLocale, current: AppLocale) {
      await until(splashVisible).toBe(false);
      // Counted from when the map is there: the time spent loading is no pause
      reset();
      await until(idle).toBe(true);
      // One notice at a time: after the "new version" one, if it's up
      await until(() => toast.toasts.value.some((t) => t.id === "app-update")).toBe(false);
      await i18n.loadLocaleMessages(wanted);
      const t = (key: string, named = {}) => i18n.t(key, named, { locale: wanted });
      // "…with ⚙.": the brand button's gear, as drawn there, named for screen readers
      const [before, after] = t("locale.later", { button: "\u0000" }).split("\u0000");
      const later = () =>
        h("span", [
          before,
          // As a plain component: UIcon's own props type is too deep for h()'s inference
          h(UIcon as Component, {
            name: "i-lucide-settings",
            class: "inline-block size-4 align-[-0.2em]",
          }),
          h("span", { class: "sr-only" }, t("locale.laterButton")),
          after,
        ]);
      // The ×, named for what it does here (Nuxt UI's own label, in the page's language, is just
      // "Chiudi"). The button type leaves attributes out, but they reach the button
      const notNow = { color: "neutral" as const, "aria-label": t("locale.notNow") };
      const choose = (locale: AppLocale) => {
        rememberLocale(locale);
        if (locale !== current) void i18n.setLocale(locale);
      };
      // Asserted: `lang` is an attribute of the toast's root, which the Toast type leaves out
      toast.add({
        id: "locale-offer",
        // Its words are in the offered language, not the page's: read in that language's voice
        lang: wanted,
        title: t("locale.offer"),
        description: later,
        icon: "i-lucide-languages",
        duration: 0,
        // Announced politely: an offer, not an alert
        type: "background",
        close: notNow,
        // Back into the brand button however it's closed (an answer, ×, Esc, a swipe)
        "data-locale-offer": "",
        "onUpdate:open": (open: boolean) => {
          const el = document.querySelector<HTMLElement>("[data-locale-offer]");
          if (!open && el) returnToPill(el);
        },
        actions: [
          { label: t("locale.switch"), onClick: () => choose(wanted) },
          {
            label: t("locale.stay"),
            color: "neutral",
            variant: "soft",
            onClick: () => choose(current),
          },
        ],
      } as Parameters<typeof toast.add>[0]);
      // Out of the brand button, whose (i) the offer names. The toaster puts it in the page a few
      // ticks later: caught as it's inserted (a mutation observer runs before the next paint)
      const find = () => document.querySelector<HTMLElement>("[data-locale-offer]");
      const observer = new MutationObserver(() => {
        const el = find();
        if (!el) return;
        observer.disconnect();
        emergeFromPill(el);
      });
      observer.observe(document.body, { childList: true, subtree: true });
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
