import type { InjectionKey, Ref } from "vue";

// The drawer's scrolling content element, for pages that react to its scroll (e.g. the header's
// background). Provided by TheDrawer to whatever it renders in its slot
const KEY: InjectionKey<Readonly<Ref<HTMLElement | null>>> = Symbol("drawer-scroller");

export const provideDrawerScroller = (element: Readonly<Ref<HTMLElement | null>>) =>
  provide(KEY, element);

export const useDrawerScroller = () => inject(KEY, ref(null));
