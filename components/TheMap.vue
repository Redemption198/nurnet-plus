<script setup>
import Map from "ol/Map.js";
import View from "ol/View.js";
import WebGLTileLayer from "ol/layer/WebGLTile.js";
import OSM from "ol/source/OSM.js";
import WebGLPointsLayer from "ol/layer/WebGLPoints.js";
import { Vector } from "ol/source.js";
import GeoJSON from "ol/format/GeoJSON.js";
import { onBeforeRouteUpdate } from "vue-router";

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
    const text = olMap.value.forEachFeatureAtPixel(
      evt.pixel,
      function (feature) {
        userFeatureClick = true;

        currentPOI.value = feature;

        router.push("/poi");
      }
    );
  });

  const vectorSource = new Vector({
    features: new GeoJSON().readFeatures(props.pois),
  });

  const pointsLayer = new WebGLPointsLayer({
    source: vectorSource,
    style: {
      variables: {
        selectedMarker: "",
      },
      symbol: {
        symbolType: "image",
        src: config.app.baseURL || "" + "/icons-tileset.png",
        textureCoord: [
          "match",
          ["get", "category_id"],
          // Menhir
          "70",
          [0.375, 0, 0.5, 1],
          "71",
          [0.375, 0, 0.5, 1],
          "72",
          [0.375, 0, 0.5, 1],
          "73",
          [0.375, 0, 0.5, 1],
          // Domus de janas
          "30",
          [0.125, 0, 0.25, 1],
          // Tombe dei giganti
          "60",
          [0.25, 0, 0.375, 1],
          "61",
          [0.25, 0, 0.375, 1],
          "62",
          [0.25, 0, 0.375, 1],
          "63",
          [0.25, 0, 0.375, 1],
          // Dolmen
          "20",
          [0, 0, 0.125, 1],
          "21",
          [0, 0, 0.125, 1],
          // Villaggi
          "40",
          [0.5, 0, 0.625, 1],
          "41",
          [0.5, 0, 0.625, 1],
          // Culto dell'acqua
          "50",
          [0.625, 0, 0.75, 1],
          "51",
          [0.625, 0, 0.75, 1],
          "52",
          [0.625, 0, 0.75, 1],
          // Altro - Unicum e Grotte Tafoni
          // "101",
          // [170, 171, 168],
          // "110",
          // [170, 171, 168],
          // Nuraghe
          "10",
          [0.75, 0, 0.875, 1],
          "11",
          [0.75, 0, 0.875, 1],
          "12",
          [0.75, 0, 0.875, 1],
          "13",
          [0.75, 0, 0.875, 1],
          // Default
          [0.875, 0, 1, 1],
        ],
        size: [
          "case",
          ["==", ["var", "selectedMarker"], ["get", "content_id"]],
          ["*", ["zoom"], 3],
          ["*", ["zoom"], 1.8],
        ],
        opacity: 1,
        rotateWithView: false,
      },
    },
  });

  olMap.value.addLayer(pointsLayer);

  onBeforeRouteUpdate(() => {
    pointsLayer.styleVariables_.selectedMarker = "";
    pointsLayer.dispatchEvent("change");
  });

  watch(currentPOI, () => {
    pointsLayer.styleVariables_.selectedMarker =
      currentPOI.value.values_.content_id;
    pointsLayer.dispatchEvent("change");

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
    class="absolute top-0 right-0 z-[1] m-4 flex flex-col items-center overflow-hidden rounded-2xl bg-slate-200/75 shadow-md backdrop-blur-2xl"
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
