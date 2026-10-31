<script setup>
import Map from "ol/Map.js";
import View from "ol/View.js";
import Feature from "ol/Feature.js";
import Point from "ol/geom/Point.js";
import WebGLTileLayer from "ol/layer/WebGLTile.js";
import OSM from "ol/source/OSM.js";
import VectorSource from "ol/source/Vector";
import WebGLVectorLayer from "ol/layer/WebGLVector";

const props = defineProps({
  pois: {
    type: Array,
    default: () => [],
  },
});

const router = useRouter();
const route = useRoute();
const config = useRuntimeConfig();

const currentPOI = useCurrentPOI();
const drawerState = useDrawerState();
const mapPadding = useMapPadding();

const map = ref();
// shallowRef: a deep-reactive proxy of the OpenLayers map breaks identity checks
// (e.g. hit detection's layerFilter) and adds overhead to every map call
const olMap = shallowRef();

const iconStyle = {
  "symbol-type": "icon",
  "icon-src": `${config.app.baseURL}icons-tileset.png`,
  "icon-width": 512,
  "icon-height": 64,
  "icon-offset": [
    "match",
    ["get", "category_id"],
    // Menhir
    "70",
    [0, 64],
    "71",
    [0, 64],
    "72",
    [0, 64],
    "73",
    [0, 64],
    // Domus de janas
    "30",
    [64, 0],
    // Tombe dei giganti
    "60",
    [128, 0],
    "61",
    [128, 0],
    "62",
    [128, 0],
    "63",
    [128, 0],
    // Dolmen
    "20",
    [192, 0],
    "21",
    [192, 0],
    // Villaggi
    "40",
    [256, 0],
    "41",
    [256, 0],
    // Culto dell'acqua
    "50",
    [320, 0],
    "51",
    [320, 0],
    "52",
    [320, 0],
    // Nuraghe
    "10",
    [384, 0],
    "11",
    [384, 0],
    "12",
    [384, 0],
    "13",
    [384, 0],
    // Default value (the last element must be the fallback)
    [0, 64],
  ],
  "icon-size": [64, 64],
  "icon-anchor": [0.5, 1],
  "icon-opacity": 1,
  "icon-rotate-with-view": false,
};

onMounted(() => {
  const view = new View({
    center: [8.9, 39.9],
    zoom: 8.8,
    projection: "EPSG:4326",
    // Keeps the center in the part of the map the drawer doesn't cover
    padding: mapPadding.value,
  });

  olMap.value = new Map({
    target: map.value,
    layers: [
      new WebGLTileLayer({
        source: new OSM(),
      }),
    ],
    view,
    controls: [],
  });

  // Collapse the drawer when the user pans or pinches the map, not on programmatic moves
  olMap.value.on("movestart", () => {
    if (view.getInteracting() && drawerState.value.currentPosition !== "DRAWER_ON_BOTTOM_SCREEN") {
      drawerState.value.setPosition = "SET_DRAWER_ON_BOTTOM_SCREEN";
    }
  });

  olMap.value.on("click", function (evt) {
    if (view.getInteracting() || view.getAnimating()) {
      return;
    }
    olMap.value.forEachFeatureAtPixel(
      evt.pixel,
      function (feature) {
        currentPOI.value = feature;
        router.push("/poi");
        return true;
      },
      { layerFilter: (layer) => layer === pointsLayer },
    );
  });

  const vectorSource = new VectorSource();

  // Create the OpenLayers features in batches so the main thread never blocks for long,
  // then add them in one go: each addFeatures makes the WebGL layer rebuild its buffers
  (async () => {
    const features = [];
    for (let i = 0; i < props.pois.length; i += 1000) {
      for (const { coordinates, ...properties } of props.pois.slice(i, i + 1000)) {
        features.push(new Feature({ ...properties, geometry: new Point(coordinates) }));
      }
      await new Promise((resolve) => setTimeout(resolve));
    }
    vectorSource.addFeatures(features);
  })();

  const pointsLayer = new WebGLVectorLayer({
    source: vectorSource,
    style: { ...iconStyle, "icon-scale": 0.35 },
  });
  olMap.value.addLayer(pointsLayer);

  // The selected POI is drawn again, bigger and on top, from its own one-feature source
  const selectedSource = new VectorSource();
  olMap.value.addLayer(
    new WebGLVectorLayer({
      source: selectedSource,
      style: { ...iconStyle, "icon-scale": 0.6 },
      // Clicks go to pointsLayer, whose features carry all the POI properties
      disableHitDetection: true,
    }),
  );

  function showSelectedMarker() {
    selectedSource.clear();
    const values = currentPOI.value.values_;
    const coordinates = values?.geometry?.flatCoordinates;
    if (!coordinates) return;

    selectedSource.addFeature(
      new Feature({
        category_id: values.category_id,
        geometry: new Point([coordinates[0], coordinates[1]]),
      }),
    );
  }

  function focusSelectedPOI() {
    const [x, y] = currentPOI.value.values_?.geometry?.flatCoordinates ?? [];
    if (x === undefined) return;

    view.animate({
      center: [x, y],
      zoom: Math.max(view.getZoom(), 12),
      duration: 350,
    });
  }

  watch(mapPadding, (padding) => {
    view.padding = padding;
  });

  watch(currentPOI, async () => {
    showSelectedMarker();

    // Raise the drawer to the middle on mobile (ignored on desktop), then center the POI
    // in the area left visible, once the drawer has reported its new size
    drawerState.value.setPosition = "SET_DRAWER_ON_MIDDLE_SCREEN";
    await nextTick();
    focusSelectedPOI();
  });

  watch(
    () => route.path,
    (path) => {
      if (path === "/") selectedSource.clear();
    },
  );
});
</script>

<template>
  <div ref="map" class="h-screen w-screen"></div>

  <div
    class="absolute top-0 right-0 z-1 m-4 flex flex-col items-center overflow-hidden rounded-2xl bg-slate-200/75 shadow-md backdrop-blur-2xl"
  >
    <MapControlsButton
      class="p-3"
      aria-label="Zoom In"
      @click.prevent="
        olMap.getView().animate({
          zoom: olMap.getView().getZoom() + 1,
          duration: 250,
        })
      "
    >
      <IconPlus class="h-6 w-6" />
    </MapControlsButton>

    <MapControlsButton
      class="p-3"
      aria-label="Zoom Out"
      @click.prevent="
        olMap.getView().animate({
          zoom: olMap.getView().getZoom() - 1,
          duration: 250,
        })
      "
    >
      <IconMinus class="h-6 w-6" />
    </MapControlsButton>
  </div>
</template>
