import GeoJSON from "ol/format/GeoJSON.js";

const geojsonFormat = new GeoJSON();

self.onmessage = function (event) {
  const geojsonText = event.data.geojson;
  
  try {
    const olFeatures = geojsonFormat.readFeatures(geojsonText);
    
    const transferableGeoJSON = geojsonFormat.writeFeaturesObject(olFeatures);
    
    self.postMessage({ geojson: transferableGeoJSON, type: 'success' });
    
  } catch (error) {
    self.postMessage({ error: error.message, type: 'error' });
  }
};