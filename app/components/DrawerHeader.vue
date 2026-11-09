<script setup lang="ts">
// The drawer's header (handle, title or search). Rendered at the top of the drawer, outside its
// scroll area (TheDrawer's #drawer-header), floating over the content, which scrolls under it:
// then nothing between the drawer and the header clips, and the blur works in every browser.
// `scrolled`: content is under the header, show the blurred background like iOS
defineProps<{ scrolled?: boolean }>();

// The scroll areas leave this much room at the top (--drawer-header-h on the drawer)
const header = useTemplateRef("header");
const headerHeight = useDrawerHeaderHeight();
useResizeObserver(header, ([entry]) => {
  headerHeight.value = entry!.borderBoxSize[0]!.blockSize;
});
</script>

<template>
  <Teleport defer to="#drawer-header">
    <div
      ref="header"
      data-drawer-drag
      class="rounded-t-2xl pt-4 transition-[background-color,box-shadow] duration-200"
      :class="scrolled ? 'bg-panel/85 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl' : ''"
    >
      <DrawerHandle />
      <div class="px-4 pb-3">
        <slot />
      </div>
    </div>
  </Teleport>
</template>
