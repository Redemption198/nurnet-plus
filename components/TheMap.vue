<script setup>
import Map from "ol/Map.js";
import View from "ol/View.js";
import WebGLTileLayer from "ol/layer/WebGLTile.js";
import OSM from "ol/source/OSM.js";
import { Vector } from "ol/source.js";
import WebGLPointsLayer from "ol/layer/WebGLPoints.js";
import GeoJSON from "ol/format/GeoJSON.js";

const props = defineProps({
  pois: {
    type: Object,
  },
});

const router = useRouter();

const currentPOI = useCurrentPOI();
const drawerState = useDrawerState();
const { coords, error: locationError, isSupported } = useGeolocation();

const map = ref();
const olMap = ref();

function centerMapToUserLocation() {
  olMap.value.getView().animate({
    center: [coords.value.latitude, coords.value.longitude],
    zoom: 8,
    duration: 250,
  });
}

onMounted(() => {
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
        symbolType: "circle",
        color: [
          "match",
          ["get", "category"],
          // Menhir
          "70",
          [254, 133, 53],
          "71",
          [254, 133, 53],
          "72",
          [254, 133, 53],
          "73",
          [254, 133, 53],
          // Domus de janas
          "30",
          [188, 123, 119],
          // Tombe dei giganti
          "60",
          [169, 111, 71],
          "61",
          [169, 111, 71],
          "62",
          [169, 111, 71],
          "63",
          [169, 111, 71],
          // Dolmen
          "20",
          [168, 158, 70],
          "21",
          [168, 158, 70],
          // Villaggi
          "40",
          [251, 206, 2],
          "41",
          [251, 206, 2],
          // Culto dell'acqua
          "50",
          [77, 143, 195],
          "51",
          [77, 143, 195],
          "52",
          [77, 143, 195],
          // Altro - Unicum e Grotte Tafoni
          "101",
          [170, 171, 168],
          "110",
          [170, 171, 168],
          // Nuraghe
          "10",
          [49, 37, 40],
          "11",
          [49, 37, 40],
          "12",
          [49, 37, 40],
          "13",
          [49, 37, 40],
          // Default
          [255, 0, 0],
        ],
        // size: 10,
        size: [
          "case",
          ["==", ["var", "selectedMarker"], ["get", "content_id"]],
          ["*", ["zoom"], 3],
          ["*", ["zoom"], 1.8],
        ],
        opacity: 0.85,
        rotateWithView: false,
      },
    },
  });

  // olMap.value.on("moveend", () => console.log("map move ended"));

  let userFeatureClick = false;

  olMap.value = new Map({
    target: map.value,
    layers: [
      new WebGLTileLayer({
        source: new OSM(),
      }),
      pointsLayer,
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

  watch(currentPOI, () => {
    pointsLayer.styleVariables_.selectedMarker =
      currentPOI.value.values_.content_id;

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
      @click="
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
      @click="
        olMap.getView().animate({
          zoom: olMap.getView().getZoom() - 1,
          duration: 250,
        })
      "
    >
      <IconMinus class="h-6 w-6" />
    </MapControlsButton>

    <MapControlsButton
      v-if="!locationError && isSupported"
      class="p-4"
      @click="centerMapToUserLocation()"
    >
      <IconDirection class="h-4 w-4" />
    </MapControlsButton>

    <MapControlsButton v-else class="p-4" disabled>
      <IconDirection class="h-4 w-4" />
    </MapControlsButton>
  </div>
</template>
