<script setup>
const currentPOI = useCurrentPOI();
</script>

<template>
  <iframe
    :src="
      currentPOI.values_.youtube.includes('facebook.com')
        ? `https://www.facebook.com/plugins/video.php?href=${currentPOI.values_.youtube}&show_text=false&t=0`
        : `https://www.youtube.com/embed/${currentPOI.values_.youtube}`
    "
    class="mx-4 my-2 aspect-video min-h-[30vh] rounded-lg border-none"
    scrolling="no"
    frameborder="0"
    allow="autoplay; encrypted-media; picture-in-picture"
    allowFullScreen
  ></iframe>
</template>
