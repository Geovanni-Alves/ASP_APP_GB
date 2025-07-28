import React, { useEffect, useRef, useState } from "react";
import { Modal } from "antd";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export default function RouteMapModal({ open, onClose, coordinates, token }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [etas, setETAs] = useState([]);

  useEffect(() => {
    if (!open || !mapContainer.current || !coordinates?.length) return;

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [coordinates[0].lng, coordinates[0].lat],
      zoom: 12,
    });

    mapRef.current = map;

    // Add markers
    coordinates.forEach((coord, idx) => {
      const el = document.createElement("div");
      el.className = "custom-marker-wrapper";
      el.innerHTML = `
        <div class="custom-marker-number" style="background-color:${
          idx === 0 ? "green" : idx === coordinates.length - 1 ? "red" : "blue"
        }">${idx + 1}</div>
        <div class="custom-marker-label">${
          coord.name || `Stop ${idx + 1}`
        }</div>
      `;

      const title = coord.name || `Stop ${idx + 1}`;
      const eta = etas?.[idx - 1] ? ` – ETA: ${etas[idx - 1]} min` : "";

      const popup = new mapboxgl.Popup({ offset: 25 }).setText(
        `${title}${eta}`
      );

      new mapboxgl.Marker(el)
        .setLngLat([coord.lng, coord.lat])
        .setPopup(popup)
        .addTo(map);
    });

    // Fetch and draw route
    if (coordinates.length >= 2) {
      const coordString = coordinates.map((c) => `${c.lng},${c.lat}`).join(";");
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordString}?geometries=geojson&overview=full&steps=false&access_token=${token}`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (data.routes?.[0]) {
            const route = data.routes[0];

            const geojson = {
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            };

            // Add route layer
            map.on("load", () => {
              if (map.getSource("route")) {
                map.removeLayer("route");
                map.removeSource("route");
              }

              map.addSource("route", {
                type: "geojson",
                data: geojson,
              });

              map.addLayer({
                id: "route",
                type: "line",
                source: "route",
                layout: {
                  "line-join": "round",
                  "line-cap": "round",
                },
                paint: {
                  "line-color": "#0074D9",
                  "line-width": 5,
                },
              });
            });

            // Save ETAs
            const legs = route.legs || [];
            const etas = legs.map((leg) => Math.round(leg.duration / 60));
            setETAs(etas);
          }
        });
    }

    return () => {
      if (map) map.remove();
    };
  }, [open, coordinates, token]);

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={900}>
      <div style={{ height: "500px" }} ref={mapContainer} />
    </Modal>
  );
}
