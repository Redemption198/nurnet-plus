<script setup lang="ts">
// Content is scrolled under the header: show the blurred background like iOS
defineProps<{ scrolled?: boolean }>();
</script>

<template>
  <div
    data-drawer-drag
    class="sticky top-0 z-10 rounded-t-2xl pt-4 transition-[background-color,box-shadow] duration-200"
    :class="
      scrolled
        ? 'bg-panel/55 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl backdrop-saturate-180'
        : ''
    "
  >
    <DrawerHandle />
    <div class="px-4 pb-3">
      <slot />
    </div>
  </div>
</template>
