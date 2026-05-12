(function () {

  // =========================
  // Scale bar
  // =========================

  L.control.scale({
    metric: true,
    imperial: false,
    position: 'bottomleft'
  }).addTo(map);

  // =========================
  // Map info box
  // =========================

  const infoControl = L.control({ position: 'bottomleft' });

  infoControl.onAdd = function () {
    this._div = L.DomUtil.create('div', 'map-tools-info');
    this.update();
    return this._div;
  };

  infoControl.update = function () {

    const zoom = map.getZoom();

    const scaleApprox = getApproxScale();

    this._div.innerHTML = `
      <div><b>Zoom:</b> ${zoom}</div>
      <div><b>Scale:</b> ~1:${scaleApprox.toLocaleString()}</div>
    `;
  };

  infoControl.addTo(map);

  map.on('zoomend moveend', () => {
    infoControl.update();
  });

  // =========================
  // Approximate scale
  // =========================

  function getApproxScale() {

    const center = map.getCenter();

    const zoom = map.getZoom();

    const metersPerPixel =
      156543.03392 *
      Math.cos(center.lat * Math.PI / 180) /
      Math.pow(2, zoom);

    const scale = metersPerPixel * 96 * 39.37;

    return Math.round(scale / 100) * 100;
  }

  // =========================
  // Fixed scale buttons
  // =========================

  const scaleControl = L.control({ position: 'bottomright' });

  scaleControl.onAdd = function () {

    const div = L.DomUtil.create('div', 'map-scale-buttons');

    div.innerHTML = `
      <button data-scale="100000">1:100K</button>
      <button data-scale="50000">1:50K</button>
      <button data-scale="25000">1:25K</button>
      <button data-scale="10000">1:10K</button>
    `;

    L.DomEvent.disableClickPropagation(div);

    div.querySelectorAll('button').forEach(btn => {

      btn.addEventListener('click', () => {

        const targetScale = parseInt(btn.dataset.scale, 10);

        zoomToApproxScale(targetScale);
      });
    });

    return div;
  };

  scaleControl.addTo(map);

  function zoomToApproxScale(targetScale) {

    const center = map.getCenter();

    for (let z = 1; z <= 20; z++) {

      const metersPerPixel =
        156543.03392 *
        Math.cos(center.lat * Math.PI / 180) /
        Math.pow(2, z);

      const scale = metersPerPixel * 96 * 39.37;

      if (scale <= targetScale) {

        map.setZoom(z);

        return;
      }
    }
  }

  // =========================
  // Distance + coordinates tool
  // =========================

  let measureMode = false;

  let measurePoints = [];

  let measureLine = null;

  let measureMarkers = [];

  let measurePopup = null;

  const measureControl = L.control({ position: 'topright' });

  measureControl.onAdd = function () {

    const div = L.DomUtil.create('div', 'map-measure-control');

    div.innerHTML = `
      <button id="measureBtn">📏</button>
    `;

    L.DomEvent.disableClickPropagation(div);

    return div;
  };

  measureControl.addTo(map);

  setTimeout(() => {

    const btn = document.getElementById('measureBtn');

    btn.addEventListener('click', () => {

      measureMode = !measureMode;

      btn.style.background =
        measureMode ? '#d0ebff' : '';

      clearMeasurement();
    });

  }, 100);

  map.on('click', function (e) {

    if (!measureMode) return;

    addMeasurePoint(e.latlng);
  });

  function addMeasurePoint(latlng) {

    if (measurePoints.length >= 2) {
      clearMeasurement();
    }

    const marker = L.circleMarker(latlng, {
      radius: 6
    }).addTo(map);

    measureMarkers.push(marker);

    measurePoints.push(latlng);

    const pointNumber = measurePoints.length;

    const coordPopup = L.popup({
      autoClose: false,
      closeOnClick: false
    })
      .setLatLng(latlng)
      .setContent(`
        <b>נקודה ${pointNumber}</b><br>
        Lat: ${latlng.lat.toFixed(6)}<br>
        Lng: ${latlng.lng.toFixed(6)}
      `)
      .addTo(map);

    if (pointNumber === 1) return;

    measureLine = L.polyline(measurePoints, {
      weight: 3
    }).addTo(map);

    const distanceMeters =
      measurePoints[0].distanceTo(measurePoints[1]);

    const text =
      distanceMeters < 1000
        ? `${Math.round(distanceMeters)} מ׳`
        : `${(distanceMeters / 1000).toFixed(2)} ק״מ`;

    const midLat =
      (measurePoints[0].lat + measurePoints[1].lat) / 2;

    const midLng =
      (measurePoints[0].lng + measurePoints[1].lng) / 2;

    measurePopup = L.popup({
      closeButton: false,
      autoClose: false,
      closeOnClick: false
    })
      .setLatLng([midLat, midLng])
      .setContent(`<b>${text}</b>`)
      .addTo(map);
  }

  function clearMeasurement() {

    measurePoints = [];

    if (measureLine) {
      map.removeLayer(measureLine);
      measureLine = null;
    }

    measureMarkers.forEach(m => {
      map.removeLayer(m);
    });

    measureMarkers = [];

    if (measurePopup) {
      map.removeLayer(measurePopup);
      measurePopup = null;
    }

    map.eachLayer(layer => {
      if (layer instanceof L.Popup) {
        map.removeLayer(layer);
      }
    });
  }

})();