<script setup lang="ts">
// The site's video: a YouTube id or a Facebook video URL
const site = useCurrentSite();

const src = computed(() => {
  const video = site.value?.youtube ?? "";
  return video.includes("facebook.com")
    ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(video)}&show_text=false&t=0`
    : `https://www.youtube-nocookie.com/embed/${video}`;
});
</script>

<template>
  <div v-if="site?.youtube">
    <iframe
      :title="`Video: ${site.name}`"
      :src="src"
      class="aspect-video w-full rounded-2xl border-none bg-well"
      loading="lazy"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
    ></iframe>
  </div>
</template>
