<script setup>
defineProps({
  // Content is scrolled under the header: show the blurred background like iOS
  scrolled: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <div
    data-drawer-drag
    class="sticky top-0 z-10 rounded-t-2xl pt-4 transition-[background-color,box-shadow] duration-200"
    :class="
      scrolled
        ? 'bg-slate-200/70 shadow-[0_1px_0_rgb(15_23_42/0.08)] backdrop-blur-xl backdrop-saturate-150'
        : ''
    "
  >
    <DrawerHandle />
    <div class="px-4 pb-3">
      <slot />
    </div>
  </div>
</template>
