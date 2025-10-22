<script setup>
import Map from "ol/Map.js";
import View from "ol/View.js";
import WebGLTileLayer from "ol/layer/WebGLTile.js";
import OSM from "ol/source/OSM.js";
import GeoJSON from "ol/format/GeoJSON.js";
import VectorSource from "ol/source/Vector";
import WebGLVectorLayer from "ol/layer/WebGLVector";

import GeoJsonWorker from "~/workers/geojson-worker.js?worker";

const props = defineProps({
  pois: {
    type: Object,
    default: () => {},
  },
});

const router = useRouter();
const config = useRuntimeConfig();

const currentPOI = useCurrentPOI();
const drawerState = useDrawerState();

const map = ref();
const olMap = ref();
const selectedMarkerId = ref("");

onMounted(() => {
  let userFeatureClick = false;

  olMap.value = new Map({
    target: map.value,
    layers: [
      new WebGLTileLayer({
        source: new OSM(),
      }),
    ],
    view: new View({
      center: [8.9, 39.9],
      zoom: 8.8,
      projection: "EPSG:4326",
    }),
    controls: [],
  });

  olMap.value.on("movestart", () => {
    if (
      !userFeatureClick &&
      drawerState.value.position !== "DRAWER_ON_BOTTOM_SCREEN"
    ) {
      drawerState.value.setPosition = "SET_DRAWER_ON_BOTTOM_SCREEN";
    }
  });

  olMap.value.on("moveend", () => {
    if (
      userFeatureClick &&
      drawerState.value.position !== "DRAWER_ON_MIDDLE_SCREEN"
    ) {
      drawerState.value.setPosition = "SET_DRAWER_ON_MIDDLE_SCREEN";
      userFeatureClick = false;
    }
  });

  olMap.value.on("click", function (evt) {
    if (
      olMap.value.getView().getInteracting() ||
      olMap.value.getView().getAnimating()
    ) {
      return;
    }
    olMap.value.forEachFeatureAtPixel(evt.pixel, function (feature) {
      userFeatureClick = true;
      currentPOI.value = feature;
      router.push("/poi");
    });
  });

  // NOTE: props.pois must be stringified before sending to the worker
  const geojsonString = JSON.stringify(props.pois);

  // Instantiate the formatter on the main thread
  const geojsonFormat = new GeoJSON();

  const vectorSource = new VectorSource({
    loader: function (extent, resolution, projection, success, failure) {
      const worker = new GeoJsonWorker();

      // Send the large GeoJSON STRING to the worker
      worker.postMessage({ geojson: geojsonString });

      worker.onmessage = function (e) {
        if (e.data.type === "success") {
          // The worker sent back a simple GeoJSON object
          const transferableGeoJSON = e.data.geojson;

          // ⚠️ FIX: Read the transferable GeoJSON object back into OL features
          const features = geojsonFormat.readFeatures(transferableGeoJSON);

          vectorSource.addFeatures(features);
          success(features);
        } else if (e.data.type === "error") {
          console.error("Worker GeoJSON parsing error:", e.data.error);
          failure();
        }
        worker.terminate();
      };

      worker.onerror = function (error) {
        console.error("Web Worker error:", error);
        failure();
        worker.terminate();
      };
    },
    strategy: VectorSource.all,
  });

  const pointsLayer = new WebGLVectorLayer({
    source: vectorSource,
    style: {
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
      "icon-scale": 0.35,
      "icon-opacity": 1,
      "icon-rotate-with-view": false,
    },
  });

  olMap.value.addLayer(pointsLayer);

  onBeforeRouteUpdate(() => {
    selectedMarkerId.value = "";
  });

  watch(currentPOI, () => {
    selectedMarkerId.value = currentPOI.value.values_.content_id;

    pointsLayer.updateStyleVariables({
      selectedMarkerId: selectedMarkerId.value,
    });

    olMap.value.getView().animate({
      center: [
        currentPOI.value.values_.geometry.flatCoordinates[0],
        currentPOI.value.values_.geometry.flatCoordinates[1],
      ],
      zoom:
        olMap.value.getView().getZoom() > 12
          ? olMap.value.getView().getZoom()
          : 12,
      duration: 350,
    });
  });
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
